import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, HttpError, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, feeLineInclude, invoiceStatus, money, schoolFee } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function POST(
  request: Request,
  context: { params: Promise<{ feeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { feeId } = await context.params;
    const body = await readJson<{ reason?: string }>(request);
    const reason = String(body.reason || "").trim();
    if (!reason) throw new HttpError(400, "validation_error", "Enter a reason for reversing this payment.");
    if (reason.length > 500) throw new HttpError(400, "validation_error", "The reversal reason must be 500 characters or fewer.");
    const line = await prisma.feeInvoiceLine.findFirst({
      where: { id: feeId, invoice: { student: { campusId: user.campusId } } },
      include: feeLineInclude,
    });
    if (!line) throw notFound("Fee record");
    const reversedAmount = money(line.paid);
    if (reversedAmount <= 0) throw conflict("There is no recorded payment to reverse.");
    const metadata = asRecord(line.metadata);
    const history = Array.isArray(metadata.paymentHistory) ? metadata.paymentHistory : [];
    const receiptNumbers = new Set(history.map((entry) => String(asRecord(entry).receiptNumber || "")).filter(Boolean));
    const saved = await prisma.$transaction(async (tx) => {
      const payments = line.invoice.payments.filter((payment) => !payment.cancelledAt);
      const targets = payments.filter((payment) => receiptNumbers.has(payment.receiptNo));
      const chosen = targets.length ? targets : payments;
      for (const payment of chosen) {
        const shared = await tx.feeInvoiceLine.findMany({ where: { invoiceId: line.invoiceId, id: { not: line.id } } });
        const stillOpen = shared.some((other) => {
          const otherHistory = asRecord(other.metadata).paymentHistory;
          const mentions = Array.isArray(otherHistory) && otherHistory.some((entry) => asRecord(entry).receiptNumber === payment.receiptNo);
          return mentions && money(other.paid) > 0;
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            reversalReason: reason,
            cancelledAt: stillOpen ? payment.cancelledAt : new Date(),
          },
        });
      }
      const nextHistory = history.map((entry) => ({ ...asRecord(entry), reversed: true, reversalReason: reason }));
      const updated = await tx.feeInvoiceLine.update({
        where: { id: line.id },
        data: { paid: 0, metadata: { ...metadata, paymentHistory: nextHistory } as Prisma.InputJsonValue },
        include: feeLineInclude,
      });
      const lines = await tx.feeInvoiceLine.findMany({ where: { invoiceId: line.invoiceId } });
      const total = money(lines.reduce((sum, item) => sum + money(item.amount), 0));
      const paid = money(lines.reduce((sum, item) => sum + money(item.paid), 0));
      await tx.feeInvoice.update({
        where: { id: line.invoiceId },
        data: { total, paid, status: invoiceStatus(total, paid) },
      });
      return updated;
    });
    return ok({ ok: true, fee: schoolFee(saved), reversedAmount });
  } catch (error) {
    return fail(error);
  }
}
