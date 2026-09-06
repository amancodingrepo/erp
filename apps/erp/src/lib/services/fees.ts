import {
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  type FeeInvoiceLine,
} from "@prisma/client";
import { z } from "zod";
import { classInCampus, currentSessionId, sessionInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec, moneyMin, ZERO } from "@/lib/money";
import type { AuthPrincipal } from "@/lib/permissions";
import { campusLetterhead } from "@/lib/letterhead";
import { buildReceiptPdf, type ReceiptView } from "@/lib/pdf/receipt";

export const collectSchema = z.object({
  enrollmentId: z.string().min(1),
  invoiceId: z.string().min(1),
  lineId: z.string().optional(),
  amount: z.union([z.number(), z.string()]),
  discount: z.union([z.number(), z.string()]).optional(),
  fine: z.union([z.number(), z.string()]).optional(),
  discountId: z.string().optional(),
  waiveFine: z.boolean().optional(),
  waiveReason: z.string().optional(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

export type CollectInput = z.infer<typeof collectSchema>;

function lineDue(line: Pick<FeeInvoiceLine, "amount" | "paid" | "discount" | "fine">) {
  return dec(line.amount).plus(line.fine).minus(line.discount).minus(line.paid);
}

function statusFor(
  total: Prisma.Decimal,
  paid: Prisma.Decimal,
  discount: Prisma.Decimal,
) {
  // Fine is collected alongside the payment; it does not keep the invoice open.
  const due = total.minus(discount).minus(paid);
  if (due.lte(0)) return InvoiceStatus.PAID;
  if (paid.gt(0)) return InvoiceStatus.PARTIAL;
  return InvoiceStatus.DUE;
}

async function nextReceiptNo(
  tx: Prisma.TransactionClient,
  campusId: string,
  session: { id: string; name: string; code: string | null },
) {
  const key = `fees.receiptSeq.${session.id}`;
  const row = await tx.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  const last = Number(row?.value ?? 0) || 0;
  const next = last + 1;
  await tx.setting.upsert({
    where: { campusId_key: { campusId, key } },
    create: { campusId, key, value: next },
    update: { value: next },
  });
  const code = (session.code ?? session.name).replace(/\s+/g, "");
  return `RCP-${code}-${String(next).padStart(5, "0")}`;
}

export async function assignMasterToClass(input: {
  campusId: string;
  masterId: string;
  classId: string;
  sessionId?: string;
  sectionId?: string;
}) {
  const master = await prisma.feeMaster.findFirst({
    where: { id: input.masterId, campusId: input.campusId },
    include: { lines: { include: { feeType: true } }, session: true },
  });
  if (!master) throw notFound("fee master");
  await classInCampus(input.campusId, input.classId);
  const sessionId =
    input.sessionId ??
    master.sessionId ??
    (await currentSessionId({ campusId: input.campusId } as AuthPrincipal));
  if (!sessionId) throw validationError({ sessionId: "session required" });
  await sessionInCampus(input.campusId, sessionId);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: input.classId,
      isCurrent: true,
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      student: { campusId: input.campusId, status: "ACTIVE" },
    },
  });
  const total = master.lines.reduce((sum, line) => sum.plus(line.amount), ZERO);
  const createdIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const enrollment of enrollments) {
      const existing = await tx.feeInvoice.findFirst({
        where: {
          studentId: enrollment.studentId,
          sessionId,
          masterId: master.id,
        },
      });
      if (existing) continue;
      const invoice = await tx.feeInvoice.create({
        data: {
          studentId: enrollment.studentId,
          sessionId,
          masterId: master.id,
          status: InvoiceStatus.DUE,
          total,
          lines: {
            create: master.lines.map((line) => ({
              feeTypeId: line.feeTypeId,
              description: line.feeType.name,
              amount: line.amount,
              dueDate: master.dueDate,
            })),
          },
        },
      });
      createdIds.push(invoice.id);
    }
  });
  return { created: createdIds.length, invoiceIds: createdIds, total: total.toFixed(2) };
}

function applyDiscountAmount(
  kind: string,
  base: Prisma.Decimal,
  discount: { percentage: Prisma.Decimal | null; amount: Prisma.Decimal | null },
) {
  if (kind === "percent") {
    return base.mul(dec(discount.percentage)).div(100);
  }
  return dec(discount.amount);
}

function daysLate(dueDate: Date | null, paidAt: Date) {
  if (!dueDate) return 0;
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const pay = Date.UTC(paidAt.getUTCFullYear(), paidAt.getUTCMonth(), paidAt.getUTCDate());
  return Math.max(0, Math.floor((pay - due) / 86400000));
}

async function computedFine(
  campusId: string,
  dueDate: Date | null,
  remaining: Prisma.Decimal,
  paidAt: Date,
) {
  if (remaining.lte(0) || !dueDate) return ZERO;
  const late = daysLate(dueDate, paidAt);
  if (late <= 0) return ZERO;
  const rules = await prisma.fineRule.findMany({
    where: { campusId, afterDays: { lte: late } },
    orderBy: { afterDays: "desc" },
    take: 1,
  });
  const rule = rules[0];
  if (!rule) return ZERO;
  if (rule.kind === "percent") return remaining.mul(rule.value).div(100);
  return dec(rule.value);
}

async function replayInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.feeInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lines: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] }, payments: true },
  });
  for (const line of invoice.lines) {
    await tx.feeInvoiceLine.update({
      where: { id: line.id },
      data: { paid: ZERO, discount: ZERO, fine: ZERO },
    });
  }
  const live = invoice.payments
    .filter((p) => !p.cancelledAt && dec(p.amount).gt(0))
    .sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime());

  let lines = invoice.lines.map((l) => ({
    ...l,
    paid: ZERO,
    discount: ZERO,
    fine: ZERO,
  }));

  for (const payment of live) {
    let remaining = dec(payment.amount);
    const discount = dec(payment.discount);
    const fine = dec(payment.fine);
    const targets = payment.lineId
      ? lines.filter((l) => l.id === payment.lineId)
      : lines;
    if (!targets.length) throw validationError({ lineId: "line not on invoice" });
    targets[0].discount = targets[0].discount.plus(discount);
    targets[0].fine = targets[0].fine.plus(fine);
    for (const line of targets) {
      if (remaining.lte(0)) break;
      const due = dec(line.amount).minus(line.discount).minus(line.paid);
      if (due.lte(0)) continue;
      const take = moneyMin(remaining, due);
      line.paid = line.paid.plus(take);
      remaining = remaining.minus(take);
    }
    if (remaining.gt(0)) {
      throw validationError({ amount: "exceeds invoice balance" });
    }
  }

  for (const line of lines) {
    await tx.feeInvoiceLine.update({
      where: { id: line.id },
      data: { paid: line.paid, discount: line.discount, fine: line.fine },
    });
  }
  const paid = lines.reduce((sum, l) => sum.plus(l.paid), ZERO);
  const discount = lines.reduce((sum, l) => sum.plus(l.discount), ZERO);
  const fine = lines.reduce((sum, l) => sum.plus(l.fine), ZERO);
  return tx.feeInvoice.update({
    where: { id: invoiceId },
    data: {
      paid,
      discount,
      fine,
      status: statusFor(dec(invoice.total), paid, discount),
    },
    include: { lines: true, payments: true, student: true },
  });
}

export async function collectPayment(input: {
  campusId: string;
  userId: string;
  idempotencyKey: string;
  body: CollectInput;
}) {
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { invoice: { include: { lines: true, student: true } } },
  });
  if (existing) {
    if (existing.invoice.student.campusId !== input.campusId) {
      throw notFound("payment");
    }
    return { replayed: true, payment: existing, invoice: existing.invoice };
  }

  const amount = dec(input.body.amount);
  if (amount.lte(0)) throw validationError({ amount: "must be positive" });

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: input.body.invoiceId, student: { campusId: input.campusId } },
    include: {
      lines: true,
      student: true,
      master: true,
    },
  });
  if (!invoice) throw notFound("invoice");
  const session = await prisma.academicSession.findFirst({
    where: { id: invoice.sessionId, campusId: input.campusId },
  });
  if (!session) throw notFound("session");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      id: input.body.enrollmentId,
      studentId: invoice.studentId,
      student: { campusId: input.campusId },
    },
  });
  if (!enrollment) {
    throw validationError({ enrollmentId: "enrollment does not match invoice student" });
  }

  const paidAt = input.body.paidAt ? new Date(input.body.paidAt) : new Date();
  let discount = dec(input.body.discount);
  if (input.body.discountId) {
    const named = await prisma.feeDiscount.findFirst({
      where: { id: input.body.discountId, campusId: input.campusId },
    });
    if (!named) throw notFound("discount");
    if (discount.eq(0)) {
      discount = applyDiscountAmount(named.kind, amount, named);
    }
  }

  const targetLine = input.body.lineId
    ? invoice.lines.find((l) => l.id === input.body.lineId)
    : invoice.lines[0];
  if (input.body.lineId && !targetLine) throw notFound("invoice line");

  let fine = dec(input.body.fine);
  if (input.body.waiveFine) {
    if (!input.body.waiveReason) {
      throw validationError({ waiveReason: "required to waive fine" });
    }
    fine = ZERO;
  } else if (input.body.fine === undefined) {
    fine = await computedFine(
      input.campusId,
      targetLine?.dueDate ?? invoice.master?.dueDate ?? null,
      lineDue(targetLine ?? invoice.lines[0]),
      paidAt,
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const receiptNo = await nextReceiptNo(tx, input.campusId, session);
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          discount,
          fine,
          method: input.body.method,
          reference: input.body.reference,
          idempotencyKey: input.idempotencyKey,
          lineId: input.body.lineId,
          receiptNo,
          note: input.body.note,
          paidAt,
          collectedBy: input.userId,
        },
      });
      const updated = await replayInvoice(tx, invoice.id);
      return { payment, invoice: updated };
    });
    return { replayed: false, ...result };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { invoice: { include: { lines: true, student: true } } },
      });
      if (raced) {
        return { replayed: true, payment: raced, invoice: raced.invoice };
      }
    }
    throw error;
  }
}

export async function cancelPayment(input: {
  campusId: string;
  paymentId: string;
  reason: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { id: input.paymentId, invoice: { student: { campusId: input.campusId } } },
    include: { invoice: { include: { student: true } } },
  });
  if (!payment) throw notFound("payment");
  if (payment.cancelledAt) throw conflict("payment already cancelled");
  if (dec(payment.amount).lte(0)) throw conflict("cannot cancel a contra row");
  const session = await prisma.academicSession.findFirst({
    where: { id: payment.invoice.sessionId, campusId: input.campusId },
  });
  if (!session) throw notFound("session");

  return prisma.$transaction(async (tx) => {
    const original = await tx.payment.update({
      where: { id: payment.id },
      data: {
        cancelledAt: new Date(),
        note: [payment.note, `cancel:${input.reason}`].filter(Boolean).join(" | "),
      },
    });
    const receiptNo = await nextReceiptNo(tx, input.campusId, session);
    const contra = await tx.payment.create({
      data: {
        invoiceId: payment.invoiceId,
        amount: dec(payment.amount).negated(),
        discount: dec(payment.discount).negated(),
        fine: dec(payment.fine).negated(),
        method: payment.method,
        reference: payment.receiptNo,
        receiptNo,
        note: `contra of ${payment.receiptNo}: ${input.reason}`,
        paidAt: new Date(),
        collectedBy: payment.collectedBy,
      },
    });
    const invoice = await replayInvoice(tx, payment.invoiceId);
    return { payment: original, contra, invoice };
  });
}

export async function studentLedger(input: {
  campusId: string;
  studentId: string;
  sessionId?: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
  });
  if (!student) throw notFound("student");
  const invoices = await prisma.feeInvoice.findMany({
    where: {
      studentId: input.studentId,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    },
    include: {
      lines: true,
      payments: { orderBy: { paidAt: "asc" } },
      master: { include: { group: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const total = invoices.reduce((sum, inv) => sum.plus(inv.total), ZERO);
  const paid = invoices.reduce((sum, inv) => sum.plus(inv.paid), ZERO);
  return {
    studentId: student.id,
    admissionNo: student.admissionNo,
    total: total.toFixed(2),
    paid: paid.toFixed(2),
    balance: total.minus(paid).plus(invoices.reduce((s, i) => s.plus(i.fine), ZERO)).minus(invoices.reduce((s, i) => s.plus(i.discount), ZERO)).toFixed(2),
    invoices,
  };
}

export async function dueSearch(input: {
  campusId: string;
  classId?: string;
  sectionId?: string;
  feeGroupIds: string[];
}) {
  const lines = await prisma.feeInvoiceLine.findMany({
    where: {
      invoice: {
        status: { in: [InvoiceStatus.DUE, InvoiceStatus.PARTIAL] },
        ...(input.feeGroupIds.length
          ? { master: { groupId: { in: input.feeGroupIds } } }
          : {}),
        student: {
          campusId: input.campusId,
          ...(input.classId || input.sectionId
            ? {
                enrollments: {
                  some: {
                    isCurrent: true,
                    ...(input.classId ? { classId: input.classId } : {}),
                    ...(input.sectionId ? { sectionId: input.sectionId } : {}),
                  },
                },
              }
            : {}),
        },
      },
    },
    include: {
      invoice: {
        include: {
          student: true,
          master: { include: { group: true } },
        },
      },
    },
  });
  const unpaid = lines.filter((line) => lineDue(line).gt(0));
  return {
    data: unpaid.map((line) => ({
      lineId: line.id,
      invoiceId: line.invoiceId,
      studentId: line.invoice.studentId,
      admissionNo: line.invoice.student.admissionNo,
      name: [line.invoice.student.firstName, line.invoice.student.lastName]
        .filter(Boolean)
        .join(" "),
      feeGroup: line.invoice.master?.group.name ?? null,
      description: line.description,
      amount: line.amount,
      paid: line.paid,
      discount: line.discount,
      fine: line.fine,
      balance: lineDue(line).toFixed(2),
    })),
  };
}

export async function getReceipt(input: {
  campusId: string;
  receiptNo: string;
}): Promise<{ json: Record<string, unknown>; pdf: Uint8Array; view: ReceiptView }> {
  const payment = await prisma.payment.findFirst({
    where: {
      receiptNo: input.receiptNo,
      invoice: { student: { campusId: input.campusId } },
    },
    include: {
      invoice: {
        include: {
          lines: true,
          student: { include: { campus: true } },
        },
      },
    },
  });
  if (!payment) throw notFound("receipt");
  const student = payment.invoice.student;
  const letterhead = await campusLetterhead(input.campusId);
  const view: ReceiptView = {
    campusName: letterhead.campusName,
    header: letterhead.header,
    footer: letterhead.footer,
    receiptNo: payment.receiptNo,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
    admissionNo: student.admissionNo,
    amount: dec(payment.amount).toFixed(2),
    discount: dec(payment.discount).toFixed(2),
    fine: dec(payment.fine).toFixed(2),
    method: payment.method,
    paidAt: payment.paidAt.toISOString().slice(0, 10),
    note: payment.note,
    cancelled: Boolean(payment.cancelledAt) || dec(payment.amount).lt(0),
    lines: payment.invoice.lines.map((line) => ({
      description: line.description,
      amount: dec(line.amount).toFixed(2),
      paid: dec(line.paid).toFixed(2),
      balance: lineDue(line).toFixed(2),
    })),
  };
  return {
    json: {
      id: payment.id,
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      discount: payment.discount,
      fine: payment.fine,
      method: payment.method,
      cancelledAt: payment.cancelledAt,
      paidAt: payment.paidAt,
      note: payment.note,
      invoice: payment.invoice,
      view,
    },
    pdf: buildReceiptPdf(view),
    view,
  };
}

export async function listInvoices(input: {
  campusId: string;
  studentId?: string;
  enrollmentId?: string;
}) {
  let studentId = input.studentId;
  if (input.enrollmentId) {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        id: input.enrollmentId,
        student: { campusId: input.campusId },
      },
    });
    if (!enrollment) throw notFound("enrollment");
    studentId = enrollment.studentId;
  }
  if (!studentId) throw validationError({ studentId: "required" });
  const data = await prisma.feeInvoice.findMany({
    where: { studentId, student: { campusId: input.campusId } },
    include: { lines: true, payments: true, master: { include: { group: true } } },
    orderBy: { createdAt: "desc" },
  });
  return { data, enrollmentId: input.enrollmentId ?? null, studentId };
}
