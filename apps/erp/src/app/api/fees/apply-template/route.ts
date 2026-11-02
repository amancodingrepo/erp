import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, HttpError, notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { money, parseDay } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

type FeeItem = {
  name?: string;
  feeTypeId?: string;
  baseAmount?: number;
  amount?: number;
  discountType?: string;
  discountValue?: number;
  taxes?: { cgst?: boolean; sgst?: boolean; igst?: boolean };
  notes?: string;
  originalInstallment?: string;
  originalDueDate?: string;
  installmentNotes?: string;
};

function lineAmount(item: FeeItem) {
  const baseAmount = money(item.baseAmount ?? item.amount);
  const discountValue = money(item.discountValue || 0);
  const discountType = String(item.discountType || "").trim();
  if (!String(item.name || "").trim() || !Number.isFinite(baseAmount) || baseAmount < 0 || !Number.isFinite(discountValue) || discountValue < 0) {
    throw new HttpError(400, "validation_error", "One or more fee rows contains an invalid name, amount or discount.");
  }
  if (discountType === "Percentage" && discountValue > 100) {
    throw new HttpError(400, "validation_error", "One or more fee rows contains an invalid name, amount or discount.");
  }
  const rawDiscount = discountType === "Percentage"
    ? Math.min(baseAmount, (baseAmount * discountValue) / 100)
    : discountType === "Fixed Amount"
      ? Math.min(baseAmount, discountValue)
      : 0;
  const discountAmount = money(rawDiscount);
  const taxable = Math.max(0, baseAmount - discountAmount);
  const taxes = item.taxes || {};
  const taxRate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
  const taxAmount = money((taxable * taxRate) / 100);
  return {
    name: String(item.name).trim(),
    baseAmount,
    discountAmount,
    taxAmount,
    total: money(baseAmount - discountAmount + taxAmount),
    installment: String(item.originalInstallment || "").trim(),
    dueDate: parseDay(item.originalDueDate),
    notes: [item.installmentNotes, item.notes].map((value) => String(value || "").trim()).filter(Boolean).join(" | ").slice(0, 500),
    feeTypeId: String(item.feeTypeId || "").trim(),
    raw: item,
  };
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const body = await readJson<{
      replaceExistingTemplate?: boolean;
      templateId?: string;
      templateName?: string;
      academicYear?: string;
      studentCodes?: string[];
      feeName?: string;
      installmentName?: string;
      feeItems?: FeeItem[];
      notes?: string;
      lateFeeCharges?: number;
      dueDate?: string;
    }>(request);
    const templateId = String(body.templateId || "").trim();
    const templateName = String(body.templateName || "").trim();
    const academicYear = String(body.academicYear || "").trim();
    const studentCodes = [...new Set((body.studentCodes || []).map((code) => String(code || "").trim()).filter(Boolean))];
    const feeName = String(body.feeName || "").trim();
    const installmentName = String(body.installmentName || "").trim() || "Single Installment";
    const lateFeeCharges = Number(body.lateFeeCharges || 0);
    if (!templateId || !templateName || !academicYear) {
      throw new HttpError(400, "validation_error", "Fee template, name and academic year are required.");
    }
    if (!studentCodes.length || studentCodes.length > 500) {
      throw new HttpError(400, "validation_error", "Select between 1 and 500 students to apply the fee template.");
    }
    if (!feeName || !Array.isArray(body.feeItems) || !body.feeItems.length) {
      throw new HttpError(400, "validation_error", "The template must include at least one fee type.");
    }
    if (!Number.isFinite(lateFeeCharges) || lateFeeCharges !== 0) {
      throw new HttpError(400, "validation_error", "Late-fee charges are managed separately in Fee Management. Apply a template with late-fee charges set to zero.");
    }
    const items = body.feeItems.map(lineAmount);
    const perStudent = money(items.reduce((sum, item) => sum + item.total, 0));
    if (!Number.isFinite(perStudent) || perStudent <= 0) {
      throw new HttpError(400, "validation_error", "The template must create a total fee amount greater than zero.");
    }
    if (studentCodes.length * items.length > 5000) {
      throw new HttpError(413, "payload_too_large", "This application would create too many fee rows. Apply to fewer students at a time.");
    }

    const students = await prisma.student.findMany({
      where: { campusId: user.campusId, admissionNo: { in: studentCodes } },
    });
    const found = new Set(students.map((student) => student.admissionNo));
    const missing = studentCodes.filter((code) => !found.has(code));
    if (missing.length) throw notFound(`Student(s) ${missing.join(", ")}`);

    const existing = await prisma.feeInvoice.findMany({
      where: { studentId: { in: students.map((student) => student.id) }, masterId: { not: null } },
      include: { payments: true, lines: true, student: true },
    });
    const assigned = existing.filter((invoice) =>
      invoice.lines.some((line) => {
        const metadata = line.metadata;
        return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && "feeTemplateId" in metadata);
      }),
    );
    if (assigned.length) {
      const blocked = assigned.filter((invoice) =>
        money(invoice.lines.reduce((sum, line) => sum + money(line.paid), 0)) > 0
        || invoice.payments.some((payment) => !payment.cancelledAt && money(payment.amount) > 0),
      );
      if (blocked.length) {
        const codes = [...new Set(blocked.map((invoice) => invoice.student.admissionNo))];
        throw conflict(`A fee template with an uncancelled payment is already assigned to these student(s): ${codes.join(", ")}. Reverse the payments before applying another template.`);
      }
      if (!body.replaceExistingTemplate) {
        const codes = [...new Set(assigned.map((invoice) => invoice.student.admissionNo))];
        throw conflict(`A fee template is already assigned to these student(s): ${codes.join(", ")}. Reverse linked payments and remove the previous assignment before applying another template.`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (body.replaceExistingTemplate) {
        for (const invoice of assigned) {
          await tx.payment.deleteMany({ where: { invoiceId: invoice.id } });
          await tx.feeInvoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
          await tx.feeInvoice.delete({ where: { id: invoice.id } });
        }
      }
      let session = await tx.academicSession.findFirst({
        where: { campusId: user.campusId, name: academicYear },
      });
      if (!session) {
        session = await tx.academicSession.create({
          data: { campusId: user.campusId, name: academicYear, isCurrent: false },
        });
      }
      let group = await tx.feeGroup.findFirst({
        where: { campusId: user.campusId, name: "School World" },
      });
      if (!group) {
        group = await tx.feeGroup.create({ data: { campusId: user.campusId, name: "School World" } });
      }
      const master = await tx.feeMaster.create({
        data: {
          campusId: user.campusId,
          sessionId: session.id,
          groupId: group.id,
          name: templateName.slice(0, 180),
          description: String(body.notes || "").slice(0, 500),
          dueDate: parseDay(body.dueDate),
          lines: {
            create: await Promise.all(items.map(async (item, index) => {
              let feeTypeId = item.feeTypeId;
              const typed = feeTypeId
                ? await tx.feeType.findFirst({ where: { id: feeTypeId, campusId: user.campusId } })
                : null;
              if (!typed) {
                const named = await tx.feeType.findFirst({ where: { campusId: user.campusId, name: item.name } });
                const createdType = named ?? await tx.feeType.create({ data: { campusId: user.campusId, name: item.name } });
                feeTypeId = createdType.id;
              }
              return {
                feeTypeId,
                amount: item.total,
                installmentName: item.installment || installmentName,
                displayOrder: index,
              };
            })),
          },
        },
        include: { lines: true },
      });
      let createdRecords = 0;
      for (const student of students) {
        await tx.feeInvoice.create({
          data: {
            studentId: student.id,
            sessionId: session.id,
            masterId: master.id,
            total: perStudent,
            reference: `Template: ${templateName}`.slice(0, 180),
            lines: {
              create: master.lines.map((masterLine, index) => {
                const item = items[index];
                return {
                  feeTypeId: masterLine.feeTypeId,
                  description: `${item.name}${item.installment ? ` - ${item.installment}` : ""}`.slice(0, 240),
                  amount: item.total,
                  installmentName: item.installment || installmentName,
                  dueDate: item.dueDate ?? parseDay(body.dueDate),
                  reference: `Template: ${templateName} | ${item.installment || installmentName}`.slice(0, 180),
                  metadata: {
                    feeTemplateId: master.id,
                    schoolWorldTemplateId: templateId,
                    feeTemplateName: templateName,
                    installmentName: item.installment || installmentName,
                    subAmount: item.baseAmount,
                    discount: item.discountAmount,
                    appliedTaxes: item.taxAmount,
                    lateFeeCharges: 0,
                    totalAmount: item.total,
                    notes: item.notes,
                    templateFeeItems: [{ ...item.raw, totalAmount: item.total, notes: item.notes }],
                  } as Prisma.InputJsonValue,
                };
              }),
            },
          },
        });
        createdRecords += items.length;
      }
      return { masterId: master.id, createdRecords };
    });

    return created({
      ok: true,
      templateId: result.masterId,
      templateName,
      studentsApplied: students.length,
      feeRowsPerStudent: items.length,
      feeRecordsCreated: result.createdRecords,
      installmentNames: [...new Set(items.map((item) => item.installment).filter(Boolean))],
      totalFeeAmountPerStudent: perStudent,
    });
  } catch (error) {
    return fail(error);
  }
}
