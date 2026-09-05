import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  discount: z.number().nonnegative().optional(),
  fine: z.number().nonnegative().optional(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

function nextStatus(total: number, paid: number, discount: number, fine: number) {
  const due = total + fine - discount - paid;
  if (due <= 0.0001) return InvoiceStatus.PAID;
  if (paid > 0) return InvoiceStatus.PARTIAL;
  return InvoiceStatus.DUE;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const idempotency = request.headers.get("idempotency-key");
    if (!idempotency) {
      throw validationError({ "Idempotency-Key": "required" });
    }
    const existing = await prisma.payment.findFirst({
      where: { reference: `idemp:${idempotency}` },
      include: { invoice: true },
    });
    if (existing) {
      return ok({ receiptNo: existing.receiptNo, invoice: existing.invoice });
    }
    const body = bodySchema.parse(await readJson(request));
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: body.invoiceId },
      include: { student: true },
    });
    if (!invoice || invoice.student.campusId !== user.campusId) {
      throw notFound("invoice");
    }
    const discount = body.discount ?? Number(invoice.discount);
    const fine = body.fine ?? Number(invoice.fine);
    const paid = Number(invoice.paid) + body.amount;
    const total = Number(invoice.total);
    const receiptNo = `RCP-${Date.now()}`;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: body.amount,
            discount: body.discount ?? 0,
            fine: body.fine ?? 0,
            method: body.method,
            reference: `idemp:${idempotency}`,
            receiptNo,
            note: body.note,
            paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
            collectedBy: user.id,
          },
        });
        const updated = await tx.feeInvoice.update({
          where: { id: invoice.id },
          data: {
            paid,
            discount,
            fine,
            status: nextStatus(total, paid, discount, fine),
          },
        });
        return { payment, invoice: updated };
      });
      return created({
        receiptNo: result.payment.receiptNo,
        invoice: result.invoice,
      });
    } catch (error) {
      const raced = await prisma.payment.findFirst({
        where: { reference: `idemp:${idempotency}` },
        include: { invoice: true },
      });
      if (raced) {
        return ok({ receiptNo: raced.receiptNo, invoice: raced.invoice });
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const receiptNo = new URL(request.url).searchParams.get("receiptNo");
    if (!receiptNo) return ok({ data: [] });
    const payment = await prisma.payment.findUnique({
      where: { receiptNo },
      include: { invoice: { include: { student: true, lines: true } } },
    });
    if (!payment || payment.invoice.student.campusId !== user.campusId) {
      throw notFound("receipt");
    }
    return ok(payment);
  } catch (error) {
    return fail(error);
  }
}
