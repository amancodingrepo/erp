import { Prisma } from "@prisma/client";
import { classInCampus, parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";

export const RESULT_DATES_KEY = "academics.resultDates";
export const OPENING_DATES_KEY = "academics.openingDates";

export type NamedClassDate = {
  classId: string;
  name: string;
  date: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function isoDate(value: unknown) {
  const raw = trim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = parseDateOnly(raw);
  if (Number.isNaN(parsed.getTime())) return "";
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

export function parseNamedClassDates(value: unknown): NamedClassDate[] {
  if (!Array.isArray(value)) return [];
  const out: NamedClassDate[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const classId = trim(rec.classId);
    const name = trim(rec.name);
    const date = isoDate(rec.date);
    const key = `${classId}\0${name.toLowerCase()}`;
    if (!classId || !name || !date || seen.has(key)) continue;
    seen.add(key);
    out.push({ classId, name, date });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function upsertNamedClassDate(
  rows: NamedClassDate[],
  input: { classId: string; name: string; date: string },
) {
  const classId = trim(input.classId);
  const name = trim(input.name);
  const date = isoDate(input.date);
  if (!classId) throw validationError({ classId: "required" });
  if (!name) throw validationError({ name: "required" });
  if (!date) throw validationError({ date: "YYYY-MM-DD" });
  const next: NamedClassDate = { classId, name, date };
  return parseNamedClassDates([
    ...rows.filter(
      (row) =>
        !(row.classId === classId && row.name.toLowerCase() === name.toLowerCase()),
    ),
    next,
  ]);
}

export function datesForClass(rows: NamedClassDate[], classId: string) {
  const id = trim(classId);
  return rows
    .filter((row) => row.classId === id)
    .map((row) => ({ name: row.name, date: row.date }));
}

export function attachClassDates<T extends { id: string }>(
  classes: T[],
  resultDates: NamedClassDate[],
  openingDates: NamedClassDate[],
) {
  return classes.map((row) => ({
    ...row,
    resultDates: datesForClass(resultDates, row.id),
    openingDates: datesForClass(openingDates, row.id),
  }));
}

export async function listResultDates(campusId: string) {
  return parseNamedClassDates(await readSetting(campusId, RESULT_DATES_KEY));
}

export async function listOpeningDates(campusId: string) {
  return parseNamedClassDates(await readSetting(campusId, OPENING_DATES_KEY));
}

export async function saveResultDate(
  campusId: string,
  classId: string,
  input: { name: string; date: string },
) {
  await classInCampus(campusId, classId);
  const next = upsertNamedClassDate(await listResultDates(campusId), {
    ...input,
    classId,
  });
  await writeSetting(campusId, RESULT_DATES_KEY, next);
  return datesForClass(next, classId);
}

export async function saveOpeningDate(
  campusId: string,
  classId: string,
  input: { name: string; date: string },
) {
  await classInCampus(campusId, classId);
  const next = upsertNamedClassDate(await listOpeningDates(campusId), {
    ...input,
    classId,
  });
  await writeSetting(campusId, OPENING_DATES_KEY, next);
  return datesForClass(next, classId);
}
