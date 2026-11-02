import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { cancelPayment } from "@/lib/services/fees";

export const CHEQUE_BOUNCES_KEY = "fees.chequeBounces";

export type ChequeBounce = {
  paymentId: string;
  receiptNo: string;
  reason: string;
  at: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function assertChequePayment(method: string) {
  if (method !== PaymentMethod.CHEQUE && method !== "CHEQUE") {
    throw validationError({ method: "cheque only" });
  }
}

export function parseChequeBounces(value: unknown): ChequeBounce[] {
  if (!Array.isArray(value)) return [];
  const out: ChequeBounce[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const paymentId = trim(rec.paymentId);
    const receiptNo = trim(rec.receiptNo);
    if (!paymentId || !receiptNo || seen.has(paymentId)) continue;
    seen.add(paymentId);
    out.push({
      paymentId,
      receiptNo,
      reason: trim(rec.reason),
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

export function recordChequeBounce(
  rows: ChequeBounce[],
  input: { paymentId: string; receiptNo: string; reason: string; at?: string },
) {
  const paymentId = trim(input.paymentId);
  const receiptNo = trim(input.receiptNo);
  if (!paymentId) throw validationError({ paymentId: "required" });
  if (!receiptNo) throw validationError({ receiptNo: "required" });
  const next: ChequeBounce = {
    paymentId,
    receiptNo,
    reason: trim(input.reason) || "bounced",
    at: trim(input.at) || new Date().toISOString(),
  };
  return [...rows.filter((row) => row.paymentId !== paymentId), next];
}

export async function bounceCheque(input: {
  campusId: string;
  paymentId: string;
  reason: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      invoice: { student: { campusId: input.campusId } },
    },
    select: { id: true, method: true, receiptNo: true },
  });
  if (!payment) throw notFound("payment");
  assertChequePayment(payment.method);
  const result = await cancelPayment({
    campusId: input.campusId,
    paymentId: payment.id,
    reason: `cheque bounce: ${trim(input.reason) || "bounced"}`,
  });
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId: input.campusId, key: CHEQUE_BOUNCES_KEY } },
  });
  const next = recordChequeBounce(parseChequeBounces(row?.value), {
    paymentId: payment.id,
    receiptNo: payment.receiptNo,
    reason: trim(input.reason) || "bounced",
  });
  await prisma.setting.upsert({
    where: { campusId_key: { campusId: input.campusId, key: CHEQUE_BOUNCES_KEY } },
    update: { value: next as Prisma.InputJsonValue },
    create: {
      campusId: input.campusId,
      key: CHEQUE_BOUNCES_KEY,
      value: next as Prisma.InputJsonValue,
    },
  });
  return { ...result, bounce: next.find((item) => item.paymentId === payment.id) };
}
