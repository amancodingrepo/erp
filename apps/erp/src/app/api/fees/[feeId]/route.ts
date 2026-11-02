import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, HttpError, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, feeLineInclude, invoiceStatus, money, parseDay, schoolFee } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

async function loadLine(campusId: string, feeId: string) {
  const line = await prisma.feeInvoiceLine.findFirst({
    where: { id: feeId, invoice: { student: { campusId } } },
    include: feeLineInclude,
  });
  if (!line) throw notFound("Fee record");
  return line;
}

async function refreshInvoice(invoiceId: string) {
  const lines = await prisma.feeInvoiceLine.findMany({ where: { invoiceId } });
  if (!lines.length) {
    await prisma.feeInvoice.delete({ where: { id: invoiceId } });
    return;
  }
  const total = money(lines.reduce((sum, line) => sum + money(line.amount), 0));
  const paid = money(lines.reduce((sum, line) => sum + money(line.paid), 0));
  await prisma.feeInvoice.update({
    where: { id: invoiceId },
    data: { total, paid, status: invoiceStatus(total, paid) },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ feeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { feeId } = await context.params;
    const current = await loadLine(user.campusId, feeId);
    const body = await readJson<{ amount?: number; amountPaid?: number; dueDate?: string | null; reference?: string }>(request);
    const paid = money(current.paid);
    const currentAmount = money(current.amount);
    if (body.amountPaid !== undefined && money(body.amountPaid) !== paid) {
      if (money(body.amountPaid) > paid) {
        throw new HttpError(400, "validation_error", "Mark fully paid is turned off. Pay the installment instead.");
      }
      throw conflict("Recorded payments cannot be reduced directly. Use Reverse Payment so the reversal is audited.");
    }
    if (paid >= currentAmount - 0.001) {
      throw conflict("This fee is already fully paid and cannot be modified.");
    }
    const amount = body.amount === undefined ? currentAmount : money(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount < paid) {
      throw new HttpError(400, "validation_error", "Fee total cannot be less than the amount already paid.");
    }
    const metadata = asRecord(current.metadata);
    if (metadata.subAmount !== undefined) metadata.subAmount = money(amount + Number(metadata.discount || 0) - Number(metadata.appliedTaxes || 0) - Number(metadata.lateFeeCharges || 0));
    const saved = await prisma.feeInvoiceLine.update({
      where: { id: current.id },
      data: {
        amount,
        dueDate: body.dueDate === undefined ? current.dueDate : parseDay(body.dueDate),
        reference: body.reference === undefined ? current.reference : String(body.reference).slice(0, 500),
        metadata: metadata as Prisma.InputJsonValue,
      },
      include: feeLineInclude,
    });
    await refreshInvoice(current.invoiceId);
    return ok({ fee: schoolFee(saved) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ feeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { feeId } = await context.params;
    const current = await loadLine(user.campusId, feeId);
    if (asRecord(current.metadata).feeTemplateId) {
      throw conflict("This is a template-backed fee. Reverse any payment and use Remove Template to remove the full assignment safely.");
    }
    if (money(current.paid) > 0) {
      throw conflict("Paid fee records cannot be deleted until their payment is reversed and audited.");
    }
    await prisma.feeInvoiceLine.delete({ where: { id: current.id } });
    await refreshInvoice(current.invoiceId);
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
