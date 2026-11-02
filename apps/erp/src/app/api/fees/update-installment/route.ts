import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, HttpError, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, feeLineInclude, invoiceStatus, money, parseDay, schoolFee } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function PATCH(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const body = await readJson<{ records?: { feeId?: string; amount?: number; dueDate?: string | null; reference?: string }[] }>(request);
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length || records.length > 100) {
      throw new HttpError(400, "validation_error", "Select a valid fee installment to edit.");
    }
    const updates = await prisma.$transaction(async (tx) => {
      const lines = [];
      for (const record of records) {
        const id = String(record.feeId || "").trim();
        const line = await tx.feeInvoiceLine.findFirst({
          where: { id, invoice: { student: { campusId: user.campusId } } },
          include: feeLineInclude,
        });
        if (!line) throw notFound("Fee record");
        lines.push({ line, record });
      }
      if (lines.some(({ line }) => line.invoiceId !== lines[0].line.invoiceId || line.installmentName !== lines[0].line.installmentName)) {
        throw new HttpError(400, "validation_error", "All fee rows must belong to the same student installment.");
      }
      const saved = [];
      for (const { line, record } of lines) {
        const paid = money(line.paid);
        const currentAmount = money(line.amount);
        const amount = money(record.amount);
        if (paid >= currentAmount - 0.001 && (amount !== currentAmount || String(record.reference || "") !== String(line.reference || ""))) {
          throw conflict("This fee is already fully paid and cannot be modified.");
        }
        if (!Number.isFinite(amount) || amount < 0 || amount < paid) {
          throw new HttpError(400, "validation_error", "Fee total cannot be less than the amount already paid.");
        }
        const metadata = asRecord(line.metadata);
        if (metadata.subAmount !== undefined) {
          metadata.subAmount = money(amount + Number(metadata.discount || 0) - Number(metadata.appliedTaxes || 0) - Number(metadata.lateFeeCharges || 0));
        }
        saved.push(await tx.feeInvoiceLine.update({
          where: { id: line.id },
          data: {
            amount,
            dueDate: parseDay(record.dueDate),
            reference: String(record.reference || "").slice(0, 500),
            metadata: metadata as Prisma.InputJsonValue,
          },
          include: feeLineInclude,
        }));
      }
      const invoiceId = lines[0].line.invoiceId;
      const invoiceLines = await tx.feeInvoiceLine.findMany({ where: { invoiceId } });
      const total = money(invoiceLines.reduce((sum, line) => sum + money(line.amount), 0));
      const paid = money(invoiceLines.reduce((sum, line) => sum + money(line.paid), 0));
      await tx.feeInvoice.update({
        where: { id: invoiceId },
        data: { total, paid, status: invoiceStatus(total, paid) },
      });
      return saved;
    });
    return ok({ ok: true, fees: updates.map(schoolFee) });
  } catch (error) {
    return fail(error);
  }
}
