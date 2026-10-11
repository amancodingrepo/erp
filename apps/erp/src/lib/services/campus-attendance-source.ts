import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ATTENDANCE_SOURCES_KEY = "attendance.sources";
export const ATTENDANCE_SOURCES = ["manual", "rfid", "gps"] as const;
const MAX_ROWS = 5000;

export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

export type AttendanceSourceRow = {
  key: string;
  source: AttendanceSource;
  at: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function parseAttendanceSource(value: unknown): AttendanceSource {
  const raw = trim(value).toLowerCase();
  if (raw === "rfid" || raw === "gps") return raw;
  return "manual";
}

export function sourceFingerprint(studentId: string, date: string, subjectId: string) {
  return `${trim(studentId)}|${trim(date)}|${trim(subjectId)}`;
}

export function parseAttendanceSources(value: unknown): AttendanceSourceRow[] {
  if (!Array.isArray(value)) return [];
  const out: AttendanceSourceRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const key = trim(rec.key);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      source: parseAttendanceSource(rec.source),
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function lookupAttendanceSource(
  rows: AttendanceSourceRow[],
  studentId: string,
  date: string,
  subjectId: string,
): AttendanceSource {
  const key = sourceFingerprint(studentId, date, subjectId);
  return rows.find((row) => row.key === key)?.source ?? "manual";
}

export function upsertAttendanceSources(
  rows: AttendanceSourceRow[],
  input: {
    date: string;
    subjectId: string;
    marked: Array<{ studentId: string; source?: unknown }>;
    cleared: string[];
    at?: string;
    max?: number;
  },
) {
  const at = input.at || new Date().toISOString();
  const drop = new Set(
    input.cleared.map((id) => sourceFingerprint(id, input.date, input.subjectId)),
  );
  for (const row of input.marked) {
    drop.add(sourceFingerprint(row.studentId, input.date, input.subjectId));
  }
  const kept = rows.filter((row) => !drop.has(row.key));
  const next = [
    ...kept,
    ...input.marked.map((row) => ({
      key: sourceFingerprint(row.studentId, input.date, input.subjectId),
      source: parseAttendanceSource(row.source),
      at,
    })),
  ];
  return next.sort((a, b) => a.at.localeCompare(b.at)).slice(-(input.max ?? MAX_ROWS));
}

export async function loadAttendanceSources(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: ATTENDANCE_SOURCES_KEY } },
  });
  return parseAttendanceSources(row?.value);
}

export async function persistAttendanceSources(
  campusId: string,
  input: {
    date: string;
    subjectId: string;
    marked: Array<{ studentId: string; source?: unknown }>;
    cleared: string[];
  },
) {
  if (!input.marked.length && !input.cleared.length) return;
  const current = await loadAttendanceSources(campusId);
  const next = upsertAttendanceSources(current, input);
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: ATTENDANCE_SOURCES_KEY } },
    update: { value: next as Prisma.InputJsonValue },
    create: {
      campusId,
      key: ATTENDANCE_SOURCES_KEY,
      value: next as Prisma.InputJsonValue,
    },
  });
}
