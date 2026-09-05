import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ reason: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: { include: { student: true } } },
    });
    if (!payment || payment.invoice.student.campusId !== user.campusId) {
      throw notFound("payment");
    }
    if (payment.cancelledAt) {
      throw conflict("payment already cancelled");
    }
    const paid = Number(payment.invoice.paid) - Number(payment.amount);
    const status =
      paid <= 0 ? InvoiceStatus.DUE : InvoiceStatus.PARTIAL;
    const result = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.payment.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
          note: [payment.note, `cancel:${body.reason}`].filter(Boolean).join(" | "),
        },
      });
      const invoice = await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { paid: Math.max(0, paid), status },
      });
      return { payment: cancelled, invoice };
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
