import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, notFound, validationError } from "@/lib/errors";
import { collectPayment } from "@/lib/services/fees";

export type StudentPayInput = {
  amount: number;
  method: PaymentMethod;
  lineId?: string;
  invoiceId?: string;
  enrollmentId?: string;
  note?: string;
  reference?: string;
  paidAt?: string;
};

export type BulkPayRow = StudentPayInput & { studentId: string };

const METHOD_ALIASES: Record<string, PaymentMethod> = {
  CASH: PaymentMethod.CASH,
  CHEQUE: PaymentMethod.CHEQUE,
  DD: PaymentMethod.DD,
  BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
  NEFT: PaymentMethod.BANK_TRANSFER,
  RTGS: PaymentMethod.BANK_TRANSFER,
  ECS: PaymentMethod.BANK_TRANSFER,
  DIRECT_TO_BANK: PaymentMethod.BANK_TRANSFER,
  LOAN_GRAYQUEST: PaymentMethod.BANK_TRANSFER,
  UPI: PaymentMethod.UPI,
  QR: PaymentMethod.UPI,
  WALLET: PaymentMethod.UPI,
  CARD: PaymentMethod.CARD,
  DEBIT_CARD: PaymentMethod.CARD,
  CREDIT_CARD: PaymentMethod.CARD,
  GATEWAY: PaymentMethod.GATEWAY,
  ONLINE: PaymentMethod.GATEWAY,
  SCHOLARSHIP: PaymentMethod.SCHOLARSHIP,
  WAIVER: PaymentMethod.WAIVER,
  CREDIT_NOTE: PaymentMethod.WAIVER,
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  const key = trim(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const method = METHOD_ALIASES[key];
  if (!method) throw validationError({ method: "unknown" });
  return method;
}

export function parsePayAmount(value: unknown) {
  const amount = money(value);
  if (amount == null || amount <= 0) throw validationError({ amount: "must be positive" });
  return amount;
}

export function invoiceBalance(
  total: string | number,
  paid: string | number,
  discount: string | number = 0,
) {
  return Math.round((Number(total) - Number(discount) - Number(paid)) * 100) / 100;
}

export function assertPartialAmount(amount: number, due: number) {
  if (!(due > 0)) throw validationError({ amount: "nothing due" });
  if (!(amount < due)) throw validationError({ amount: "must be less than due" });
}

function firstLineId(rec: Record<string, unknown>) {
  if (Array.isArray(rec.line_ids) && rec.line_ids.length) {
    return trim(rec.line_ids[0]) || undefined;
  }
  return trim(rec.lineId ?? rec.line_id) || undefined;
}

function instrumentRef(rec: Record<string, unknown>) {
  const instrument =
    rec.instrument && typeof rec.instrument === "object"
      ? (rec.instrument as Record<string, unknown>)
      : {};
  return (
    trim(rec.reference) ||
    trim(instrument.cheque_no) ||
    trim(instrument.utn) ||
    trim(instrument.gateway) ||
    undefined
  );
}

export function parseStudentPay(value: unknown): StudentPayInput {
  if (!value || typeof value !== "object") throw validationError({ amount: "required" });
  const rec = value as Record<string, unknown>;
  const invoiceId = trim(rec.invoiceId ?? rec.invoice_id) || undefined;
  const enrollmentId = trim(rec.enrollmentId ?? rec.enrollment_id) || undefined;
  const note = trim(rec.note ?? rec.remark) || undefined;
  const paidAt = trim(rec.paidAt ?? rec.date) || undefined;
  return {
    amount: parsePayAmount(rec.amount),
    method: parsePaymentMethod(rec.method),
    lineId: firstLineId(rec),
    invoiceId,
    enrollmentId,
    note,
    reference: instrumentRef(rec),
    paidAt,
  };
}

function paymentList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const rec = value as { payments?: unknown; rows?: unknown };
    if (Array.isArray(rec.payments)) return rec.payments;
    if (Array.isArray(rec.rows)) return rec.rows;
  }
  throw validationError({ payments: "required" });
}

export function parseBulkPay(value: unknown): BulkPayRow[] {
  const list = paymentList(value);
  if (!list.length) throw validationError({ payments: "required" });
  if (list.length > 100) throw validationError({ payments: "max 100" });
  return list.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw validationError({ payments: `invalid row ${index}` });
    }
    const rec = row as Record<string, unknown>;
    const studentId = trim(rec.studentId ?? rec.student_id);
    if (!studentId) throw validationError({ studentId: "required" });
    return { studentId, ...parseStudentPay(row) };
  });
}

export function bulkIdempotencyKey(
  base: string,
  index: number,
  row: { studentId: string; invoiceId?: string },
) {
  const root = trim(base);
  if (!root) throw validationError({ "Idempotency-Key": "required" });
  return `${root}:${index}:${row.studentId}:${row.invoiceId ?? "auto"}`;
}

async function currentEnrollment(campusId: string, studentId: string, enrollmentId?: string) {
  if (enrollmentId) {
    const row = await prisma.studentEnrollment.findFirst({
      where: { id: enrollmentId, studentId, student: { campusId } },
      select: { id: true },
    });
    if (!row) throw validationError({ enrollmentId: "enrollment does not match invoice student" });
    return row;
  }
  const row = await prisma.studentEnrollment.findFirst({
    where: { studentId, isCurrent: true, student: { campusId } },
    select: { id: true },
  });
  if (!row) throw notFound("enrollment");
  return row;
}

async function payableInvoice(campusId: string, studentId: string, invoiceId?: string) {
  if (invoiceId) {
    const row = await prisma.feeInvoice.findFirst({
      where: { id: invoiceId, student: { id: studentId, campusId } },
      select: { id: true, total: true, paid: true, discount: true },
    });
    if (!row) throw notFound("invoice");
    return row;
  }
  const row = await prisma.feeInvoice.findFirst({
    where: {
      student: { id: studentId, campusId },
      status: { in: [InvoiceStatus.DUE, InvoiceStatus.PARTIAL] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, total: true, paid: true, discount: true },
  });
  if (!row) throw notFound("invoice");
  return row;
}

export async function payStudentFee(input: {
  campusId: string;
  userId: string;
  studentId: string;
  idempotencyKey: string;
  body: unknown;
  partial?: boolean;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const parsed = parseStudentPay(input.body);
  const enrollment = await currentEnrollment(
    input.campusId,
    student.id,
    parsed.enrollmentId,
  );
  const invoice = await payableInvoice(input.campusId, student.id, parsed.invoiceId);
  if (input.partial) {
    assertPartialAmount(
      parsed.amount,
      invoiceBalance(invoice.total.toString(), invoice.paid.toString(), invoice.discount.toString()),
    );
  }
  return collectPayment({
    campusId: input.campusId,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    body: {
      enrollmentId: enrollment.id,
      invoiceId: invoice.id,
      lineId: parsed.lineId,
      amount: parsed.amount,
      method: parsed.method,
      reference: parsed.reference,
      note: parsed.note,
      paidAt: parsed.paidAt,
    },
  });
}

function failMessage(error: unknown) {
  if (error instanceof HttpError) {
    const field = error.fields ? Object.values(error.fields)[0] : "";
    return field ? `${error.message}: ${field}` : error.message;
  }
  return error instanceof Error ? error.message : "collect failed";
}

export async function bulkPayFees(input: {
  campusId: string;
  userId: string;
  idempotencyKey: string;
  body: unknown;
}) {
  const rows = parseBulkPay(input.body);
  const payments: Array<{
    studentId: string;
    paymentId: string;
    receiptNo: string;
    replayed: boolean;
  }> = [];
  const errors: Array<{ index: number; studentId: string; message: string }> = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    try {
      const result = await payStudentFee({
        campusId: input.campusId,
        userId: input.userId,
        studentId: row.studentId,
        idempotencyKey: bulkIdempotencyKey(input.idempotencyKey, index, row),
        body: row,
      });
      payments.push({
        studentId: row.studentId,
        paymentId: result.payment.id,
        receiptNo: result.payment.receiptNo,
        replayed: result.replayed,
      });
    } catch (error) {
      errors.push({ index, studentId: row.studentId, message: failMessage(error) });
    }
  }
  return { paid: payments.length, total: rows.length, payments, errors };
}
