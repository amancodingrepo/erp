import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const STAFF_CLASSES_KEY = "hr.staffClasses";
export const STAFF_SUBJECTS_KEY = "hr.staffSubjects";

export type StaffIdList = { staffId: string; ids: string[] };

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

export function resolveLiveIds(
  liveIds: string[],
  input: unknown,
  field: string,
) {
  if (!Array.isArray(input)) throw validationError({ [field]: "required" });
  const live = new Set(liveIds.map((id) => trim(id)).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const id = trim(raw);
    if (!id) continue;
    if (!live.has(id)) throw validationError({ [field]: "unknown" });
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function parseStaffIdLists(value: unknown): StaffIdList[] {
  if (!Array.isArray(value)) return [];
  const out: StaffIdList[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const staffId = trim(rec.staffId);
    if (!staffId || seen.has(staffId)) continue;
    seen.add(staffId);
    const raw = Array.isArray(rec.ids)
      ? rec.ids
      : Array.isArray(rec.classIds)
        ? rec.classIds
        : Array.isArray(rec.subjectIds)
          ? rec.subjectIds
          : [];
    const ids: string[] = [];
    const idSeen = new Set<string>();
    for (const item of raw) {
      const id = trim(item);
      if (!id || idSeen.has(id)) continue;
      idSeen.add(id);
      ids.push(id);
    }
    out.push({ staffId, ids });
  }
  return out;
}

export function upsertStaffIdList(
  rows: StaffIdList[],
  staffId: string,
  ids: unknown,
  field: string,
) {
  const id = trim(staffId);
  if (!id) throw validationError({ staffId: "required" });
  if (!Array.isArray(ids)) throw validationError({ [field]: "required" });
  const nextIds: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const item = trim(raw);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    nextIds.push(item);
  }
  return [...rows.filter((row) => row.staffId !== id), { staffId: id, ids: nextIds }];
}

export function attachStaffAssignments<T extends { id: string }>(
  staff: T[],
  classes: StaffIdList[],
  subjects: StaffIdList[],
) {
  const classBy = new Map(classes.map((row) => [row.staffId, row.ids]));
  const subjectBy = new Map(subjects.map((row) => [row.staffId, row.ids]));
  return staff.map((row) => ({
    ...row,
    classIds: classBy.get(row.id) ?? [],
    subjectIds: subjectBy.get(row.id) ?? [],
  }));
}

export async function listStaffClasses(campusId: string) {
  return parseStaffIdLists(await readSetting(campusId, STAFF_CLASSES_KEY));
}

export async function listStaffSubjects(campusId: string) {
  return parseStaffIdLists(await readSetting(campusId, STAFF_SUBJECTS_KEY));
}

async function requireStaff(campusId: string, staffId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
    select: { id: true },
  });
  if (!staff) throw notFound("staff");
  return staff;
}

export async function staffClassesFor(campusId: string, staffId: string) {
  const staff = await requireStaff(campusId, staffId);
  const row = (await listStaffClasses(campusId)).find((item) => item.staffId === staff.id);
  return { staffId: staff.id, classIds: row?.ids ?? [] };
}

export async function staffSubjectsFor(campusId: string, staffId: string) {
  const staff = await requireStaff(campusId, staffId);
  const row = (await listStaffSubjects(campusId)).find((item) => item.staffId === staff.id);
  return { staffId: staff.id, subjectIds: row?.ids ?? [] };
}

export async function saveStaffClasses(
  campusId: string,
  staffId: string,
  classIds: unknown,
) {
  const staff = await requireStaff(campusId, staffId);
  const live = await prisma.class.findMany({
    where: { program: { department: { campusId } } },
    select: { id: true },
  });
  const ids = resolveLiveIds(
    live.map((row) => row.id),
    classIds,
    "classIds",
  );
  const next = upsertStaffIdList(await listStaffClasses(campusId), staff.id, ids, "classIds");
  await writeSetting(campusId, STAFF_CLASSES_KEY, next);
  return { staffId: staff.id, classIds: ids };
}

export async function saveStaffSubjects(
  campusId: string,
  staffId: string,
  subjectIds: unknown,
) {
  const staff = await requireStaff(campusId, staffId);
  const live = await prisma.subject.findMany({
    where: { campusId },
    select: { id: true },
  });
  const ids = resolveLiveIds(
    live.map((row) => row.id),
    subjectIds,
    "subjectIds",
  );
  const next = upsertStaffIdList(
    await listStaffSubjects(campusId),
    staff.id,
    ids,
    "subjectIds",
  );
  await writeSetting(campusId, STAFF_SUBJECTS_KEY, next);
  return { staffId: staff.id, subjectIds: ids };
}
