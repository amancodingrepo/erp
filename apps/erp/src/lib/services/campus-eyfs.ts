import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import {
  dropNamedMaster,
  getNamedMaster,
  parseNamedMasters,
  upsertNamedMaster,
  type NamedMaster,
} from "@/lib/services/academics-masters";
import { allowedMediaUrl } from "@/lib/services/campus-files";

export const EYFS_AREAS_KEY = "academics.eyfsAreas";
export const EYFS_KEY = "academics.eyfs";

export type EyfsObservation = {
  id: string;
  studentId: string;
  areaId: string;
  note: string;
  url: string;
  at: string;
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

export function parseEyfsObservations(value: unknown): EyfsObservation[] {
  if (!Array.isArray(value)) return [];
  const out: EyfsObservation[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const studentId = trim(rec.studentId);
    const areaId = trim(rec.areaId);
    const note = plainText(rec.note);
    if (!id || !studentId || !areaId || !note || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      studentId,
      areaId,
      note,
      url: allowedMediaUrl(rec.url),
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function upsertEyfsObservation(
  rows: EyfsObservation[],
  input: {
    id?: string;
    studentId: string;
    areaId: string;
    note: string;
    url?: string;
    at?: string;
  },
  areas: NamedMaster[],
) {
  const studentId = trim(input.studentId);
  const areaId = trim(input.areaId);
  const note = plainText(input.note);
  if (!studentId) throw validationError({ studentId: "required" });
  if (!areaId || !areas.some((row) => row.id === areaId)) {
    throw validationError({ areaId: "unknown area" });
  }
  if (!note) throw validationError({ note: "required" });
  const urlRaw = trim(input.url);
  const url = allowedMediaUrl(input.url);
  if (urlRaw && !url) throw validationError({ url: "https or hosted file required" });
  const id = trim(input.id) || crypto.randomUUID();
  const next: EyfsObservation = {
    id,
    studentId,
    areaId,
    note,
    url,
    at: trim(input.at) || new Date().toISOString(),
  };
  return [...rows.filter((row) => row.id !== id), next];
}

export function parentEyfs(rows: EyfsObservation[], studentId: string) {
  const id = trim(studentId);
  return rows
    .filter((row) => row.studentId === id)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function removeEyfsObservation(rows: EyfsObservation[], id: string) {
  const target = trim(id);
  if (!target) return rows;
  return rows.filter((row) => row.id !== target);
}

export function eyfsAreaDeleteBlocked(rows: EyfsObservation[], areaId: string) {
  const key = trim(areaId);
  return Boolean(key) && rows.some((row) => row.areaId === key);
}

export function attachEyfsAreas(rows: EyfsObservation[], areas: NamedMaster[]) {
  const names = new Map(areas.map((row) => [row.id, row.name]));
  return rows.map((row) => ({
    ...row,
    area: names.get(row.areaId) ?? row.areaId,
  }));
}

export async function listEyfsAreas(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, EYFS_AREAS_KEY));
}

export async function saveEyfsArea(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listEyfsAreas(campusId), input);
  await writeSetting(campusId, EYFS_AREAS_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next[next.length - 1]!
  );
}

export async function getEyfsArea(campusId: string, id: string) {
  return getNamedMaster(await listEyfsAreas(campusId), id, "eyfs area");
}

export async function patchEyfsArea(
  campusId: string,
  id: string,
  patch: { name: string },
) {
  const existing = await getEyfsArea(campusId, id);
  const next = upsertNamedMaster(await listEyfsAreas(campusId), {
    id: existing.id,
    name: patch.name,
  });
  await writeSetting(campusId, EYFS_AREAS_KEY, next);
  return getNamedMaster(next, existing.id, "eyfs area");
}

export async function removeEyfsArea(campusId: string, id: string) {
  const existing = await getEyfsArea(campusId, id);
  const observations = parseEyfsObservations(await readSetting(campusId, EYFS_KEY));
  if (eyfsAreaDeleteBlocked(observations, existing.id)) {
    throw conflict("eyfs area is in use");
  }
  const next = dropNamedMaster(await listEyfsAreas(campusId), existing.id);
  await writeSetting(campusId, EYFS_AREAS_KEY, next);
  return { id: existing.id, deleted: true };
}

export async function listEyfs(campusId: string, studentId?: string) {
  const [rows, areas] = await Promise.all([
    parseEyfsObservations(await readSetting(campusId, EYFS_KEY)),
    listEyfsAreas(campusId),
  ]);
  const scoped = studentId ? parentEyfs(rows, studentId) : rows;
  return attachEyfsAreas(scoped, areas);
}

export async function saveEyfsObservation(
  campusId: string,
  input: {
    id?: string;
    studentId: string;
    areaId: string;
    note: string;
    url?: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const areas = await listEyfsAreas(campusId);
  const next = upsertEyfsObservation(
    parseEyfsObservations(await readSetting(campusId, EYFS_KEY)),
    { ...input, studentId: student.id },
    areas,
  );
  await writeSetting(campusId, EYFS_KEY, next);
  const saved =
    next.find((row) => row.id === trim(input.id)) ??
    next.find(
      (row) =>
        row.studentId === student.id && row.note === plainText(input.note),
    ) ??
    next[next.length - 1]!;
  return attachEyfsAreas([saved], areas)[0]!;
}

export async function deleteEyfsObservation(campusId: string, id: string) {
  const next = removeEyfsObservation(
    parseEyfsObservations(await readSetting(campusId, EYFS_KEY)),
    id,
  );
  await writeSetting(campusId, EYFS_KEY, next);
  return { id: trim(id), deleted: true };
}
