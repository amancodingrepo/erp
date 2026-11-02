import { ExamFormKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function examFormWindowDeleteBlocked(formCount: number) {
  return formCount > 0;
}

export function examFormWindowPatchData(
  existing: {
    opensAt: Date;
    closesAt: Date;
    feeAmount: Prisma.Decimal;
    isActive: boolean;
    kind: ExamFormKind;
  },
  patch: {
    opensAt?: string;
    closesAt?: string;
    feeAmount?: number | string;
    isActive?: boolean;
    kind?: ExamFormKind;
  },
) {
  const opensAt =
    patch.opensAt !== undefined ? new Date(patch.opensAt) : existing.opensAt;
  const closesAt =
    patch.closesAt !== undefined ? new Date(patch.closesAt) : existing.closesAt;
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    throw validationError({ opensAt: "invalid dates" });
  }
  if (closesAt.getTime() < opensAt.getTime()) {
    throw validationError({ closesAt: "must be after opensAt" });
  }
  const feeAmount =
    patch.feeAmount !== undefined ? dec(patch.feeAmount) : undefined;
  if (feeAmount !== undefined && feeAmount.lt(0)) {
    throw validationError({ feeAmount: "must be >= 0" });
  }
  return {
    opensAt,
    closesAt,
    ...(feeAmount !== undefined ? { feeAmount } : {}),
    ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
  };
}

export function examFormPatchData(patch: { subjectIds?: string[] }) {
  if (patch.subjectIds === undefined) {
    throw validationError({ subjectIds: "required" });
  }
  const subjectIds = [...new Set(patch.subjectIds.map((id) => trim(id)).filter(Boolean))];
  if (!subjectIds.length) throw validationError({ subjectIds: "select at least one subject" });
  return { subjectIds };
}

const windowInclude = {
  examGroup: { select: { id: true, name: true, groupKind: true, revaluationOn: true } },
} as const;

const formInclude = {
  student: { select: { id: true, admissionNo: true, firstName: true, lastName: true } },
  examGroup: { select: { id: true, name: true } },
  window: { select: { id: true, feeAmount: true, opensAt: true, closesAt: true } },
} as const;

export async function getExamFormWindow(campusId: string, id: string) {
  const row = await prisma.examFormWindow.findFirst({
    where: { id: trim(id), campusId },
    include: windowInclude,
  });
  if (!row) throw notFound("window");
  return row;
}

export async function patchExamFormWindow(
  campusId: string,
  id: string,
  patch: {
    opensAt?: string;
    closesAt?: string;
    feeAmount?: number | string;
    isActive?: boolean;
    kind?: ExamFormKind;
    examGroupId?: string;
  },
) {
  const existing = await getExamFormWindow(campusId, id);
  const data = examFormWindowPatchData(existing, patch);
  let examGroupId = existing.examGroupId;
  if (patch.examGroupId !== undefined) {
    const group = await prisma.examGroup.findFirst({
      where: { id: trim(patch.examGroupId), campusId },
    });
    if (!group) throw notFound("exam group");
    examGroupId = group.id;
  }
  const kind = data.kind ?? existing.kind;
  if (kind === ExamFormKind.REVAL) {
    const group = await prisma.examGroup.findFirst({
      where: { id: examGroupId, campusId },
      select: { revaluationOn: true },
    });
    if (!group?.revaluationOn) {
      throw validationError({ examGroupId: "revaluation is off for this group" });
    }
  }
  return prisma.examFormWindow.update({
    where: { id: existing.id },
    data: { ...data, examGroupId },
    include: windowInclude,
  });
}

export async function removeExamFormWindow(campusId: string, id: string) {
  const existing = await getExamFormWindow(campusId, id);
  const forms = await prisma.examForm.count({ where: { windowId: existing.id } });
  if (examFormWindowDeleteBlocked(forms)) throw conflict("window is in use");
  await prisma.examFormWindow.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function getExamForm(campusId: string, id: string) {
  const row = await prisma.examForm.findFirst({
    where: { id: trim(id), campusId },
    include: formInclude,
  });
  if (!row) throw notFound("exam form");
  return row;
}

export async function patchExamForm(
  campusId: string,
  id: string,
  patch: { subjectIds?: string[] },
) {
  const existing = await getExamForm(campusId, id);
  const data = examFormPatchData(patch);
  const subjects = await prisma.examSubject.findMany({
    where: {
      id: { in: data.subjectIds },
      exam: { examGroupId: existing.examGroupId },
    },
  });
  if (subjects.length !== data.subjectIds.length) {
    throw validationError({ subjectIds: "subjects must belong to the exam group" });
  }
  return prisma.examForm.update({
    where: { id: existing.id },
    data: { subjectIds: data.subjectIds },
    include: formInclude,
  });
}

export async function removeExamForm(campusId: string, id: string) {
  const existing = await getExamForm(campusId, id);
  await prisma.examForm.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}
