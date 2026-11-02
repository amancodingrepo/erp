import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, money } from "@/lib/school-world-fees";
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
      include: { invoice: { include: { lines: true, payments: true } } },
    });
    if (!line) throw notFound("Fee record");
    const templateId = asRecord(line.metadata).feeTemplateId;
    if (!templateId) throw conflict("This fee record is not linked to a fee template.");
    const invoice = line.invoice;
    if (invoice.lines.some((item) => money(item.paid) > 0) || invoice.payments.some((payment) => !payment.cancelledAt && money(payment.amount) > 0)) {
      throw conflict("This fee template cannot be removed while any linked payment remains. Reverse all linked payments first.");
    }
    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.feeInvoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.feeInvoice.delete({ where: { id: invoice.id } });
    return ok({ ok: true, removed: invoice.lines.length });
  } catch (error) {
    return fail(error);
  }
}
