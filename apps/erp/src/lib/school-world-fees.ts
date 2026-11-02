import { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { HttpError } from "./errors";
import { feeStatus } from "./school-world-shape";

export function money(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return Number.NaN;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function parseDay(value: unknown) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return new Date(`${text}T00:00:00.000Z`);
}

export function dayText(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function paymentMethodToErp(value: unknown): PaymentMethod {
  const key = String(value ?? "").trim().toLowerCase();
  const map: Record<string, PaymentMethod> = {
    cash: PaymentMethod.CASH,
    cheque: PaymentMethod.CHEQUE,
    check: PaymentMethod.CHEQUE,
    online: PaymentMethod.GATEWAY,
    card: PaymentMethod.CARD,
    "bank transfer": PaymentMethod.BANK_TRANSFER,
    upi: PaymentMethod.UPI,
    dd: PaymentMethod.DD,
    gateway: PaymentMethod.GATEWAY,
    scholarship: PaymentMethod.SCHOLARSHIP,
    waiver: PaymentMethod.WAIVER,
  };
  const method = map[key];
  if (!method) {
    throw new HttpError(400, "validation_error", "Choose a supported payment method.");
  }
  return method;
}

export function invoiceStatus(total: number, paid: number): InvoiceStatus {
  if (paid <= 0.001) return InvoiceStatus.DUE;
  if (paid + 0.001 >= total) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIAL;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const feeLineInclude = {
  invoice: {
    include: {
      master: true,
      session: true,
      payments: true,
      student: {
        include: {
          guardians: { include: { guardian: true } },
          enrollments: { where: { isCurrent: true }, include: { class: true, section: true }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.FeeInvoiceLineInclude;

type FeeLine = Prisma.FeeInvoiceLineGetPayload<{ include: typeof feeLineInclude }>;

export function schoolFee(line: FeeLine) {
  const amount = money(line.amount);
  const amountPaid = money(line.paid);
  const metadata = asRecord(line.metadata);
  const student = line.invoice.student;
  const history = Array.isArray(metadata.paymentHistory) ? metadata.paymentHistory : [];
  const latest = [...history].reverse().find((entry) => money(asRecord(entry).amountPaid) > 0);
  const latestRecord = asRecord(latest);
  return {
    id: line.id,
    academicYear: line.invoice.session.name,
    feeName: line.description,
    installmentName: line.installmentName,
    amount,
    amountPaid,
    dueDate: line.dueDate ?? line.invoice.master?.dueDate ?? null,
    paidAt: latestRecord.paymentDate ?? null,
    status: feeStatus(amount, amountPaid),
    reference: line.reference ?? line.invoice.reference ?? "",
    studentCode: student.admissionNo,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
    className: student.enrollments[0]?.class.name ?? "",
    section: student.enrollments[0]?.section.name ?? "",
    metadata: {
      ...metadata,
      feeTemplateId: metadata.feeTemplateId ?? line.invoice.masterId,
      erpInvoiceId: line.invoice.id,
      installmentName: line.installmentName,
    },
  };
}

export const defaultReceiptSettings = {
  showSchoolLogo: true,
  showSchoolName: true,
  showSchoolAddress: true,
  showSchoolPhone: true,
  showSchoolEmail: true,
  showStudentName: true,
  showStudentCode: true,
  showClassSection: true,
  showAcademicYear: true,
  showParentName: true,
  showFeeBreakdown: true,
  showPaymentMethod: true,
  showReceiptNumber: true,
  showPaymentReference: true,
  showPaidAmount: true,
  showBalance: true,
  showSignatureLine: true,
  pageOrientation: "portrait",
  headerText: "FEE RECEIPT",
  footerText: "Thank you for your payment.",
};
