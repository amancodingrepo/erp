import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";
import { libraryFine } from "@/lib/library-fine";
import {
  attachAccessions,
  dropBookAccessions,
  listBookAccessions,
  writeBookAccession,
} from "@/lib/services/campus-later";
import {
  attachBookCenters,
  dropBookCenterAssigns,
  listBookCenterAssigns,
  listLibraryCenters,
} from "@/lib/services/campus-library-centers";

export const WEEDOUT_KEY = "library.weedout";
export const LOST_KEY = "library.lost";

export type WeedoutRow = {
  id: string;
  bookId: string;
  qty: number;
  reason: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
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

export function parseWeedoutRows(value: unknown): WeedoutRow[] {
  if (!Array.isArray(value)) return [];
  const out: WeedoutRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const bookId = trim(rec.bookId);
    const qty = Number(rec.qty);
    if (!id || !bookId || !Number.isInteger(qty) || qty < 1 || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, bookId, qty, reason: trim(rec.reason) });
  }
  return out;
}

export function parseWeedout(input: unknown): WeedoutRow {
  if (!input || typeof input !== "object") {
    throw validationError({ weedout: "required" });
  }
  const rec = input as Record<string, unknown>;
  const bookId = trim(rec.bookId);
  const qty = Number(rec.qty);
  if (!bookId) throw validationError({ bookId: "required" });
  if (!Number.isInteger(qty) || qty < 1) throw validationError({ qty: "must be at least 1" });
  return {
    id: trim(rec.id) || crypto.randomUUID(),
    bookId,
    qty,
    reason: trim(rec.reason),
  };
}

export function weededQtyFor(rows: WeedoutRow[], bookId: string) {
  const id = trim(bookId);
  return rows.reduce((sum, row) => (row.bookId === id ? sum + row.qty : sum), 0);
}

export function dropWeedoutByBook(rows: WeedoutRow[], bookId: string) {
  const id = trim(bookId);
  if (!id) return rows;
  return rows.filter((row) => row.bookId !== id);
}

export function getWeedoutRow(rows: WeedoutRow[], id: string, label = "weedout") {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const row = rows.find((entry) => entry.id === key);
  if (!row) throw notFound(label);
  return row;
}

export function dropWeedoutRow(rows: WeedoutRow[], id: string, label = "weedout") {
  const existing = getWeedoutRow(rows, id, label);
  return rows.filter((row) => row.id !== existing.id);
}

export function patchWeedoutRow(
  rows: WeedoutRow[],
  id: string,
  patch: { qty?: number; reason?: string },
  label = "weedout",
) {
  const existing = getWeedoutRow(rows, id, label);
  const qty = patch.qty !== undefined ? Number(patch.qty) : existing.qty;
  if (!Number.isInteger(qty) || qty < 1) {
    throw validationError({ qty: "must be at least 1" });
  }
  const next: WeedoutRow = {
    ...existing,
    qty,
    reason: patch.reason !== undefined ? trim(patch.reason) : existing.reason,
  };
  return rows.map((row) => (row.id === existing.id ? next : row));
}

export function availableAfterWeedout(qty: number, open: number, weeded: number) {
  return Math.max(0, qty - open - weeded);
}

export function attachWeedout<T extends { id: string; qty: number }>(
  books: T[],
  rows: WeedoutRow[],
  open: Array<{ bookId: string; open: number }>,
) {
  const openBy = new Map(open.map((row) => [row.bookId, row.open]));
  return books.map((book) => {
    const weededQty = weededQtyFor(rows, book.id);
    const issued = openBy.get(book.id) ?? 0;
    return {
      ...book,
      weededQty,
      available: availableAfterWeedout(book.qty, issued, weededQty),
    };
  });
}

export async function listWeedout(campusId: string) {
  return parseWeedoutRows(await readSetting(campusId, WEEDOUT_KEY));
}

export function overdueIssues<T extends { dueOn: Date | string }>(
  rows: T[],
  now = new Date(),
) {
  const t = now.getTime();
  return rows.filter((row) => new Date(row.dueOn).getTime() < t);
}

export function attachLostCopies<
  T extends { id: string; available: number },
>(books: T[], rows: WeedoutRow[]) {
  return books.map((book) => {
    const lostQty = weededQtyFor(rows, book.id);
    return {
      ...book,
      lostQty,
      available: Math.max(0, book.available - lostQty),
    };
  });
}

export function libraryFineDesk(
  charged: Array<{
    id: string;
    fine: unknown;
    dueOn: Date | string;
    book: { title: string };
    member: { memberNo: string };
  }>,
  overdue: Array<{
    id: string;
    dueOn: Date | string;
    book: { title: string };
    member: { memberNo: string };
  }>,
  perDay: number,
  now = new Date(),
) {
  return [
    ...charged
      .filter((row) => Number(row.fine) > 0)
      .map((row) => ({
        id: row.id,
        title: row.book.title,
        memberNo: row.member.memberNo,
        dueOn: row.dueOn,
        fine: String(row.fine),
        status: "charged" as const,
      })),
    ...overdue.map((row) => ({
      id: row.id,
      title: row.book.title,
      memberNo: row.member.memberNo,
      dueOn: row.dueOn,
      fine: String(libraryFine(new Date(row.dueOn), now, perDay)),
      status: "overdue" as const,
    })),
  ];
}

export async function listLost(campusId: string) {
  return parseWeedoutRows(await readSetting(campusId, LOST_KEY));
}

export async function saveLost(
  campusId: string,
  input: { bookId: string; qty: number; reason?: string },
) {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, campusId },
    select: { id: true },
  });
  if (!book) throw notFound("book");
  const row: WeedoutRow = {
    id: crypto.randomUUID(),
    bookId: book.id,
    qty: input.qty,
    reason: trim(input.reason),
  };
  const next = [...(await listLost(campusId)), row];
  await writeSetting(campusId, LOST_KEY, next);
  return row;
}

export async function listChargedFines(campusId: string) {
  return prisma.bookIssue.findMany({
    where: { member: { campusId }, fine: { gt: 0 } },
    include: {
      book: { select: { title: true } },
      member: { select: { memberNo: true } },
    },
    orderBy: { dueOn: "desc" },
    take: 200,
  });
}

export async function libraryFinePerDay(campusId: string) {
  return settingNumber(campusId, "library.finePerDay", 5);
}

export async function saveWeedout(campusId: string, input: unknown) {
  const row = parseWeedout(input);
  const book = await prisma.book.findFirst({
    where: { id: row.bookId, campusId },
    select: { id: true },
  });
  if (!book) throw notFound("book");
  const next = [...(await listWeedout(campusId)), { ...row, bookId: book.id }];
  await writeSetting(campusId, WEEDOUT_KEY, next);
  return next[next.length - 1]!;
}

export async function getWeedout(campusId: string, id: string) {
  return getWeedoutRow(await listWeedout(campusId), id, "weedout");
}

export async function patchWeedout(
  campusId: string,
  id: string,
  patch: { qty?: number; reason?: string },
) {
  const next = patchWeedoutRow(await listWeedout(campusId), id, patch, "weedout");
  await writeSetting(campusId, WEEDOUT_KEY, next);
  return getWeedoutRow(next, id, "weedout");
}

export async function removeWeedout(campusId: string, id: string) {
  const existing = await getWeedout(campusId, id);
  const next = dropWeedoutRow(await listWeedout(campusId), existing.id, "weedout");
  await writeSetting(campusId, WEEDOUT_KEY, next);
  return { id: existing.id, deleted: true };
}

export async function getLost(campusId: string, id: string) {
  return getWeedoutRow(await listLost(campusId), id, "lost copy");
}

export async function patchLost(
  campusId: string,
  id: string,
  patch: { qty?: number; reason?: string },
) {
  const next = patchWeedoutRow(await listLost(campusId), id, patch, "lost copy");
  await writeSetting(campusId, LOST_KEY, next);
  return getWeedoutRow(next, id, "lost copy");
}

export async function removeLost(campusId: string, id: string) {
  const existing = await getLost(campusId, id);
  const next = dropWeedoutRow(await listLost(campusId), existing.id, "lost copy");
  await writeSetting(campusId, LOST_KEY, next);
  return { id: existing.id, deleted: true };
}

async function settingNumber(campusId: string, key: string, fallback: number) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function chargeLibraryFine(
  campusId: string,
  studentId: string | null,
  amount: Prisma.Decimal,
  description: string,
) {
  if (!studentId || amount.lte(0)) return null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus?.currentSessionId) return null;
  let feeType = await prisma.feeType.findFirst({
    where: { campusId, name: "Library" },
  });
  if (!feeType) {
    feeType = await prisma.feeType.create({ data: { campusId, name: "Library" } });
  }
  const invoice = await prisma.feeInvoice.create({
    data: {
      studentId,
      sessionId: campus.currentSessionId,
      status: InvoiceStatus.DUE,
      total: amount,
      lines: {
        create: {
          feeTypeId: feeType.id,
          description,
          amount,
        },
      },
    },
  });
  return invoice.id;
}

export async function createBook(
  campusId: string,
  input: {
    title: string;
    isbn?: string;
    author?: string;
    publisher?: string;
    qty: number;
    rack?: string;
    price?: number | string;
  },
) {
  if (input.qty < 1) throw validationError({ qty: "must be at least 1" });
  const book = await prisma.book.create({
    data: {
      campusId,
      title: input.title.trim(),
      isbn: input.isbn,
      author: input.author,
      publisher: input.publisher,
      qty: input.qty,
      rack: input.rack,
      price: dec(input.price),
    },
  });
  const accessions = await writeBookAccession(campusId, book.id);
  const accessionNo =
    accessions.find((row) => row.bookId === book.id)?.accessionNo ?? null;
  return { ...book, accessionNo };
}

export async function listBooks(campusId: string) {
  const books = await prisma.book.findMany({
    where: { campusId },
    include: { issues: { where: { returnedAt: null } } },
    orderBy: { title: "asc" },
  });
  const mapped = books.map((b) => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    author: b.author,
    qty: b.qty,
    available: Math.max(0, b.qty - b.issues.length),
    rack: b.rack,
    price: b.price.toString(),
  }));
  const [accessions, assigns, centers, weedout, lost] = await Promise.all([
    listBookAccessions(campusId),
    listBookCenterAssigns(campusId),
    listLibraryCenters(campusId),
    listWeedout(campusId),
    listLost(campusId),
  ]);
  return attachLostCopies(
    attachWeedout(
      attachBookCenters(attachAccessions(mapped, accessions), assigns, centers),
      weedout,
      books.map((b) => ({ bookId: b.id, open: b.issues.length })),
    ),
    lost,
  );
}

export async function getBook(campusId: string, id: string) {
  const bookId = trim(id);
  const row = (await listBooks(campusId)).find((book) => book.id === bookId);
  if (!row) throw notFound("book");
  return row;
}

export async function patchBook(
  campusId: string,
  id: string,
  patch: {
    title?: string;
    isbn?: string;
    author?: string;
    publisher?: string;
    qty?: number;
    rack?: string;
    price?: number | string;
  },
) {
  const book = await prisma.book.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!book) throw notFound("book");
  const title = trim(patch.title ?? book.title);
  if (!title) throw validationError({ title: "required" });
  let qty = book.qty;
  if (patch.qty !== undefined) {
    if (!Number.isInteger(patch.qty) || patch.qty < 1) {
      throw validationError({ qty: "must be at least 1" });
    }
    const open = await prisma.bookIssue.count({
      where: { bookId: book.id, returnedAt: null },
    });
    if (patch.qty < open) throw conflict("qty below open issues");
    qty = patch.qty;
  }
  await prisma.book.update({
    where: { id: book.id },
    data: {
      title,
      isbn: patch.isbn !== undefined ? trim(patch.isbn) || null : book.isbn,
      author: patch.author !== undefined ? trim(patch.author) || null : book.author,
      publisher:
        patch.publisher !== undefined ? trim(patch.publisher) || null : book.publisher,
      qty,
      rack: patch.rack !== undefined ? trim(patch.rack) || null : book.rack,
      price: patch.price !== undefined ? dec(patch.price) : book.price,
    },
  });
  return getBook(campusId, book.id);
}

export async function removeBook(campusId: string, id: string) {
  const book = await prisma.book.findFirst({
    where: { id: trim(id), campusId },
    select: { id: true, _count: { select: { issues: true } } },
  });
  if (!book) throw notFound("book");
  if (book._count.issues > 0) throw conflict("book has issues");
  const [weedout, lost] = await Promise.all([
    listWeedout(campusId),
    listLost(campusId),
  ]);
  await Promise.all([
    dropBookAccessions(campusId, book.id),
    dropBookCenterAssigns(campusId, book.id),
    writeSetting(campusId, WEEDOUT_KEY, dropWeedoutByBook(weedout, book.id)),
    writeSetting(campusId, LOST_KEY, dropWeedoutByBook(lost, book.id)),
  ]);
  await prisma.book.delete({ where: { id: book.id } });
  return { id: book.id, deleted: true };
}

async function nextMemberNo(campusId: string) {
  const count = await prisma.libraryMember.count({ where: { campusId } });
  return `LIB-${String(count + 1).padStart(4, "0")}`;
}

export async function addMember(
  campusId: string,
  input: { studentId?: string; staffId?: string },
) {
  if (!input.studentId && !input.staffId) {
    throw validationError({ studentId: "student or staff required" });
  }
  if (input.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, campusId },
    });
    if (!student) throw notFound("student");
    const existing = await prisma.libraryMember.findUnique({
      where: { studentId: student.id },
    });
    if (existing) throw conflict("already a member");
  }
  if (input.staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: input.staffId, campusId },
    });
    if (!staff) throw notFound("staff");
    const existing = await prisma.libraryMember.findUnique({
      where: { staffId: staff.id },
    });
    if (existing) throw conflict("already a member");
  }
  return prisma.libraryMember.create({
    data: {
      campusId,
      memberNo: await nextMemberNo(campusId),
      studentId: input.studentId,
      staffId: input.staffId,
    },
  });
}

export async function issueBook(
  campusId: string,
  input: { bookId: string; memberId: string },
) {
  const book = await prisma.book.findFirst({
    where: { id: input.bookId, campusId },
    include: { issues: { where: { returnedAt: null } } },
  });
  if (!book) throw notFound("book");
  const weeded = weededQtyFor(await listWeedout(campusId), book.id);
  if (availableAfterWeedout(book.qty, book.issues.length, weeded) < 1) {
    throw validationError({ bookId: "no copies available" });
  }
  const member = await prisma.libraryMember.findFirst({
    where: { id: input.memberId, campusId },
  });
  if (!member) throw notFound("member");
  const days = await settingNumber(campusId, "library.loanDays", 14);
  const dueOn = new Date();
  dueOn.setUTCDate(dueOn.getUTCDate() + days);
  return prisma.bookIssue.create({
    data: {
      bookId: book.id,
      memberId: member.id,
      dueOn,
    },
  });
}

export async function returnBook(campusId: string, issueId: string) {
  const issue = await prisma.bookIssue.findFirst({
    where: { id: issueId, member: { campusId } },
    include: { member: true, book: true },
  });
  if (!issue) throw notFound("issue");
  if (issue.returnedAt) throw validationError({ returnedAt: "already returned" });
  const perDay = await settingNumber(campusId, "library.finePerDay", 5);
  const returnedAt = new Date();
  const fine = new Prisma.Decimal(libraryFine(issue.dueOn, returnedAt, perDay));
  const updated = await prisma.bookIssue.update({
    where: { id: issue.id },
    data: { returnedAt, fine },
  });
  const invoiceId = await chargeLibraryFine(
    campusId,
    issue.member.studentId,
    fine,
    `Library fine ${issue.book.title}`,
  );
  return { issue: updated, fine: fine.toString(), invoiceId };
}

export async function listOpenIssues(campusId: string) {
  return prisma.bookIssue.findMany({
    where: { returnedAt: null, member: { campusId } },
    include: {
      book: true,
      member: { include: { student: true, staff: true } },
    },
    orderBy: { dueOn: "asc" },
  });
}
