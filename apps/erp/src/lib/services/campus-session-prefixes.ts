import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const SESSION_PREFIXES_KEY = "academics.sessionPrefixes";
export const INVOICE_NOS_KEY = "fees.invoiceNos";

export type SessionPrefix = {
  sessionId: string;
  receiptPrefix: string;
  invoicePrefix: string;
  admissionPrefix: string;
  firstAdmissionNo: number;
};

export type InvoiceNoRow = { invoiceId: string; invoiceNo: string };

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

export function sanitizePrefix(value: unknown, fallback = "") {
  const raw = trim(value)
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
  return raw || fallback;
}

export function formatSessionNumber(
  prefix: string,
  sessionCode: string,
  seq: number,
  pad = 5,
) {
  const code = trim(sessionCode).replace(/\s+/g, "") || "YR";
  const n = Number.isFinite(seq) && seq > 0 ? Math.floor(seq) : 1;
  return `${sanitizePrefix(prefix, "NO")}-${code}-${String(n).padStart(pad, "0")}`;
}

export function nextSeqFromLast(
  last: string | null | undefined,
  stem: string,
  first = 1,
) {
  const start = Number.isFinite(first) && first > 0 ? Math.floor(first) : 1;
  const raw = trim(last);
  if (!raw || !raw.startsWith(stem)) return start;
  const n = Number(raw.slice(stem.length)) + 1;
  return Number.isFinite(n) && n > 0 ? n : start;
}

export function parseSessionPrefixes(value: unknown): SessionPrefix[] {
  if (!Array.isArray(value)) return [];
  const out: SessionPrefix[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const sessionId = trim(rec.sessionId);
    const first = Number(rec.firstAdmissionNo);
    if (!sessionId || seen.has(sessionId)) continue;
    seen.add(sessionId);
    out.push({
      sessionId,
      receiptPrefix: sanitizePrefix(rec.receiptPrefix),
      invoicePrefix: sanitizePrefix(rec.invoicePrefix),
      admissionPrefix: sanitizePrefix(rec.admissionPrefix),
      firstAdmissionNo: Number.isFinite(first) && first > 0 ? Math.floor(first) : 1,
    });
  }
  return out;
}

export function prefixForSession(rows: SessionPrefix[], sessionId: string): SessionPrefix {
  const id = trim(sessionId);
  return (
    rows.find((row) => row.sessionId === id) ?? {
      sessionId: id,
      receiptPrefix: "",
      invoicePrefix: "",
      admissionPrefix: "",
      firstAdmissionNo: 1,
    }
  );
}

export function upsertSessionPrefix(
  rows: SessionPrefix[],
  input: {
    sessionId: string;
    receiptPrefix?: string;
    invoicePrefix?: string;
    admissionPrefix?: string;
    firstAdmissionNo?: number;
  },
) {
  const sessionId = trim(input.sessionId);
  if (!sessionId) throw validationError({ sessionId: "required" });
  const previous = rows.find((row) => row.sessionId === sessionId);
  const firstRaw =
    input.firstAdmissionNo !== undefined
      ? Number(input.firstAdmissionNo)
      : (previous?.firstAdmissionNo ?? 1);
  if (!Number.isFinite(firstRaw) || firstRaw < 1 || firstRaw > 999999) {
    throw validationError({ firstAdmissionNo: "must be 1-999999" });
  }
  const next: SessionPrefix = {
    sessionId,
    receiptPrefix:
      input.receiptPrefix !== undefined
        ? sanitizePrefix(input.receiptPrefix)
        : (previous?.receiptPrefix ?? ""),
    invoicePrefix:
      input.invoicePrefix !== undefined
        ? sanitizePrefix(input.invoicePrefix)
        : (previous?.invoicePrefix ?? ""),
    admissionPrefix:
      input.admissionPrefix !== undefined
        ? sanitizePrefix(input.admissionPrefix)
        : (previous?.admissionPrefix ?? ""),
    firstAdmissionNo: Math.floor(firstRaw),
  };
  return [...rows.filter((row) => row.sessionId !== sessionId), next];
}

export function applicationNoFor(
  row: SessionPrefix | undefined,
  year: number,
  last?: string | null,
) {
  const prefix = sanitizePrefix(row?.admissionPrefix, "APP");
  const y = Number.isFinite(year) && year > 0 ? Math.floor(year) : new Date().getFullYear();
  const stem = `${prefix}-${y}-`;
  const seq = nextSeqFromLast(last, stem, row?.firstAdmissionNo ?? 1);
  return `${stem}${String(seq).padStart(4, "0")}`;
}

export function dropSessionPrefix(rows: SessionPrefix[], sessionId: string) {
  const key = trim(sessionId);
  if (!key) return rows;
  return rows.filter((row) => row.sessionId !== key);
}

export function getSessionPrefixRow(rows: SessionPrefix[], sessionId: string) {
  const key = trim(sessionId);
  if (!key) throw validationError({ sessionId: "required" });
  const row = rows.find((entry) => entry.sessionId === key);
  if (!row) throw notFound("session prefix");
  return row;
}

export async function saveSessionPrefixes(campusId: string, rows: SessionPrefix[]) {
  await writeSetting(campusId, SESSION_PREFIXES_KEY, rows);
  return rows;
}

export function attachSessionPrefixes<T extends { id: string }>(
  sessions: T[],
  rows: SessionPrefix[],
) {
  return sessions.map((session) => {
    const item = prefixForSession(rows, session.id);
    return {
      ...session,
      receiptPrefix: item.receiptPrefix,
      invoicePrefix: item.invoicePrefix,
      admissionPrefix: item.admissionPrefix,
      firstAdmissionNo: item.firstAdmissionNo,
    };
  });
}

export function parseInvoiceNos(value: unknown): InvoiceNoRow[] {
  if (!Array.isArray(value)) return [];
  const out: InvoiceNoRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const invoiceId = trim(rec.invoiceId);
    const invoiceNo = trim(rec.invoiceNo);
    if (!invoiceId || !invoiceNo || seen.has(invoiceId)) continue;
    seen.add(invoiceId);
    out.push({ invoiceId, invoiceNo });
  }
  return out;
}

export function upsertInvoiceNo(
  rows: InvoiceNoRow[],
  invoiceId: string,
  invoiceNo: string,
) {
  const id = trim(invoiceId);
  const no = trim(invoiceNo);
  if (!id) throw validationError({ invoiceId: "required" });
  if (!no) throw validationError({ invoiceNo: "required" });
  return [...rows.filter((row) => row.invoiceId !== id), { invoiceId: id, invoiceNo: no }];
}

export function attachInvoiceNos<T extends { id: string }>(
  invoices: T[],
  rows: InvoiceNoRow[],
) {
  const byId = new Map(rows.map((row) => [row.invoiceId, row.invoiceNo]));
  return invoices.map((row) => ({
    ...row,
    invoiceNo: byId.get(row.id) ?? "",
  }));
}

export async function listSessionPrefixes(campusId: string) {
  return parseSessionPrefixes(await readSetting(campusId, SESSION_PREFIXES_KEY));
}

export async function saveSessionPrefix(
  campusId: string,
  input: {
    sessionId: string;
    receiptPrefix?: string;
    invoicePrefix?: string;
    admissionPrefix?: string;
    firstAdmissionNo?: number;
  },
) {
  const session = await prisma.academicSession.findFirst({
    where: { id: input.sessionId, campusId },
    select: { id: true },
  });
  if (!session) throw notFound("session");
  const next = upsertSessionPrefix(await listSessionPrefixes(campusId), {
    ...input,
    sessionId: session.id,
  });
  await writeSetting(campusId, SESSION_PREFIXES_KEY, next);
  return prefixForSession(next, session.id);
}

export async function getSessionPrefix(campusId: string, sessionId: string) {
  const session = await prisma.academicSession.findFirst({
    where: { id: trim(sessionId), campusId },
    select: { id: true },
  });
  if (!session) throw notFound("session");
  return getSessionPrefixRow(await listSessionPrefixes(campusId), session.id);
}

export async function patchSessionPrefix(
  campusId: string,
  sessionId: string,
  patch: {
    receiptPrefix?: string;
    invoicePrefix?: string;
    admissionPrefix?: string;
    firstAdmissionNo?: number;
  },
) {
  await getSessionPrefix(campusId, sessionId);
  return saveSessionPrefix(campusId, { sessionId, ...patch });
}

export async function removeSessionPrefix(campusId: string, sessionId: string) {
  const existing = await getSessionPrefix(campusId, sessionId);
  await saveSessionPrefixes(
    campusId,
    dropSessionPrefix(await listSessionPrefixes(campusId), existing.sessionId),
  );
  return { id: existing.sessionId, deleted: true };
}

export async function listInvoiceNos(campusId: string) {
  return parseInvoiceNos(await readSetting(campusId, INVOICE_NOS_KEY));
}

export async function saveInvoiceNo(
  campusId: string,
  invoiceId: string,
  invoiceNo: string,
) {
  const next = upsertInvoiceNo(await listInvoiceNos(campusId), invoiceId, invoiceNo);
  await writeSetting(campusId, INVOICE_NOS_KEY, next);
  return next.find((row) => row.invoiceId === invoiceId)!;
}

export function sessionSeqKey(kind: "receipt" | "invoice", sessionId: string) {
  return kind === "receipt"
    ? `fees.receiptSeq.${sessionId}`
    : `fees.invoiceSeq.${sessionId}`;
}

/** Row-locked increment so parallel cashiers (and CI files) cannot reuse a receipt number. */
export async function bumpSessionSeq(
  tx: Prisma.TransactionClient,
  campusId: string,
  seqKey: string,
) {
  await tx.$executeRaw`
    INSERT INTO "Setting" (id, "campusId", key, value)
    VALUES (${crypto.randomUUID()}, ${campusId}, ${seqKey}, '0'::jsonb)
    ON CONFLICT ("campusId", key) DO NOTHING
  `;
  const rows = await tx.$queryRaw<Array<{ next: number | bigint | string }>>`
    UPDATE "Setting"
    SET value = to_jsonb(COALESCE((NULLIF(btrim(value #>> '{}'), ''))::int, 0) + 1)
    WHERE "campusId" = ${campusId} AND key = ${seqKey}
    RETURNING (value #>> '{}')::int AS next
  `;
  const next = Number(rows[0]?.next);
  if (!Number.isFinite(next) || next < 1) {
    throw validationError({ sequence: "failed" });
  }
  return next;
}

export async function allocateSessionNumber(
  tx: Prisma.TransactionClient,
  campusId: string,
  session: { id: string; name: string; code: string | null },
  kind: "receipt" | "invoice",
) {
  const next = await bumpSessionSeq(tx, campusId, sessionSeqKey(kind, session.id));
  const prefixRow = await tx.setting.findUnique({
    where: { campusId_key: { campusId, key: SESSION_PREFIXES_KEY } },
  });
  const prefixes = prefixForSession(
    parseSessionPrefixes(prefixRow?.value),
    session.id,
  );
  const prefix =
    kind === "receipt"
      ? prefixes.receiptPrefix || "RCP"
      : prefixes.invoicePrefix || "INV";
  return formatSessionNumber(prefix, session.code ?? session.name, next, 5);
}

export async function writeInvoiceNoTx(
  tx: Prisma.TransactionClient,
  campusId: string,
  invoiceId: string,
  invoiceNo: string,
) {
  const row = await tx.setting.findUnique({
    where: { campusId_key: { campusId, key: INVOICE_NOS_KEY } },
  });
  const next = upsertInvoiceNo(parseInvoiceNos(row?.value), invoiceId, invoiceNo);
  await tx.setting.upsert({
    where: { campusId_key: { campusId, key: INVOICE_NOS_KEY } },
    create: { campusId, key: INVOICE_NOS_KEY, value: next },
    update: { value: next },
  });
  return invoiceNo;
}
