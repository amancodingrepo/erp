import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, validationError } from "@/lib/errors";

export const ATTENDANCE_IDEMPOTENCY_KEY = "attendance.idempotency";
const MAX_ROWS = 200;

export type IdempotencyRecord = {
  key: string;
  fingerprint: string;
  result: unknown;
  at: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((row) => stableStringify(row)).join(",")}]`;
  }
  const rec = value as Record<string, unknown>;
  return `{${Object.keys(rec)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(rec[key])}`)
    .join(",")}}`;
}

export function requireIdempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) throw validationError({ "Idempotency-Key": "required" });
  return key;
}

export function fingerprintBody(body: unknown) {
  return createHash("sha256").update(stableStringify(body)).digest("hex");
}

export function parseIdempotencyRecords(value: unknown): IdempotencyRecord[] {
  if (!Array.isArray(value)) return [];
  const out: IdempotencyRecord[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const key = trim(rec.key);
    const fingerprint = trim(rec.fingerprint);
    if (!key || !fingerprint || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      fingerprint,
      result: rec.result,
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function lookupIdempotency(
  rows: IdempotencyRecord[],
  key: string,
  fingerprint: string,
): { replay: unknown } | { conflict: true } | { miss: true } {
  const found = rows.find((row) => row.key === key);
  if (!found) return { miss: true };
  if (found.fingerprint !== fingerprint) return { conflict: true };
  return { replay: found.result };
}

export function storeIdempotencyRecord(
  rows: IdempotencyRecord[],
  next: IdempotencyRecord,
  max = MAX_ROWS,
) {
  const kept = rows.filter((row) => row.key !== next.key);
  return [...kept, next]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-max);
}

export async function withAttendanceIdempotency<T>(
  campusId: string,
  request: Request,
  body: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const key = requireIdempotencyKey(request);
  const fingerprint = fingerprintBody(body);
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: ATTENDANCE_IDEMPOTENCY_KEY } },
  });
  const current = parseIdempotencyRecords(row?.value);
  const hit = lookupIdempotency(current, key, fingerprint);
  if ("conflict" in hit) {
    throw conflict("idempotency key reused with a different body");
  }
  if ("replay" in hit) return hit.replay as T;
  const result = await run();
  const next = storeIdempotencyRecord(current, {
    key,
    fingerprint,
    result,
    at: new Date().toISOString(),
  });
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: ATTENDANCE_IDEMPOTENCY_KEY } },
    update: { value: next as Prisma.InputJsonValue },
    create: {
      campusId,
      key: ATTENDANCE_IDEMPOTENCY_KEY,
      value: next as Prisma.InputJsonValue,
    },
  });
  return result;
}
