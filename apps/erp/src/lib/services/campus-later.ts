import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";

export const CORPORATES_KEY = "students.corporates";
export const SPONSORS_KEY = "students.sponsors";
export const ACCESSIONS_KEY = "library.accessions";

export type Corporate = { id: string; name: string };
export type Sponsor = { studentId: string; corporateId: string; amount: number };
export type Accession = { id: string; bookId: string; accessionNo: string };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

export function parseCorporates(value: unknown): Corporate[] {
  if (!Array.isArray(value)) return [];
  const out: Corporate[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const name = trim(rec.name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  return out;
}

export function upsertCorporate(rows: Corporate[], name: string) {
  const label = trim(name);
  if (!label) throw validationError({ name: "required" });
  const existing = rows.find(
    (row) => row.name.toLowerCase() === label.toLowerCase(),
  );
  if (existing) return rows;
  return [...rows, { id: `corp-${label.toLowerCase().replace(/\s+/g, "-")}`, name: label }];
}

export function dropCorporate(rows: Corporate[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("corporate");
  return next;
}

export function patchCorporateRow(rows: Corporate[], id: string, name: string) {
  const key = trim(id);
  const label = trim(name);
  if (!key) throw validationError({ id: "required" });
  if (!label) throw validationError({ name: "required" });
  const existing = rows.find((row) => row.id === key);
  if (!existing) throw notFound("corporate");
  const clash = rows.find(
    (row) =>
      row.id !== existing.id && row.name.toLowerCase() === label.toLowerCase(),
  );
  if (clash) throw validationError({ name: "already exists" });
  return rows.map((row) =>
    row.id === existing.id ? { id: existing.id, name: label } : row,
  );
}

export function assertCorporateDroppable(sponsors: Sponsor[], id: string) {
  const key = trim(id);
  if (sponsors.some((row) => row.corporateId === key)) {
    throw conflict("corporate has sponsors");
  }
}

export function parseSponsors(value: unknown): Sponsor[] {
  if (!Array.isArray(value)) return [];
  const out: Sponsor[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const studentId = trim(rec.studentId);
    const corporateId = trim(rec.corporateId);
    if (!studentId || !corporateId || seen.has(studentId)) continue;
    seen.add(studentId);
    out.push({ studentId, corporateId, amount: Math.max(0, num(rec.amount)) });
  }
  return out;
}

export function upsertSponsor(
  rows: Sponsor[],
  studentId: string,
  corporateId: string,
  amount: number,
) {
  const sid = trim(studentId);
  const cid = trim(corporateId);
  if (!sid) throw validationError({ studentId: "required" });
  if (!cid) throw validationError({ corporateId: "required" });
  return [
    ...rows.filter((row) => row.studentId !== sid),
    { studentId: sid, corporateId: cid, amount: Math.max(0, num(amount)) },
  ];
}

export function parseAccessions(value: unknown): Accession[] {
  if (!Array.isArray(value)) return [];
  const out: Accession[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const bookId = trim(rec.bookId);
    const accessionNo = trim(rec.accessionNo);
    if (!bookId || !accessionNo || seen.has(bookId)) continue;
    seen.add(bookId);
    out.push({
      id: trim(rec.id) || bookId,
      bookId,
      accessionNo,
    });
  }
  return out;
}

export function nextAccessionNo(rows: Accession[]) {
  const max = rows.reduce((n, row) => {
    const match = /^ACC-(\d+)$/.exec(row.accessionNo);
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `ACC-${String(max + 1).padStart(4, "0")}`;
}

export function dropAccessionsByBook(rows: Accession[], bookId: string) {
  const id = trim(bookId);
  if (!id) return rows;
  return rows.filter((row) => row.bookId !== id);
}

export function findAccession(rows: Accession[], id: string) {
  const key = trim(id);
  if (!key) return undefined;
  return rows.find(
    (row) => row.id === key || row.bookId === key || row.accessionNo === key,
  );
}

export function dropAccession(rows: Accession[], id: string) {
  const existing = findAccession(rows, id);
  if (!existing) throw notFound("accession");
  return rows.filter((row) => row.bookId !== existing.bookId);
}

export function patchAccessionRow(rows: Accession[], id: string, accessionNo: string) {
  const no = trim(accessionNo);
  if (!no) throw validationError({ accessionNo: "required" });
  const existing = findAccession(rows, id);
  if (!existing) throw notFound("accession");
  const clash = rows.find(
    (row) =>
      row.bookId !== existing.bookId &&
      row.accessionNo.toLowerCase() === no.toLowerCase(),
  );
  if (clash) throw validationError({ accessionNo: "already exists" });
  const next: Accession = { ...existing, accessionNo: no };
  return rows.map((row) => (row.bookId === existing.bookId ? next : row));
}

export function attachAccessions<T extends { id: string }>(
  books: T[],
  rows: Accession[],
) {
  const byId = new Map(rows.map((row) => [row.bookId, row.accessionNo]));
  return books.map((book) => ({
    ...book,
    accessionNo: byId.get(book.id) ?? null,
  }));
}

export function payslipLines(input: {
  campusName: string;
  staffName: string;
  employeeId: string;
  year: number;
  month: number;
  gross: string;
  pf: string;
  esi: string;
  pt: string;
  tds: string;
  net: string;
}) {
  const period = `${input.year}-${String(input.month).padStart(2, "0")}`;
  return [
    input.campusName,
    `Payslip ${period}`,
    `${input.staffName} · ${input.employeeId}`,
    `Gross ₹${input.gross}`,
    `PF ₹${input.pf}`,
    `ESI ₹${input.esi}`,
    `PT ₹${input.pt}`,
    `TDS ₹${input.tds}`,
    `Net ₹${input.net}`,
  ];
}

export function campusFeeDue(
  total: string | number | null | undefined,
  paid: string | number | null | undefined,
  discount: string | number | null | undefined,
) {
  const due = Number(total ?? 0) - Number(paid ?? 0) - Number(discount ?? 0);
  return Math.max(0, Number.isFinite(due) ? due : 0);
}

export async function listCorporates(campusId: string) {
  return parseCorporates(await readSetting(campusId, CORPORATES_KEY));
}

export async function createCorporate(campusId: string, name: string) {
  const next = upsertCorporate(await listCorporates(campusId), name);
  await writeSetting(campusId, CORPORATES_KEY, next);
  return next.find((row) => row.name.toLowerCase() === trim(name).toLowerCase())!;
}

export async function getCorporate(campusId: string, id: string) {
  const row = (await listCorporates(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("corporate");
  return row;
}

export async function patchCorporate(campusId: string, id: string, name: string) {
  const next = patchCorporateRow(await listCorporates(campusId), id, name);
  await writeSetting(campusId, CORPORATES_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function removeCorporate(campusId: string, id: string) {
  const existing = await getCorporate(campusId, id);
  assertCorporateDroppable(await listSponsors(campusId), existing.id);
  const next = dropCorporate(await listCorporates(campusId), existing.id);
  await writeSetting(campusId, CORPORATES_KEY, next);
  return { id: existing.id, deleted: true };
}

export async function listSponsors(campusId: string) {
  return parseSponsors(await readSetting(campusId, SPONSORS_KEY));
}

export async function assignSponsor(
  campusId: string,
  input: { studentId: string; corporateId: string; amount?: number },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
  });
  if (!student) throw notFound("student");
  const corporate = (await listCorporates(campusId)).find(
    (row) => row.id === input.corporateId,
  );
  if (!corporate) throw notFound("corporate");
  const next = upsertSponsor(
    await listSponsors(campusId),
    student.id,
    corporate.id,
    input.amount ?? 0,
  );
  await writeSetting(campusId, SPONSORS_KEY, next);
  await prisma.student.update({
    where: { id: student.id },
    data: { feeCategory: corporate.name },
  });
  return next.find((row) => row.studentId === student.id)!;
}

export async function writeBookAccession(campusId: string, bookId: string) {
  const rows = parseAccessions(await readSetting(campusId, ACCESSIONS_KEY));
  if (rows.some((row) => row.bookId === bookId)) return rows;
  const next = [
    ...rows,
    { id: bookId, bookId, accessionNo: nextAccessionNo(rows) },
  ];
  await writeSetting(campusId, ACCESSIONS_KEY, next);
  return next;
}

export async function getAccession(campusId: string, id: string) {
  const row = findAccession(await listBookAccessions(campusId), id);
  if (!row) throw notFound("accession");
  const book = await prisma.book.findFirst({
    where: { id: row.bookId, campusId },
    select: { title: true },
  });
  return { ...row, title: book?.title ?? null };
}

export async function patchAccession(campusId: string, id: string, accessionNo: string) {
  const next = patchAccessionRow(await listBookAccessions(campusId), id, accessionNo);
  await writeSetting(campusId, ACCESSIONS_KEY, next);
  const saved = findAccession(next, id);
  if (!saved) throw notFound("accession");
  const book = await prisma.book.findFirst({
    where: { id: saved.bookId, campusId },
    select: { title: true },
  });
  return { ...saved, title: book?.title ?? null };
}

export async function removeAccession(campusId: string, id: string) {
  const existing = findAccession(await listBookAccessions(campusId), id);
  if (!existing) throw notFound("accession");
  const next = dropAccession(await listBookAccessions(campusId), existing.id);
  await writeSetting(campusId, ACCESSIONS_KEY, next);
  return { id: existing.id, bookId: existing.bookId, deleted: true };
}

export async function listBookAccessions(campusId: string) {
  return parseAccessions(await readSetting(campusId, ACCESSIONS_KEY));
}

export async function dropBookAccessions(campusId: string, bookId: string) {
  const next = dropAccessionsByBook(await listBookAccessions(campusId), bookId);
  await writeSetting(campusId, ACCESSIONS_KEY, next);
  return next;
}
