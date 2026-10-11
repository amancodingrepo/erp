import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const CONCESSIONS_KEY = "fees.concessions";

export type StudentConcession = {
  id: string;
  studentId: string;
  discountId: string;
  note: string;
};

type DiscountRef = { id: string; name: string };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function plainText(value: unknown) {
  return trim(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

export function parseConcessions(value: unknown): StudentConcession[] {
  if (!Array.isArray(value)) return [];
  const out: StudentConcession[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const studentId = trim(rec.studentId);
    const discountId = trim(rec.discountId);
    const key = `${studentId}\0${discountId}`;
    if (!studentId || !discountId || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: trim(rec.id) || crypto.randomUUID(),
      studentId,
      discountId,
      note: plainText(rec.note),
    });
  }
  return out;
}

export function upsertConcession(
  rows: StudentConcession[],
  input: { studentId: string; discountId: string; note?: string },
  discounts: DiscountRef[],
) {
  const studentId = trim(input.studentId);
  const discountId = trim(input.discountId);
  if (!studentId) throw validationError({ studentId: "required" });
  if (!discountId || !discounts.some((row) => row.id === discountId)) {
    throw validationError({ discountId: "unknown discount" });
  }
  const next: StudentConcession = {
    id:
      rows.find((row) => row.studentId === studentId && row.discountId === discountId)
        ?.id ?? crypto.randomUUID(),
    studentId,
    discountId,
    note: plainText(input.note),
  };
  return [
    ...rows.filter(
      (row) => !(row.studentId === studentId && row.discountId === discountId),
    ),
    next,
  ];
}

export function attachConcessions(
  rows: StudentConcession[],
  discounts: DiscountRef[],
) {
  const names = new Map(discounts.map((row) => [row.id, row.name]));
  return rows.map((row) => ({
    ...row,
    discount: names.get(row.discountId) ?? row.discountId,
  }));
}

export function firstDiscountIdForStudent(
  rows: StudentConcession[],
  studentId: string,
) {
  return rows.find((row) => row.studentId === trim(studentId))?.discountId ?? null;
}

export function dropConcession(rows: StudentConcession[], id: string) {
  const key = trim(id);
  if (!key) return rows;
  return rows.filter((row) => row.id !== key);
}

export async function listConcessions(campusId: string, studentId?: string) {
  const discounts = await prisma.feeDiscount.findMany({
    where: { campusId },
    select: { id: true, name: true },
  });
  const rows = parseConcessions(await readSetting(campusId, CONCESSIONS_KEY));
  const scoped = studentId
    ? rows.filter((row) => row.studentId === studentId)
    : rows;
  return attachConcessions(scoped, discounts);
}

export async function saveConcession(
  campusId: string,
  input: { studentId: string; discountId: string; note?: string },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const discounts = await prisma.feeDiscount.findMany({
    where: { campusId },
    select: { id: true, name: true },
  });
  const next = upsertConcession(
    parseConcessions(await readSetting(campusId, CONCESSIONS_KEY)),
    { ...input, studentId: student.id },
    discounts,
  );
  await writeSetting(campusId, CONCESSIONS_KEY, next);
  const saved = next.find(
    (row) => row.studentId === student.id && row.discountId === trim(input.discountId),
  )!;
  return attachConcessions([saved], discounts)[0]!;
}

export async function standingDiscountId(campusId: string, studentId: string) {
  return firstDiscountIdForStudent(
    parseConcessions(await readSetting(campusId, CONCESSIONS_KEY)),
    studentId,
  );
}

export async function getConcession(campusId: string, id: string) {
  const row = (await listConcessions(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("concession");
  return row;
}

export async function patchConcession(
  campusId: string,
  id: string,
  patch: { discountId?: string; note?: string },
) {
  const existing = await getConcession(campusId, id);
  const discountId = trim(patch.discountId ?? existing.discountId);
  const discounts = await prisma.feeDiscount.findMany({
    where: { campusId },
    select: { id: true, name: true },
  });
  if (!discountId || !discounts.some((row) => row.id === discountId)) {
    throw validationError({ discountId: "unknown discount" });
  }
  const rows = parseConcessions(await readSetting(campusId, CONCESSIONS_KEY));
  const clash = rows.find(
    (row) =>
      row.id !== existing.id &&
      row.studentId === existing.studentId &&
      row.discountId === discountId,
  );
  if (clash) throw validationError({ discountId: "already assigned" });
  const nextRow: StudentConcession = {
    ...existing,
    discountId,
    note: patch.note !== undefined ? plainText(patch.note) : existing.note,
  };
  const next = rows.map((row) => (row.id === existing.id ? nextRow : row));
  await writeSetting(campusId, CONCESSIONS_KEY, next);
  return attachConcessions([nextRow], discounts)[0]!;
}

export async function removeConcession(campusId: string, id: string) {
  const existing = await getConcession(campusId, id);
  const next = dropConcession(
    parseConcessions(await readSetting(campusId, CONCESSIONS_KEY)),
    existing.id,
  );
  await writeSetting(campusId, CONCESSIONS_KEY, next);
  return { id: existing.id, deleted: true };
}
