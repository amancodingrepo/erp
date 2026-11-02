import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { asRecord, dayText, defaultReceiptSettings, feeLineInclude, money } from "@/lib/school-world-fees";

export async function GET(
  request: Request,
  context: { params: Promise<{ feeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { feeId } = await context.params;
    const requestedReceipt = new URL(request.url).searchParams.get("receiptNumber")?.trim() ?? "";
    const line = await prisma.feeInvoiceLine.findFirst({
      where: { id: feeId, invoice: { student: { campusId: user.campusId } } },
      include: feeLineInclude,
    });
    if (!line) throw notFound("Fee record");
    const siblings = await prisma.feeInvoiceLine.findMany({
      where: {
        invoiceId: line.invoiceId,
        installmentName: line.installmentName,
      },
      include: feeLineInclude,
    });
    const history = siblings.flatMap((row) => {
      const entries = asRecord(row.metadata).paymentHistory;
      if (!Array.isArray(entries)) return [];
      return entries.map((entry) => {
        const record = asRecord(entry);
        return {
          feeId: row.id,
          feeName: row.description,
          amountPaid: record.amountPaid,
          receiptNumber: record.receiptNumber,
          paymentDate: record.paymentDate,
          paymentMethod: record.paymentMethod,
          cashDepositNumber: record.cashDepositNumber,
          notes: record.notes,
          lateFeeCharges: record.lateFeeCharges,
          row,
        };
      });
    }).filter((entry) => money(entry.amountPaid) > 0);
    const receiptNumber = requestedReceipt || String(history.find((entry) => entry.receiptNumber)?.receiptNumber || "");
    const selected = history.filter((entry) => !receiptNumber || entry.receiptNumber === receiptNumber);
    const payments = selected.length ? selected : history;
    if (!payments.length && money(line.paid) <= 0) {
      throw conflict("No recorded payment was found for this fee installment.");
    }
    const records = (payments.length ? payments : [{
      feeId: line.id,
      feeName: line.description,
      amountPaid: line.paid,
      paymentDate: "",
      paymentMethod: "",
      cashDepositNumber: "",
      notes: "",
      lateFeeCharges: 0,
      row: line,
    }]).map((payment) => {
      const row = "row" in payment ? payment.row : line;
      const metadata = asRecord(row.metadata);
      return {
        id: row.id,
        feeName: row.description,
        installment: row.installmentName,
        academicYear: row.invoice.session.name,
        amount: money(row.amount),
        amountPaid: money(row.paid),
        amountPaidThisReceipt: money(payment.amountPaid),
        dueDate: dayText(row.dueDate),
        paidAt: payment.paymentDate || "",
        paymentMethod: String(payment.paymentMethod || ""),
        reference: String(payment.cashDepositNumber || ""),
        notes: String(payment.notes || ""),
        feeNotes: String(metadata.notes || ""),
        lateFeeCharges: money(payment.lateFeeCharges),
      };
    });
    const student = line.invoice.student;
    const father = student.guardians.find((link) => link.relation === "father")?.guardian;
    const campus = await prisma.campus.findUnique({ where: { id: user.campusId } });
    const assignment = await prisma.schoolTemplateAssignment.findFirst({
      where: { userId: user.id, templateType: "fee_receipt" },
      include: { template: { include: { receiptSettings: { include: { notes: true } } } } },
    });
    const savedSettings = assignment?.template.receiptSettings;
    return ok({
      ok: true,
      receiptNumber: receiptNumber || `LEGACY-${line.id.slice(-10).toUpperCase()}`,
      feeReceiptTemplate: {
        receiptSettings: savedSettings ? { ...defaultReceiptSettings, ...savedSettings } : defaultReceiptSettings,
        receiptNotes: savedSettings?.notes ?? [],
      },
      receiptDate: String(records[0]?.paidAt || new Date().toISOString().slice(0, 10)),
      paymentDate: String(records[0]?.paidAt || ""),
      paymentMethod: [...new Set(records.map((record) => record.paymentMethod).filter(Boolean))].join(", "),
      reference: [...new Set(records.map((record) => record.reference).filter(Boolean))].join(", "),
      notes: [...new Set(records.map((record) => record.notes).filter(Boolean))].join(" | "),
      totalPaid: money(records.reduce((sum, record) => sum + record.amountPaidThisReceipt, 0)),
      school: {
        name: campus?.name ?? "",
        code: campus?.code ?? "",
        address: campus?.address ?? "",
        phone: campus?.phone ?? "",
        email: campus?.email ?? "",
        timezone: campus?.timezone ?? "Asia/Kolkata",
        logo: "",
      },
      student: {
        id: student.admissionNo,
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        className: student.enrollments[0]?.class.name ?? "",
        section: student.enrollments[0]?.section.name ?? "",
        academicYear: line.invoice.session.name,
        motherName: student.motherName ?? "",
        fatherName: father?.name ?? "",
        parentName: student.primaryParentName || father?.name || "",
        phone: student.mobile ?? "",
        email: student.email ?? "",
        address: "",
      },
      records,
      logoSource: "database",
    });
  } catch (error) {
    return fail(error);
  }
}
