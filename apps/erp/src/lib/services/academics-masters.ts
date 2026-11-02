import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";

export const SUBJECT_CATEGORIES_KEY = "academics.subjectCategories";
export const SUBJECT_TYPES_KEY = "academics.subjectTypes";
export const LEAVE_MARKS_KEY = "academics.leaveMarksPercent";
export const SUBJECT_META_KEY = "academics.subjectMeta";

export type NamedMaster = { id: string; name: string };
export type LeaveMarksRow = { id: string; leaveTypeId: string; percent: number };
export type SubjectMeta = {
  subjectId: string;
  categoryId: string;
  typeId: string;
  parentSubjectId: string;
};
export type LeaveWindow = {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  status: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function isoDate(value: unknown) {
  const raw = trim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
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

export function parseNamedMasters(value: unknown): NamedMaster[] {
  if (!Array.isArray(value)) return [];
  const out: NamedMaster[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const name = trim(rec.name);
    const key = name.toLowerCase();
    if (!id || !name || seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name });
  }
  return out;
}

export function upsertNamedMaster(
  rows: NamedMaster[],
  input: { id?: string; name: string },
) {
  const name = trim(input.name);
  if (!name) throw validationError({ name: "required" });
  const id = trim(input.id);
  if (id) {
    const existing = rows.find((row) => row.id === id);
    if (existing) {
      const clash = rows.find(
        (row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase(),
      );
      if (clash) throw validationError({ name: "already exists" });
      return rows.map((row) => (row.id === id ? { id, name } : row));
    }
  }
  const existing = rows.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (existing) return rows;
  return [...rows, { id: id || crypto.randomUUID(), name }];
}

export function dropNamedMaster(rows: NamedMaster[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("master");
  return next;
}

export function getNamedMaster(rows: NamedMaster[], id: string, label = "master") {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const row = rows.find((entry) => entry.id === key);
  if (!row) throw notFound(label);
  return row;
}

export function dropSubjectMetaField(
  rows: SubjectMeta[],
  field: "categoryId" | "typeId",
  id: string,
) {
  const key = trim(id);
  if (!key) return rows;
  return rows.map((row) => (row[field] === key ? { ...row, [field]: "" } : row));
}

export function dropSubjectMeta(rows: SubjectMeta[], subjectId: string) {
  const key = trim(subjectId);
  if (!key) throw validationError({ subjectId: "required" });
  return rows.filter((row) => row.subjectId !== key);
}

export function subjectHasSubSubjects(rows: SubjectMeta[], subjectId: string) {
  const key = trim(subjectId);
  return rows.some((row) => row.parentSubjectId === key);
}

export function subjectDeleteBlocked(counts: {
  offerings: number;
  courseOutcomes: number;
  copoLessons: number;
  liveClasses: number;
  timetableSlots: number;
  subSubjects: number;
}) {
  return (
    counts.offerings > 0 ||
    counts.courseOutcomes > 0 ||
    counts.copoLessons > 0 ||
    counts.liveClasses > 0 ||
    counts.timetableSlots > 0 ||
    counts.subSubjects > 0
  );
}

export function parseLeaveMarksPercents(value: unknown): LeaveMarksRow[] {
  if (!Array.isArray(value)) return [];
  const out: LeaveMarksRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const leaveTypeId = trim(rec.leaveTypeId);
    const percent = Number(rec.percent);
    if (!id || !leaveTypeId || seen.has(leaveTypeId)) continue;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) continue;
    seen.add(leaveTypeId);
    out.push({ id, leaveTypeId, percent });
  }
  return out;
}

export function dropLeaveMarksPercent(rows: LeaveMarksRow[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("leave mark percent");
  return next;
}

export function dropLeaveMarksByLeaveType(
  rows: LeaveMarksRow[],
  leaveTypeId: string,
) {
  const key = trim(leaveTypeId);
  if (!key) return rows;
  return rows.filter((row) => row.leaveTypeId !== key);
}

export function upsertLeaveMarksPercent(
  rows: LeaveMarksRow[],
  input: { id?: string; leaveTypeId: string; percent: number },
) {
  const leaveTypeId = trim(input.leaveTypeId);
  if (!leaveTypeId) throw validationError({ leaveTypeId: "required" });
  const percent = Number(input.percent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw validationError({ percent: "must be 0-100" });
  }
  const previous = rows.find((row) => row.leaveTypeId === leaveTypeId);
  const id = trim(input.id) || previous?.id || crypto.randomUUID();
  const next: LeaveMarksRow = { id, leaveTypeId, percent };
  return [...rows.filter((row) => row.leaveTypeId !== leaveTypeId), next];
}

export function awardedMarksOnLeave(marks: number, percent: number) {
  const raw = Number(marks);
  const pct = Number(percent);
  if (!Number.isFinite(raw) || !Number.isFinite(pct)) return 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return Math.round(raw * (clamped / 100) * 100) / 100;
}

export function leavePercentOnDate(
  percents: LeaveMarksRow[],
  leaves: LeaveWindow[],
  examDate: string,
) {
  const day = isoDate(examDate);
  if (!day) return null;
  const hit = leaves.find((row) => {
    const from = isoDate(row.fromDate);
    const to = isoDate(row.toDate);
    return (
      trim(row.status).toLowerCase() === "approved" &&
      Boolean(from) &&
      Boolean(to) &&
      from <= day &&
      day <= to
    );
  });
  if (!hit) return null;
  const row = percents.find((item) => item.leaveTypeId === hit.leaveTypeId);
  return row ? row.percent : null;
}

export function parseSubjectMeta(value: unknown): SubjectMeta[] {
  if (!Array.isArray(value)) return [];
  const out: SubjectMeta[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const subjectId = trim(rec.subjectId);
    const categoryId = trim(rec.categoryId);
    const typeId = trim(rec.typeId);
    const parentSubjectId = trim(rec.parentSubjectId);
    if (!subjectId || seen.has(subjectId)) continue;
    seen.add(subjectId);
    out.push({ subjectId, categoryId, typeId, parentSubjectId });
  }
  return out;
}

export function resolveParentSubjectId(
  subjectId: string,
  parentSubjectId: unknown,
  subjects: Array<{ id: string }>,
  meta: SubjectMeta[],
) {
  const id = trim(subjectId);
  const parentId = trim(parentSubjectId);
  if (!parentId) return "";
  if (parentId === id) throw validationError({ parentSubjectId: "cannot nest under itself" });
  if (!subjects.some((row) => row.id === parentId)) {
    throw validationError({ parentSubjectId: "unknown" });
  }
  const parentMeta = meta.find((row) => row.subjectId === parentId);
  if (parentMeta?.parentSubjectId) {
    throw validationError({ parentSubjectId: "parent is a sub-subject" });
  }
  if (meta.some((row) => row.parentSubjectId === id)) {
    throw validationError({ parentSubjectId: "subject already has sub-subjects" });
  }
  return parentId;
}

export function upsertSubjectMeta(
  rows: SubjectMeta[],
  input: {
    subjectId: string;
    categoryId?: string;
    typeId?: string;
    parentSubjectId?: string;
  },
) {
  const subjectId = trim(input.subjectId);
  if (!subjectId) throw validationError({ subjectId: "required" });
  const previous = rows.find((row) => row.subjectId === subjectId);
  const next: SubjectMeta = {
    subjectId,
    categoryId:
      input.categoryId !== undefined ? trim(input.categoryId) : (previous?.categoryId ?? ""),
    typeId: input.typeId !== undefined ? trim(input.typeId) : (previous?.typeId ?? ""),
    parentSubjectId:
      input.parentSubjectId !== undefined
        ? trim(input.parentSubjectId)
        : (previous?.parentSubjectId ?? ""),
  };
  return [...rows.filter((row) => row.subjectId !== subjectId), next];
}

export async function listSubjectCategories(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, SUBJECT_CATEGORIES_KEY));
}

export async function saveSubjectCategory(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listSubjectCategories(campusId), input);
  await writeSetting(campusId, SUBJECT_CATEGORIES_KEY, next);
  return next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase())!;
}

export async function getSubjectCategory(campusId: string, id: string) {
  return getNamedMaster(await listSubjectCategories(campusId), id, "subject category");
}

export async function removeSubjectCategory(campusId: string, id: string) {
  const named = await listSubjectCategories(campusId);
  const next = dropNamedMaster(named, id);
  const meta = dropSubjectMetaField(await listSubjectMeta(campusId), "categoryId", id);
  await writeSetting(campusId, SUBJECT_CATEGORIES_KEY, next);
  await writeSetting(campusId, SUBJECT_META_KEY, meta);
  return { id: trim(id), deleted: true };
}

export async function listSubjectTypes(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, SUBJECT_TYPES_KEY));
}

export async function saveSubjectType(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listSubjectTypes(campusId), input);
  await writeSetting(campusId, SUBJECT_TYPES_KEY, next);
  return next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase())!;
}

export async function getSubjectType(campusId: string, id: string) {
  return getNamedMaster(await listSubjectTypes(campusId), id, "subject type");
}

export async function removeSubjectType(campusId: string, id: string) {
  const named = await listSubjectTypes(campusId);
  const next = dropNamedMaster(named, id);
  const meta = dropSubjectMetaField(await listSubjectMeta(campusId), "typeId", id);
  await writeSetting(campusId, SUBJECT_TYPES_KEY, next);
  await writeSetting(campusId, SUBJECT_META_KEY, meta);
  return { id: trim(id), deleted: true };
}

export async function listLeaveMarksPercents(campusId: string) {
  return parseLeaveMarksPercents(await readSetting(campusId, LEAVE_MARKS_KEY));
}

export async function getLeaveMarksPercent(campusId: string, id: string) {
  const row = (await listLeaveMarksPercents(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("leave mark percent");
  return row;
}

export async function removeLeaveMarksPercent(campusId: string, id: string) {
  const next = dropLeaveMarksPercent(await listLeaveMarksPercents(campusId), id);
  await writeSetting(campusId, LEAVE_MARKS_KEY, next);
  return { id: trim(id), deleted: true };
}

export async function dropLeaveMarksForLeaveType(
  campusId: string,
  leaveTypeId: string,
) {
  const next = dropLeaveMarksByLeaveType(
    await listLeaveMarksPercents(campusId),
    leaveTypeId,
  );
  await writeSetting(campusId, LEAVE_MARKS_KEY, next);
  return next;
}

export async function saveLeaveMarksPercent(
  campusId: string,
  input: { id?: string; leaveTypeId: string; percent: number },
) {
  const leaveType = await prisma.leaveType.findFirst({
    where: { id: input.leaveTypeId, campusId },
    select: { id: true },
  });
  if (!leaveType) throw notFound("leave type");
  const next = upsertLeaveMarksPercent(await listLeaveMarksPercents(campusId), {
    ...input,
    leaveTypeId: leaveType.id,
  });
  await writeSetting(campusId, LEAVE_MARKS_KEY, next);
  return next.find((row) => row.leaveTypeId === leaveType.id)!;
}

export async function listSubjectMeta(campusId: string) {
  return parseSubjectMeta(await readSetting(campusId, SUBJECT_META_KEY));
}

export async function saveSubjectMeta(
  campusId: string,
  input: {
    subjectId: string;
    categoryId?: string;
    typeId?: string;
    parentSubjectId?: string;
  },
) {
  const subject = await prisma.subject.findFirst({
    where: { id: input.subjectId, campusId },
    select: { id: true },
  });
  if (!subject) throw notFound("subject");
  const [categories, types, existing, campusSubjects] = await Promise.all([
    listSubjectCategories(campusId),
    listSubjectTypes(campusId),
    listSubjectMeta(campusId),
    prisma.subject.findMany({
      where: { campusId },
      select: { id: true, name: true },
    }),
  ]);
  const categoryId = trim(input.categoryId);
  const typeId = trim(input.typeId);
  if (categoryId && !categories.some((row) => row.id === categoryId)) {
    throw notFound("subject category");
  }
  if (typeId && !types.some((row) => row.id === typeId)) {
    throw notFound("subject type");
  }
  const parentSubjectId =
    input.parentSubjectId !== undefined
      ? resolveParentSubjectId(
          subject.id,
          input.parentSubjectId,
          campusSubjects,
          existing,
        )
      : undefined;
  const next = upsertSubjectMeta(existing, {
    subjectId: subject.id,
    categoryId: input.categoryId !== undefined ? categoryId : undefined,
    typeId: input.typeId !== undefined ? typeId : undefined,
    parentSubjectId,
  });
  await writeSetting(campusId, SUBJECT_META_KEY, next);
  return next.find((row) => row.subjectId === subject.id)!;
}

export async function getSubject(campusId: string, id: string) {
  const row = await prisma.subject.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("subject");
  const [attached] = await attachSubjectMeta(campusId, [row]);
  return attached!;
}

export async function patchSubject(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    code?: string;
    kind?: string;
    isOptional?: boolean;
    categoryId?: string;
    typeId?: string;
    parentSubjectId?: string;
  },
) {
  const existing = await getSubject(campusId, id);
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  const kind = patch.kind !== undefined ? trim(patch.kind) : existing.kind;
  if (!kind) throw validationError({ kind: "required" });
  await prisma.subject.update({
    where: { id: existing.id },
    data: {
      name,
      ...(patch.code !== undefined ? { code: trim(patch.code) || null } : {}),
      ...(patch.kind !== undefined ? { kind } : {}),
      ...(patch.isOptional !== undefined ? { isOptional: patch.isOptional } : {}),
    },
  });
  if (
    patch.categoryId !== undefined ||
    patch.typeId !== undefined ||
    patch.parentSubjectId !== undefined
  ) {
    await saveSubjectMeta(campusId, {
      subjectId: existing.id,
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.typeId !== undefined ? { typeId: patch.typeId } : {}),
      ...(patch.parentSubjectId !== undefined
        ? { parentSubjectId: patch.parentSubjectId }
        : {}),
    });
  }
  return getSubject(campusId, existing.id);
}

export async function removeSubject(campusId: string, id: string) {
  const existing = await getSubject(campusId, id);
  const meta = await listSubjectMeta(campusId);
  const [offerings, courseOutcomes, copoLessons, liveClasses, timetableSlots] =
    await Promise.all([
      prisma.classSubject.count({ where: { subjectId: existing.id } }),
      prisma.courseOutcome.count({ where: { subjectId: existing.id } }),
      prisma.copoLesson.count({ where: { subjectId: existing.id } }),
      prisma.liveClass.count({ where: { subjectId: existing.id } }),
      prisma.timetableSlot.count({ where: { subjectId: existing.id } }),
    ]);
  const subSubjects = subjectHasSubSubjects(meta, existing.id) ? 1 : 0;
  if (
    subjectDeleteBlocked({
      offerings,
      courseOutcomes,
      copoLessons,
      liveClasses,
      timetableSlots,
      subSubjects,
    })
  ) {
    if (subSubjects) throw conflict("subject has sub-subjects");
    throw conflict("subject is in use");
  }
  await writeSetting(campusId, SUBJECT_META_KEY, dropSubjectMeta(meta, existing.id));
  await prisma.subject.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function attachSubjectMeta<T extends { id: string; name?: string }>(
  campusId: string,
  subjects: T[],
) {
  const meta = await listSubjectMeta(campusId);
  const byId = new Map(meta.map((row) => [row.subjectId, row]));
  const names = new Map(subjects.map((row) => [row.id, row.name ?? ""]));
  return subjects.map((row) => {
    const item = byId.get(row.id);
    const parentSubjectId = item?.parentSubjectId ?? "";
    return {
      ...row,
      categoryId: item?.categoryId ?? "",
      typeId: item?.typeId ?? "",
      parentSubjectId,
      isSubSubject: Boolean(parentSubjectId),
      parentName: parentSubjectId ? names.get(parentSubjectId) ?? "" : "",
    };
  });
}

function ymd(value: Date | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return isoDate(value.slice(0, 10));
  return value.toISOString().slice(0, 10);
}

export async function leavePercentsForStudents(input: {
  campusId: string;
  studentIds: string[];
  examDate: Date | string | null | undefined;
}) {
  const examDate = ymd(input.examDate);
  const out = new Map<string, number | null>();
  for (const id of input.studentIds) out.set(id, null);
  if (!examDate || !input.studentIds.length) return out;
  const [percents, leaves] = await Promise.all([
    listLeaveMarksPercents(input.campusId),
    prisma.leaveRequest.findMany({
      where: {
        studentId: { in: input.studentIds },
        status: "approved",
        leaveType: { campusId: input.campusId },
      },
      select: {
        studentId: true,
        leaveTypeId: true,
        fromDate: true,
        toDate: true,
        status: true,
      },
    }),
  ]);
  const byStudent = new Map<string, LeaveWindow[]>();
  for (const row of leaves) {
    if (!row.studentId) continue;
    const list = byStudent.get(row.studentId) ?? [];
    list.push({
      leaveTypeId: row.leaveTypeId,
      fromDate: ymd(row.fromDate),
      toDate: ymd(row.toDate),
      status: row.status,
    });
    byStudent.set(row.studentId, list);
  }
  for (const id of input.studentIds) {
    out.set(id, leavePercentOnDate(percents, byStudent.get(id) ?? [], examDate));
  }
  return out;
}

export async function leavePercentForStudent(input: {
  campusId: string;
  studentId: string;
  examDate: Date | string | null | undefined;
}) {
  const map = await leavePercentsForStudents({
    campusId: input.campusId,
    studentIds: [input.studentId],
    examDate: input.examDate,
  });
  return map.get(input.studentId) ?? null;
}

export function scaleMarksForLeave(
  marks: Prisma.Decimal | number | string,
  percent: number | null,
) {
  if (percent == null) return dec(marks);
  return dec(awardedMarksOnLeave(Number(marks), percent));
}
