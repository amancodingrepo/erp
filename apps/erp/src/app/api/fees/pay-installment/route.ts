import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, HttpError, notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, feeLineInclude, invoiceStatus, money, parseDay, paymentMethodToErp, schoolFee } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const body = await readJson<{
      records?: { feeId?: string; amountToPay?: number; lateFeeCharges?: number }[];
      paymentMethod?: string;
      paymentDate?: string;
      cashDepositNumber?: string;
      notes?: string;
    }>(request);
    const records = Array.isArray(body.records) ? body.records : [];
    const paymentDate = parseDay(body.paymentDate);
    const method = paymentMethodToErp(body.paymentMethod);
    const cashDepositNumber = String(body.cashDepositNumber || "").trim().slice(0, 120);
    const notes = String(body.notes || "").trim().slice(0, 1000);
    if (!records.length || records.length > 100) {
      throw new HttpError(400, "validation_error", "Select a valid fee installment to pay.");
    }
    if (!paymentDate) throw new HttpError(400, "validation_error", "Choose a payment date.");
    const ids = records.map((record) => String(record.feeId || "").trim());
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      throw new HttpError(400, "validation_error", "The fee rows are invalid or duplicated.");
    }
    const receiptNumber = `RCP-${Date.now()}`;
    const updated = await prisma.$transaction(async (tx) => {
      const lines = [];
      for (const id of ids) {
        const line = await tx.feeInvoiceLine.findFirst({
          where: { id, invoice: { student: { campusId: user.campusId } } },
          include: feeLineInclude,
        });
        if (!line) throw notFound("Fee record");
        lines.push(line);
      }
      const invoiceId = lines[0].invoiceId;
      const installment = lines[0].installmentName;
      if (lines.some((line) => line.invoiceId !== invoiceId || line.installmentName !== installment)) {
        throw new HttpError(400, "validation_error", "All fee rows must belong to the same student installment.");
      }
      const inputById = new Map(records.map((record) => [String(record.feeId), record]));
      let totalPaid = 0;
      const changed = [];
      for (const line of lines) {
        const input = inputById.get(line.id)!;
        const amountToPay = money(input.amountToPay);
        const lateFee = money(input.lateFeeCharges);
        if (!Number.isFinite(amountToPay) || amountToPay < 0 || !Number.isFinite(lateFee) || lateFee < 0) {
          throw new HttpError(400, "validation_error", "Each amount to pay must be zero or positive.");
        }
        const metadata = asRecord(line.metadata);
        const oldAmount = money(line.amount);
        const oldPaid = money(line.paid);
        const oldLate = money(metadata.lateFeeCharges || 0);
        if (oldPaid >= oldAmount - 0.001) {
          if (amountToPay > 0 || lateFee !== oldLate) {
            throw conflict("This fee is already fully paid and cannot be modified.");
          }
          continue;
        }
        const newAmount = metadata.subAmount !== undefined
          ? money(Number(metadata.subAmount || 0) - Number(metadata.discount || 0) + Number(metadata.appliedTaxes || 0) + lateFee)
          : money(oldAmount - oldLate + lateFee);
        const newPaid = money(oldPaid + amountToPay);
        if (newAmount < oldPaid) throw conflict("The updated fee total cannot be lower than the amount already paid.");
        if (newPaid > newAmount + 0.001) {
          throw new HttpError(400, "validation_error", `The amount to pay exceeds the outstanding balance for ${line.description}.`);
        }
        if (amountToPay > 0) totalPaid += amountToPay;
        const history = Array.isArray(metadata.paymentHistory) ? [...metadata.paymentHistory] : [];
        if (amountToPay > 0) {
          history.push({
            receiptNumber,
            paymentMethod: body.paymentMethod,
            paymentDate: paymentDate.toISOString().slice(0, 10),
            cashDepositNumber,
            notes,
            amountPaid: amountToPay,
            lateFeeCharges: lateFee,
            recordedAt: new Date().toISOString(),
            recordedBy: user.id,
          });
        }
        const nextMetadata = {
          ...metadata,
          lateFeeCharges: lateFee,
          paymentHistory: history.slice(-100),
        };
        const saved = await tx.feeInvoiceLine.update({
          where: { id: line.id },
          data: {
            amount: newAmount,
            paid: newPaid,
            reference: cashDepositNumber || line.reference,
            metadata: nextMetadata as Prisma.InputJsonValue,
          },
          include: feeLineInclude,
        });
        changed.push(saved);
      }
      if (money(totalPaid) <= 0) {
        throw new HttpError(400, "validation_error", "Enter an amount greater than zero to record a payment.");
      }
      await tx.payment.create({
        data: {
          invoiceId,
          amount: money(totalPaid),
          method,
          reference: `sw-receipt:${receiptNumber}`,
          receiptNo: receiptNumber,
          note: notes,
          cashDepositNumber: cashDepositNumber || null,
          reversalReason: null,
          paidAt: paymentDate,
          collectedBy: user.id,
        },
      });
      const invoiceLines = await tx.feeInvoiceLine.findMany({ where: { invoiceId } });
      const total = money(invoiceLines.reduce((sum, line) => sum + money(line.amount), 0));
      const paid = money(invoiceLines.reduce((sum, line) => sum + money(line.paid), 0));
      await tx.feeInvoice.update({
        where: { id: invoiceId },
        data: { total, paid, status: invoiceStatus(total, paid) },
      });
      return changed;
    });
    const fees = updated.map(schoolFee);
    const totalPaidThisTransaction = money(updated.reduce((sum, line) => {
      const history = asRecord(line.metadata).paymentHistory;
      if (!Array.isArray(history) || !history.length) return sum;
      const last = asRecord(history[history.length - 1]);
      return last.receiptNumber === receiptNumber ? sum + money(last.amountPaid) : sum;
    }, 0));
    return created({
      ok: true,
      fees,
      receiptNumber,
      totalPaidThisTransaction,
      paymentMethod: body.paymentMethod,
      paymentDate: paymentDate.toISOString().slice(0, 10),
      cashDepositNumber,
      notes,
    });
  } catch (error) {
    return fail(error);
  }
}
