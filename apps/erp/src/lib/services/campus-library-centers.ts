import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const LIBRARY_CENTERS_KEY = "library.centers";
export const LIBRARY_BOOK_CENTERS_KEY = "library.bookCenters";

export type LibraryCenter = {
  id: string;
  name: string;
  createdAt: string;
  deletedAt: string | null;
  status: "active" | "deleted";
};

export type BookCenterAssign = { bookId: string; centerId: string };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function statusOf(deletedAt: string | null): "active" | "deleted" {
  return deletedAt ? "deleted" : "active";
}

async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(
  campusId: string,
  key: string,
  value: Prisma.InputJsonValue,
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export function parseLibraryCenters(value: unknown): LibraryCenter[] {
  if (!Array.isArray(value)) return [];
  const out: LibraryCenter[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id) || crypto.randomUUID();
    const name = trim(rec.name);
    if (!name || seen.has(id)) continue;
    seen.add(id);
    const deletedAt = trim(rec.deletedAt) || null;
    out.push({
      id,
      name,
      createdAt: trim(rec.createdAt) || new Date(0).toISOString(),
      deletedAt,
      status: statusOf(deletedAt),
    });
  }
  return out;
}

export function upsertLibraryCenter(
  rows: LibraryCenter[],
  input: { id?: string; name: string },
) {
  const name = trim(input.name);
  if (!name) throw validationError({ name: "required" });
  const id = trim(input.id);
  const existing = id ? rows.find((row) => row.id === id) : undefined;
  const clash = rows.find(
    (row) =>
      row.status === "active" &&
      row.name.toLowerCase() === name.toLowerCase() &&
      row.id !== existing?.id,
  );
  if (clash) throw validationError({ name: "already exists" });
  const next: LibraryCenter = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    deletedAt: existing?.deletedAt ?? null,
    status: statusOf(existing?.deletedAt ?? null),
  };
  if (existing) {
    return rows.map((row) => (row.id === existing.id ? next : row));
  }
  return [...rows, next];
}

export function setLibraryCenterDeleted(
  rows: LibraryCenter[],
  id: string,
  deleted: boolean,
) {
  const centerId = trim(id);
  const existing = rows.find((row) => row.id === centerId);
  if (!existing) throw validationError({ id: "unknown center" });
  const deletedAt = deleted ? existing.deletedAt || new Date().toISOString() : null;
  if (!deleted) {
    const clash = rows.find(
      (row) =>
        row.status === "active" &&
        row.id !== existing.id &&
        row.name.toLowerCase() === existing.name.toLowerCase(),
    );
    if (clash) throw validationError({ name: "already exists" });
  }
  const next: LibraryCenter = {
    ...existing,
    deletedAt,
    status: statusOf(deletedAt),
  };
  return rows.map((row) => (row.id === existing.id ? next : row));
}

export function parseBookCenterAssigns(value: unknown): BookCenterAssign[] {
  if (!Array.isArray(value)) return [];
  const out: BookCenterAssign[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const bookId = trim(rec.bookId);
    const centerId = trim(rec.centerId);
    if (!bookId || !centerId || seen.has(bookId)) continue;
    seen.add(bookId);
    out.push({ bookId, centerId });
  }
  return out;
}

export function assignBookCenter(
  rows: BookCenterAssign[],
  input: { bookId: string; centerId: string },
  centers: LibraryCenter[],
) {
  const bookId = trim(input.bookId);
  const centerId = trim(input.centerId);
  if (!bookId) throw validationError({ bookId: "required" });
  const center = centers.find((row) => row.id === centerId);
  if (!center || center.status !== "active") {
    throw validationError({ centerId: "unknown or deleted center" });
  }
  return [...rows.filter((row) => row.bookId !== bookId), { bookId, centerId }];
}

export function dropBookCenterAssignsByBook(
  rows: BookCenterAssign[],
  bookId: string,
) {
  const id = trim(bookId);
  if (!id) return rows;
  return rows.filter((row) => row.bookId !== id);
}

export function attachBookCenters<T extends { id: string }>(
  books: T[],
  assigns: BookCenterAssign[],
  centers: LibraryCenter[],
) {
  const byBook = new Map(assigns.map((row) => [row.bookId, row.centerId]));
  const names = new Map(centers.map((row) => [row.id, row.name]));
  return books.map((book) => {
    const centerId = byBook.get(book.id);
    return {
      ...book,
      centerId: centerId ?? null,
      center: centerId ? (names.get(centerId) ?? centerId) : null,
    };
  });
}

export async function listLibraryCenters(campusId: string) {
  return parseLibraryCenters(await readSetting(campusId, LIBRARY_CENTERS_KEY));
}

export async function getLibraryCenter(campusId: string, id: string) {
  const row = (await listLibraryCenters(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("library center");
  return row;
}

export async function patchLibraryCenter(campusId: string, id: string, name: string) {
  await getLibraryCenter(campusId, id);
  return saveLibraryCenter(campusId, { id: trim(id), name });
}

export async function removeLibraryCenter(campusId: string, id: string) {
  await getLibraryCenter(campusId, id);
  return deleteLibraryCenter(campusId, id, true);
}

export async function saveLibraryCenter(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertLibraryCenter(await listLibraryCenters(campusId), input);
  await writeSetting(campusId, LIBRARY_CENTERS_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase() && row.status === "active") ??
    next[next.length - 1]!
  );
}

export async function deleteLibraryCenter(
  campusId: string,
  id: string,
  deleted = true,
) {
  const next = setLibraryCenterDeleted(await listLibraryCenters(campusId), id, deleted);
  await writeSetting(campusId, LIBRARY_CENTERS_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function listBookCenterAssigns(campusId: string) {
  return parseBookCenterAssigns(await readSetting(campusId, LIBRARY_BOOK_CENTERS_KEY));
}

export async function saveBookCenterAssign(
  campusId: string,
  input: { bookId: string; centerId: string },
) {
  const book = await prisma.book.findFirst({
    where: { id: trim(input.bookId), campusId },
    select: { id: true },
  });
  if (!book) throw notFound("book");
  const centers = await listLibraryCenters(campusId);
  const next = assignBookCenter(
    await listBookCenterAssigns(campusId),
    { bookId: book.id, centerId: input.centerId },
    centers,
  );
  await writeSetting(campusId, LIBRARY_BOOK_CENTERS_KEY, next);
  const saved = next.find((row) => row.bookId === book.id)!;
  return attachBookCenters([{ id: book.id }], [saved], centers)[0]!;
}

export async function dropBookCenterAssigns(campusId: string, bookId: string) {
  const next = dropBookCenterAssignsByBook(
    await listBookCenterAssigns(campusId),
    bookId,
  );
  await writeSetting(campusId, LIBRARY_BOOK_CENTERS_KEY, next);
  return next;
}
