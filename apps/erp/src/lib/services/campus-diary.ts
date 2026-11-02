import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { allowedMediaUrl } from "@/lib/services/campus-files";

export const DIARY_KEY = "students.diary";
export const DIARY_KINDS = ["note", "photo", "voice", "pdf", "video"] as const;
export const DIARY_CHANNELS = ["student", "daycare"] as const;
export type DiaryKind = (typeof DIARY_KINDS)[number];
export type DiaryChannel = (typeof DIARY_CHANNELS)[number];

export type DiaryEntry = {
  id: string;
  studentId: string;
  kind: DiaryKind;
  channel: DiaryChannel;
  url: string;
  caption: string;
  at: string;
};

function diaryChannel(value: unknown): DiaryChannel {
  return trim(value) === "daycare" ? "daycare" : "student";
}

function trim(value: unknown) {
  return String(value ?? "").trim();
}



export function parseDiaryEntries(value: unknown): DiaryEntry[] {
  if (!Array.isArray(value)) return [];
  const out: DiaryEntry[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const studentId = trim(rec.studentId);
    const kind = trim(rec.kind) as DiaryKind;
    if (!id || !studentId || !DIARY_KINDS.includes(kind) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      studentId,
      kind,
      channel: diaryChannel(rec.channel),
      url: kind === "note" ? trim(rec.url) : allowedMediaUrl(rec.url),
      caption: trim(rec.caption),
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function upsertDiaryEntry(
  rows: DiaryEntry[],
  input: {
    id?: string;
    studentId: string;
    kind: string;
    channel?: string;
    url?: string;
    caption?: string;
    at?: string;
  },
) {
  const studentId = trim(input.studentId);
  const kind = trim(input.kind) as DiaryKind;
  if (!studentId) throw validationError({ studentId: "required" });
  if (!DIARY_KINDS.includes(kind)) throw validationError({ kind: "invalid" });
  const url = kind === "note" ? trim(input.url) : allowedMediaUrl(input.url);
  if (kind !== "note" && !url) {
    throw validationError({ url: "https or hosted file required" });
  }
  const id = trim(input.id) || crypto.randomUUID();
  const next: DiaryEntry = {
    id,
    studentId,
    kind,
    channel: diaryChannel(input.channel),
    url,
    caption: trim(input.caption),
    at: trim(input.at) || new Date().toISOString(),
  };
  return [...rows.filter((row) => row.id !== id), next];
}

export function parentDiary(rows: DiaryEntry[], studentId: string) {
  const id = trim(studentId);
  return rows
    .filter((row) => row.studentId === id)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function removeDiaryEntry(rows: DiaryEntry[], id: string) {
  const target = trim(id);
  if (!target) return rows;
  return rows.filter((row) => row.id !== target);
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

export async function listDiary(campusId: string, studentId?: string) {
  const rows = parseDiaryEntries(await readSetting(campusId, DIARY_KEY));
  return studentId ? parentDiary(rows, studentId) : rows;
}

export async function saveDiaryEntry(
  campusId: string,
  input: {
    id?: string;
    studentId: string;
    kind: string;
    channel?: string;
    url?: string;
    caption?: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  if (diaryChannel(input.channel) === "daycare") {
    const daycare = await prisma.studentDaycare.findFirst({
      where: { studentId: student.id, enrolled: true },
      select: { studentId: true },
    });
    if (!daycare) throw validationError({ channel: "student not in daycare" });
  }
  const next = upsertDiaryEntry(await listDiary(campusId), {
    ...input,
    studentId: student.id,
    channel: diaryChannel(input.channel),
  });
  await writeSetting(campusId, DIARY_KEY, next);
  return (
    next.find((row) => row.id === trim(input.id)) ??
    next.find(
      (row) =>
        row.studentId === student.id && row.caption === trim(input.caption),
    ) ??
    next[next.length - 1]!
  );
}

export async function deleteDiaryEntry(campusId: string, id: string) {
  const next = removeDiaryEntry(await listDiary(campusId), id);
  await writeSetting(campusId, DIARY_KEY, next);
  return { id: trim(id), deleted: true };
}
