import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { buildSimplePdf } from "@/lib/pdf/simple";

export const DEPOSIT_SLIPS_KEY = "fees.depositSlips";
export const DEPOSITABLE_METHODS = new Set<string>([
  PaymentMethod.CASH,
  PaymentMethod.CHEQUE,
  PaymentMethod.DD,
]);

export type DepositPayment = {
  id: string;
  method: string;
  amount: number;
  cancelled: boolean;
  receiptNo: string;
};

export type DepositSlip = {
  id: string;
  slipNo: string;
  depositedAt: string;
  bankName: string;
  accountRef: string;
  paymentIds: string[];
  receiptNos: string[];
  amount: number;
  note: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function isoDate(value: unknown) {
  const raw = trim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
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

export function assertDepositable(method: string) {
  if (!DEPOSITABLE_METHODS.has(method)) {
    throw validationError({ method: "cash, cheque, or DD only" });
  }
}

export function parseDepositSlips(value: unknown): DepositSlip[] {
  if (!Array.isArray(value)) return [];
  const out: DepositSlip[] = [];
  const seen = new Set<string>();
  const claimed = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id);
    const slipNo = trim(rec.slipNo);
    const depositedAt = isoDate(rec.depositedAt);
    const bankName = trim(rec.bankName);
    const paymentIds = Array.isArray(rec.paymentIds)
      ? rec.paymentIds.map((item) => trim(item)).filter(Boolean)
      : [];
    const receiptNos = Array.isArray(rec.receiptNos)
      ? rec.receiptNos.map((item) => trim(item)).filter(Boolean)
      : [];
    if (!id || !slipNo || !depositedAt || !bankName || !paymentIds.length) continue;
    if (seen.has(slipNo) || paymentIds.some((pid) => claimed.has(pid))) continue;
    seen.add(slipNo);
    for (const pid of paymentIds) claimed.add(pid);
    out.push({
      id,
      slipNo,
      depositedAt,
      bankName,
      accountRef: trim(rec.accountRef),
      paymentIds,
      receiptNos,
      amount: money(rec.amount),
      note: trim(rec.note),
    });
  }
  return out;
}

export function patchDepositSlip(
  rows: DepositSlip[],
  id: string,
  patch: {
    depositedAt?: string;
    bankName?: string;
    accountRef?: string;
    note?: string;
  },
) {
  const key = trim(id);
  const existing = rows.find((row) => row.id === key || row.slipNo === key);
  if (!existing) throw notFound("deposit slip");
  const depositedAt =
    patch.depositedAt !== undefined ? isoDate(patch.depositedAt) : existing.depositedAt;
  if (patch.depositedAt !== undefined && !depositedAt) {
    throw validationError({ depositedAt: "invalid" });
  }
  const bankName =
    patch.bankName !== undefined ? trim(patch.bankName) : existing.bankName;
  if (!bankName) throw validationError({ bankName: "required" });
  const next: DepositSlip = {
    ...existing,
    depositedAt,
    bankName,
    accountRef:
      patch.accountRef !== undefined ? trim(patch.accountRef) : existing.accountRef,
    note: patch.note !== undefined ? trim(patch.note) : existing.note,
  };
  return rows.map((row) => (row.id === existing.id ? next : row));
}

export function dropDepositSlip(rows: DepositSlip[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key && row.slipNo !== key);
  if (next.length === rows.length) throw notFound("deposit slip");
  return next;
}

export function claimedPaymentIds(rows: DepositSlip[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const id of row.paymentIds) ids.add(id);
  }
  return ids;
}

export function buildDepositSlip(
  rows: DepositSlip[],
  input: {
    id?: string;
    slipNo?: string;
    depositedAt: string;
    bankName: string;
    accountRef?: string;
    note?: string;
    payments: DepositPayment[];
  },
) {
  const depositedAt = isoDate(input.depositedAt);
  const bankName = trim(input.bankName);
  if (!depositedAt) throw validationError({ depositedAt: "invalid" });
  if (!bankName) throw validationError({ bankName: "required" });
  if (!input.payments.length) throw validationError({ payments: "required" });
  const claimed = claimedPaymentIds(rows);
  const paymentIds: string[] = [];
  const receiptNos: string[] = [];
  let amount = 0;
  const seen = new Set<string>();
  for (const payment of input.payments) {
    const id = trim(payment.id);
    if (!id || seen.has(id)) continue;
    if (payment.cancelled) throw validationError({ payments: "cancelled" });
    assertDepositable(payment.method);
    if (claimed.has(id)) throw validationError({ payments: "already deposited" });
    seen.add(id);
    paymentIds.push(id);
    receiptNos.push(trim(payment.receiptNo));
    amount += money(payment.amount);
  }
  if (!paymentIds.length) throw validationError({ payments: "required" });
  amount = Math.round(amount * 100) / 100;
  const existingNos = new Set(rows.map((row) => row.slipNo.toLowerCase()));
  let slipNo = trim(input.slipNo);
  if (!slipNo) {
    const prefix = `DS-${depositedAt.replace(/-/g, "")}`;
    let n = rows.filter((row) => row.slipNo.startsWith(prefix)).length + 1;
    slipNo = `${prefix}-${String(n).padStart(3, "0")}`;
    while (existingNos.has(slipNo.toLowerCase())) {
      n += 1;
      slipNo = `${prefix}-${String(n).padStart(3, "0")}`;
    }
  }
  if (existingNos.has(slipNo.toLowerCase())) {
    throw validationError({ slipNo: "already exists" });
  }
  const next: DepositSlip = {
    id: trim(input.id) || crypto.randomUUID(),
    slipNo,
    depositedAt,
    bankName,
    accountRef: trim(input.accountRef),
    paymentIds,
    receiptNos,
    amount,
    note: trim(input.note),
  };
  return [...rows, next];
}

export function buildDepositSlipPdf(slip: DepositSlip, campusName: string) {
  return buildSimplePdf([
    campusName,
    "BANK DEPOSIT SLIP",
    `Slip ${slip.slipNo}`,
    `Date ${slip.depositedAt}`,
    `Bank ${slip.bankName}${slip.accountRef ? `  A/c ${slip.accountRef}` : ""}`,
    `Amount INR ${slip.amount.toFixed(2)}`,
    `Receipts ${slip.receiptNos.join(", ") || slip.paymentIds.join(", ")}`,
    slip.note ? `Note ${slip.note}` : "",
  ]);
}

export async function listDepositSlips(campusId: string) {
  return parseDepositSlips(await readSetting(campusId, DEPOSIT_SLIPS_KEY));
}

export async function listUndepositedPayments(campusId: string) {
  const claimed = claimedPaymentIds(await listDepositSlips(campusId));
  const payments = await prisma.payment.findMany({
    where: {
      cancelledAt: null,
      method: { in: [PaymentMethod.CASH, PaymentMethod.CHEQUE, PaymentMethod.DD] },
      invoice: { student: { campusId } },
    },
    select: {
      id: true,
      receiptNo: true,
      amount: true,
      method: true,
      paidAt: true,
      invoice: {
        select: {
          student: { select: { firstName: true, lastName: true, admissionNo: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 200,
  });
  return payments
    .filter((row) => !claimed.has(row.id))
    .map((row) => ({
      id: row.id,
      receiptNo: row.receiptNo,
      amount: Number(row.amount),
      method: row.method,
      paidAt: row.paidAt.toISOString().slice(0, 10),
      studentName: [row.invoice.student.firstName, row.invoice.student.lastName]
        .filter(Boolean)
        .join(" "),
      admissionNo: row.invoice.student.admissionNo,
    }));
}

export async function createDepositSlip(
  campusId: string,
  input: {
    slipNo?: string;
    depositedAt: string;
    bankName: string;
    accountRef?: string;
    note?: string;
    paymentIds: string[];
  },
) {
  const ids = [...new Set(input.paymentIds.map((id) => trim(id)).filter(Boolean))];
  if (!ids.length) throw validationError({ paymentIds: "required" });
  const payments = await prisma.payment.findMany({
    where: {
      id: { in: ids },
      invoice: { student: { campusId } },
    },
    select: {
      id: true,
      method: true,
      amount: true,
      cancelledAt: true,
      receiptNo: true,
    },
  });
  if (payments.length !== ids.length) throw notFound("payment");
  const existing = await listDepositSlips(campusId);
  const next = buildDepositSlip(existing, {
    slipNo: input.slipNo,
    depositedAt: input.depositedAt,
    bankName: input.bankName,
    accountRef: input.accountRef,
    note: input.note,
    payments: payments.map((row) => ({
      id: row.id,
      method: row.method,
      amount: Number(row.amount),
      cancelled: Boolean(row.cancelledAt),
      receiptNo: row.receiptNo,
    })),
  });
  await writeSetting(campusId, DEPOSIT_SLIPS_KEY, next);
  return next[next.length - 1]!;
}

export async function getDepositSlip(campusId: string, slipId: string) {
  const slip = (await listDepositSlips(campusId)).find(
    (row) => row.id === slipId || row.slipNo === slipId,
  );
  if (!slip) throw notFound("deposit slip");
  return slip;
}

export async function updateDepositSlip(
  campusId: string,
  slipId: string,
  patch: {
    depositedAt?: string;
    bankName?: string;
    accountRef?: string;
    note?: string;
  },
) {
  const existing = await listDepositSlips(campusId);
  const next = patchDepositSlip(existing, slipId, patch);
  await writeSetting(campusId, DEPOSIT_SLIPS_KEY, next);
  return next.find((row) => row.id === trim(slipId) || row.slipNo === trim(slipId))!;
}

export async function removeDepositSlip(campusId: string, slipId: string) {
  const next = dropDepositSlip(await listDepositSlips(campusId), slipId);
  await writeSetting(campusId, DEPOSIT_SLIPS_KEY, next);
  return { id: trim(slipId), deleted: true };
}

export async function getDepositSlipPdf(campusId: string, slipId: string) {
  const slip = (await listDepositSlips(campusId)).find(
    (row) => row.id === slipId || row.slipNo === slipId,
  );
  if (!slip) throw notFound("deposit slip");
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { name: true },
  });
  return {
    slip,
    pdf: buildDepositSlipPdf(slip, campus?.name ?? "Campus"),
  };
}
