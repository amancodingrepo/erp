import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { allowedMediaUrl } from "@/lib/services/campus-files";

export const STAFF_DOCUMENTS_KEY = "hr.staffDocuments";

export type StaffDocument = {
  id: string;
  staffId: string;
  name: string;
  url: string;
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

export function parseStaffDocuments(value: unknown): StaffDocument[] {
  if (!Array.isArray(value)) return [];
  const out: StaffDocument[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const staffId = trim(rec.staffId);
    const name = trim(rec.name);
    const url = allowedMediaUrl(rec.url);
    if (!id || !staffId || !name || !url || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, staffId, name, url });
  }
  return out;
}

export function parseStaffDocument(input: unknown): StaffDocument {
  if (!input || typeof input !== "object") {
    throw validationError({ document: "required" });
  }
  const rec = input as Record<string, unknown>;
  const staffId = trim(rec.staffId);
  const name = trim(rec.name);
  const url = allowedMediaUrl(rec.url);
  if (!staffId) throw validationError({ staffId: "required" });
  if (!name) throw validationError({ name: "required" });
  if (!url) throw validationError({ url: "https or hosted file required" });
  return {
    id: trim(rec.id) || crypto.randomUUID(),
    staffId,
    name,
    url,
  };
}

export function upsertStaffDocument(rows: StaffDocument[], doc: StaffDocument) {
  return [...rows.filter((row) => row.id !== doc.id), doc];
}

export function removeStaffDocument(
  rows: StaffDocument[],
  docId: string,
  staffId: string,
) {
  const id = trim(docId);
  const sid = trim(staffId);
  return rows.filter((row) => !(row.id === id && row.staffId === sid));
}

export function attachStaffDocuments<T extends { id: string }>(
  staff: T[],
  rows: StaffDocument[],
) {
  const byId = new Map<string, StaffDocument[]>();
  for (const row of rows) {
    const list = byId.get(row.staffId) ?? [];
    list.push(row);
    byId.set(row.staffId, list);
  }
  return staff.map((row) => ({
    ...row,
    documents: byId.get(row.id) ?? [],
  }));
}

export async function listStaffDocuments(campusId: string) {
  return parseStaffDocuments(await readSetting(campusId, STAFF_DOCUMENTS_KEY));
}

export async function listStaffDocumentsFor(
  campusId: string,
  staffId: string,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
    select: { id: true },
  });
  if (!staff) throw notFound("staff");
  const documents = (await listStaffDocuments(campusId)).filter(
    (row) => row.staffId === staff.id,
  );
  return { staffId: staff.id, documents };
}

export async function saveStaffDocument(
  campusId: string,
  staffId: string,
  input: unknown,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
    select: { id: true },
  });
  if (!staff) throw notFound("staff");
  const rec = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const doc = parseStaffDocument({ ...rec, staffId: staff.id });
  const next = upsertStaffDocument(await listStaffDocuments(campusId), doc);
  await writeSetting(campusId, STAFF_DOCUMENTS_KEY, next);
  return doc;
}

export async function deleteStaffDocument(
  campusId: string,
  staffId: string,
  docId: string,
) {
  const current = await listStaffDocumentsFor(campusId, staffId);
  const rows = await listStaffDocuments(campusId);
  const filtered = removeStaffDocument(rows, docId, current.staffId);
  if (filtered.length === rows.length) throw notFound("document");
  await writeSetting(campusId, STAFF_DOCUMENTS_KEY, filtered);
  return { ok: true, id: trim(docId) };
}
