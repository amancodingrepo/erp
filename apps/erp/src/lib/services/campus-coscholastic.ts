import { Prisma, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import {
  dropNamedMaster,
  getNamedMaster,
  parseNamedMasters,
  upsertNamedMaster,
  type NamedMaster,
} from "@/lib/services/academics-masters";

export const CO_SCHOLASTIC_ASPECTS_KEY = "academics.coScholasticAspects";
export const CO_SCHOLASTIC_KEY = "academics.coScholastic";

export type CoScholasticEntry = {
  id: string;
  studentId: string;
  aspectId: string;
  grade: string;
  remark: string;
};

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

export function parseCoScholastic(value: unknown): CoScholasticEntry[] {
  if (!Array.isArray(value)) return [];
  const out: CoScholasticEntry[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const studentId = trim(rec.studentId);
    const aspectId = trim(rec.aspectId);
    const grade = plainText(rec.grade);
    const key = `${studentId}\0${aspectId}`;
    if (!studentId || !aspectId || !grade || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: trim(rec.id) || crypto.randomUUID(),
      studentId,
      aspectId,
      grade,
      remark: plainText(rec.remark),
    });
  }
  return out;
}

export function upsertCoScholastic(
  rows: CoScholasticEntry[],
  input: { studentId: string; aspectId: string; grade: string; remark?: string },
  aspects: NamedMaster[],
) {
  const studentId = trim(input.studentId);
  const aspectId = trim(input.aspectId);
  const grade = plainText(input.grade);
  if (!studentId) throw validationError({ studentId: "required" });
  if (!aspectId || !aspects.some((row) => row.id === aspectId)) {
    throw validationError({ aspectId: "unknown aspect" });
  }
  if (!grade) throw validationError({ grade: "required" });
  const next: CoScholasticEntry = {
    id:
      rows.find((row) => row.studentId === studentId && row.aspectId === aspectId)
        ?.id ?? crypto.randomUUID(),
    studentId,
    aspectId,
    grade,
    remark: plainText(input.remark),
  };
  return [
    ...rows.filter(
      (row) => !(row.studentId === studentId && row.aspectId === aspectId),
    ),
    next,
  ];
}

export function bulkCoScholastic(
  rows: CoScholasticEntry[],
  input: {
    studentIds: string[];
    aspectId: string;
    grade: string;
    remark?: string;
  },
  aspects: NamedMaster[],
) {
  const studentIds = [
    ...new Set(input.studentIds.map((id) => trim(id)).filter(Boolean)),
  ];
  if (!studentIds.length) throw validationError({ studentIds: "required" });
  let next = rows;
  for (const studentId of studentIds) {
    next = upsertCoScholastic(
      next,
      {
        studentId,
        aspectId: input.aspectId,
        grade: input.grade,
        remark: input.remark,
      },
      aspects,
    );
  }
  return next;
}

export function coScholasticAspectDeleteBlocked(
  rows: CoScholasticEntry[],
  aspectId: string,
) {
  const key = trim(aspectId);
  return Boolean(key) && rows.some((row) => row.aspectId === key);
}

export function attachCoScholastic(
  rows: CoScholasticEntry[],
  aspects: NamedMaster[],
) {
  const names = new Map(aspects.map((row) => [row.id, row.name]));
  return rows.map((row) => ({
    ...row,
    aspect: names.get(row.aspectId) ?? row.aspectId,
  }));
}

export async function listCoScholasticAspects(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, CO_SCHOLASTIC_ASPECTS_KEY));
}

export async function saveCoScholasticAspect(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listCoScholasticAspects(campusId), input);
  await writeSetting(campusId, CO_SCHOLASTIC_ASPECTS_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next[next.length - 1]!
  );
}

export async function getCoScholasticAspect(campusId: string, id: string) {
  return getNamedMaster(
    await listCoScholasticAspects(campusId),
    id,
    "co-scholastic aspect",
  );
}

export async function patchCoScholasticAspect(
  campusId: string,
  id: string,
  patch: { name: string },
) {
  const existing = await getCoScholasticAspect(campusId, id);
  const next = upsertNamedMaster(await listCoScholasticAspects(campusId), {
    id: existing.id,
    name: patch.name,
  });
  await writeSetting(campusId, CO_SCHOLASTIC_ASPECTS_KEY, next);
  return getNamedMaster(next, existing.id, "co-scholastic aspect");
}

export async function removeCoScholasticAspect(campusId: string, id: string) {
  const existing = await getCoScholasticAspect(campusId, id);
  const grades = parseCoScholastic(await readSetting(campusId, CO_SCHOLASTIC_KEY));
  if (coScholasticAspectDeleteBlocked(grades, existing.id)) {
    throw conflict("co-scholastic aspect is in use");
  }
  const next = dropNamedMaster(
    await listCoScholasticAspects(campusId),
    existing.id,
  );
  await writeSetting(campusId, CO_SCHOLASTIC_ASPECTS_KEY, next);
  return { id: existing.id, deleted: true };
}

export async function listCoScholastic(campusId: string, studentId?: string) {
  const [rows, aspects] = await Promise.all([
    parseCoScholastic(await readSetting(campusId, CO_SCHOLASTIC_KEY)),
    listCoScholasticAspects(campusId),
  ]);
  const scoped = studentId
    ? rows.filter((row) => row.studentId === studentId)
    : rows;
  return attachCoScholastic(scoped, aspects);
}

export async function saveCoScholasticEntry(
  campusId: string,
  input: { studentId: string; aspectId: string; grade: string; remark?: string },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const aspects = await listCoScholasticAspects(campusId);
  const next = upsertCoScholastic(
    parseCoScholastic(await readSetting(campusId, CO_SCHOLASTIC_KEY)),
    { ...input, studentId: student.id },
    aspects,
  );
  await writeSetting(campusId, CO_SCHOLASTIC_KEY, next);
  const saved = next.find(
    (row) => row.studentId === student.id && row.aspectId === trim(input.aspectId),
  )!;
  return attachCoScholastic([saved], aspects)[0]!;
}

export async function bulkSaveCoScholastic(
  campusId: string,
  input: {
    classId: string;
    aspectId: string;
    grade: string;
    remark?: string;
    studentIds?: string[];
  },
) {
  const klass = await prisma.class.findFirst({
    where: { id: input.classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true } } },
  });
  if (!klass) throw notFound("class");
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: klass.id,
      isCurrent: true,
      student: { campusId, status: StudentStatus.ACTIVE },
    },
    select: { studentId: true },
  });
  const allowed = new Set(enrollments.map((row) => row.studentId));
  const requested = (input.studentIds ?? []).map((id) => trim(id)).filter(Boolean);
  const studentIds = requested.length
    ? requested.filter((id) => allowed.has(id))
    : [...allowed];
  const aspects = await listCoScholasticAspects(campusId);
  const next = bulkCoScholastic(
    parseCoScholastic(await readSetting(campusId, CO_SCHOLASTIC_KEY)),
    {
      studentIds,
      aspectId: input.aspectId,
      grade: input.grade,
      remark: input.remark,
    },
    aspects,
  );
  await writeSetting(campusId, CO_SCHOLASTIC_KEY, next);
  return attachCoScholastic(
    next.filter((row) => studentIds.includes(row.studentId)),
    aspects,
  );
}
