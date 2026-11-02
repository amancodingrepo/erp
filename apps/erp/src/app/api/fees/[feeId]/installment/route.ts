import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, invoiceStatus, money } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ feeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { feeId } = await context.params;
    const line = await prisma.feeInvoiceLine.findFirst({
      where: { id: feeId, invoice: { student: { campusId: user.campusId } } },
    });
    if (!line) throw notFound("Fee record");
    if (!asRecord(line.metadata).feeTemplateId) {
      throw conflict("This record is not a template-backed installment. Delete an individual unpaid fee instead.");
    }
    const siblings = await prisma.feeInvoiceLine.findMany({
      where: { invoiceId: line.invoiceId, installmentName: line.installmentName },
    });
    if (siblings.some((item) => money(item.paid) > 0)) {
      throw conflict("Reverse the payments for this installment before deleting it.");
    }
    await prisma.feeInvoiceLine.deleteMany({ where: { id: { in: siblings.map((item) => item.id) } } });
    const remaining = await prisma.feeInvoiceLine.findMany({ where: { invoiceId: line.invoiceId } });
    if (!remaining.length) {
      await prisma.payment.deleteMany({ where: { invoiceId: line.invoiceId } });
      await prisma.feeInvoice.delete({ where: { id: line.invoiceId } });
    } else {
      const total = money(remaining.reduce((sum, item) => sum + money(item.amount), 0));
      const paid = money(remaining.reduce((sum, item) => sum + money(item.paid), 0));
      await prisma.feeInvoice.update({
        where: { id: line.invoiceId },
        data: { total, paid, status: invoiceStatus(total, paid) },
      });
    }
    return ok({ ok: true, recordsRemoved: siblings.length, installment: line.installmentName });
  } catch (error) {
    return fail(error);
  }
}
