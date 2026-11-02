import { validationError } from "@/lib/errors";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function isContraNote(note: string | null | undefined) {
  return trim(note).toLowerCase().startsWith("contra of");
}

export function isRefundOf(note: string | null | undefined, receiptNo: string) {
  const prefix = `refund of ${trim(receiptNo)}`.toLowerCase();
  return Boolean(trim(receiptNo)) && trim(note).toLowerCase().startsWith(prefix);
}

export function refundableAmount(original: number, alreadyRefunded: number[]) {
  const refunded = alreadyRefunded.reduce((sum, n) => sum + n, 0);
  const net = Number(original) - refunded;
  if (!(net > 0)) throw validationError({ amount: "already refunded" });
  return net;
}

export function requestedRefund(value: unknown, refundable: number) {
  if (value == null || value === "") return refundable;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw validationError({ amount: "must be positive" });
  if (n > refundable) throw validationError({ amount: "exceeds paid" });
  return n;
}
