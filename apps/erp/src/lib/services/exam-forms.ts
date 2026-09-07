import { ExamFormKind, InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { isExamFormWindowOpen } from "@/lib/exam-form-window";
import { dec } from "@/lib/money";

function feeTypeName(kind: ExamFormKind) {
  return kind === ExamFormKind.ATKT ? "ATKT" : "Revaluation";
}

async function chargeExamFormFee(input: {
  campusId: string;
  studentId: string;
  kind: ExamFormKind;
  amount: Prisma.Decimal;
  description: string;
}) {
  if (input.amount.lte(0)) return null;
  const campus = await prisma.campus.findUnique({ where: { id: input.campusId } });
  if (!campus?.currentSessionId) {
    throw validationError({ sessionId: "session required" });
  }
  let feeType = await prisma.feeType.findFirst({
    where: { campusId: input.campusId, name: feeTypeName(input.kind) },
  });
  if (!feeType) {
    feeType = await prisma.feeType.create({
      data: { campusId: input.campusId, name: feeTypeName(input.kind) },
    });
  }
  const invoice = await prisma.feeInvoice.create({
    data: {
      studentId: input.studentId,
      sessionId: campus.currentSessionId,
      status: InvoiceStatus.DUE,
      total: input.amount,
      lines: {
        create: {
          feeTypeId: feeType.id,
          description: input.description,
          amount: input.amount,
        },
      },
    },
  });
  return invoice.id;
}

export async function createExamFormWindow(
  campusId: string,
  input: {
    kind: ExamFormKind;
    examGroupId: string;
    opensAt: string;
    closesAt: string;
    feeAmount: number | string;
  },
) {
  const group = await prisma.examGroup.findFirst({
    where: { id: input.examGroupId, campusId },
  });
  if (!group) throw notFound("exam group");
  if (input.kind === ExamFormKind.REVAL && !group.revaluationOn) {
    throw validationError({ examGroupId: "revaluation is off for this group" });
  }
  const opensAt = new Date(input.opensAt);
  const closesAt = new Date(input.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    throw validationError({ opensAt: "invalid dates" });
  }
  if (closesAt.getTime() < opensAt.getTime()) {
    throw validationError({ closesAt: "must be after opensAt" });
  }
  const feeAmount = dec(input.feeAmount);
  if (feeAmount.lt(0)) throw validationError({ feeAmount: "must be >= 0" });
  return prisma.examFormWindow.create({
    data: {
      campusId,
      kind: input.kind,
      examGroupId: group.id,
      opensAt,
      closesAt,
      feeAmount,
    },
  });
}

export async function listExamFormWindows(campusId: string, kind?: ExamFormKind) {
  return prisma.examFormWindow.findMany({
    where: { campusId, ...(kind ? { kind } : {}) },
    include: { examGroup: { select: { id: true, name: true, groupKind: true, revaluationOn: true } } },
    orderBy: { opensAt: "desc" },
  });
}

export async function listOpenExamFormWindows(campusId: string) {
  const now = new Date();
  return prisma.examFormWindow.findMany({
    where: {
      campusId,
      isActive: true,
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    include: {
      examGroup: {
        include: { exams: { include: { subjects: true } } },
      },
    },
    orderBy: { closesAt: "asc" },
  });
}

export async function listExamForms(
  campusId: string,
  filters?: { kind?: ExamFormKind; studentId?: string },
) {
  return prisma.examForm.findMany({
    where: {
      campusId,
      ...(filters?.kind ? { kind: filters.kind } : {}),
      ...(filters?.studentId ? { studentId: filters.studentId } : {}),
    },
    include: {
      student: { select: { id: true, admissionNo: true, firstName: true, lastName: true } },
      examGroup: { select: { id: true, name: true } },
      window: { select: { id: true, feeAmount: true, opensAt: true, closesAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitExamForm(
  campusId: string,
  input: {
    windowId: string;
    studentId: string;
    subjectIds: string[];
    now?: Date;
  },
) {
  const window = await prisma.examFormWindow.findFirst({
    where: { id: input.windowId, campusId, isActive: true },
    include: { examGroup: true },
  });
  if (!window) throw notFound("window");
  if (!isExamFormWindowOpen(window.opensAt, window.closesAt, input.now ?? new Date())) {
    throw validationError({ windowId: "window is closed" });
  }
  if (window.kind === ExamFormKind.REVAL && !window.examGroup.revaluationOn) {
    throw validationError({ examGroupId: "revaluation is off for this group" });
  }
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
  });
  if (!student) throw notFound("student");
  const subjectIds = [...new Set(input.subjectIds.filter(Boolean))];
  if (!subjectIds.length) {
    throw validationError({ subjectIds: "select at least one subject" });
  }
  const subjects = await prisma.examSubject.findMany({
    where: {
      id: { in: subjectIds },
      exam: { examGroupId: window.examGroupId },
    },
  });
  if (subjects.length !== subjectIds.length) {
    throw validationError({ subjectIds: "subjects must belong to the exam group" });
  }
  const existing = await prisma.examForm.findUnique({
    where: {
      studentId_examGroupId_kind: {
        studentId: student.id,
        examGroupId: window.examGroupId,
        kind: window.kind,
      },
    },
  });
  if (existing) throw conflict("already submitted");
  const feeInvoiceId = await chargeExamFormFee({
    campusId,
    studentId: student.id,
    kind: window.kind,
    amount: window.feeAmount,
    description: `${feeTypeName(window.kind)} form ${window.examGroup.name}`,
  });
  const form = await prisma.examForm.create({
    data: {
      campusId,
      windowId: window.id,
      studentId: student.id,
      examGroupId: window.examGroupId,
      kind: window.kind,
      subjectIds,
      feeInvoiceId,
    },
  });
  return {
    ...form,
    feeAmount: window.feeAmount.toString(),
    feeInvoiceId,
  };
}
