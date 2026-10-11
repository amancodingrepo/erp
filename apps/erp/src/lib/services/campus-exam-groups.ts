import { ExamKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function examGroupDeleteBlocked(counts: {
  exams: number;
  formWindows: number;
  examForms: number;
}) {
  return counts.exams > 0 || counts.formWindows > 0 || counts.examForms > 0;
}

const examInclude = { exams: { include: { subjects: true } } } as const;

export async function getExamGroup(campusId: string, id: string) {
  const row = await prisma.examGroup.findFirst({
    where: { id: trim(id), campusId },
    include: examInclude,
  });
  if (!row) throw notFound("exam group");
  return row;
}

export async function patchExamGroup(
  campusId: string,
  id: string,
  patch: {
    name?: string;
    examType?: ExamKind;
    groupKind?: string;
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    examMonthYear?: string;
    isAdditional?: boolean;
    revaluationOn?: boolean;
    isActive?: boolean;
    description?: string;
  },
) {
  const existing = await getExamGroup(campusId, id);
  const name = patch.name !== undefined ? trim(patch.name) : existing.name;
  if (!name) throw validationError({ name: "required" });
  let sessionId = existing.sessionId;
  if (patch.sessionId !== undefined) {
    const session = await prisma.academicSession.findFirst({
      where: { id: trim(patch.sessionId), campusId },
      select: { id: true },
    });
    if (!session) throw notFound("session");
    sessionId = session.id;
  }
  return prisma.examGroup.update({
    where: { id: existing.id },
    data: {
      name,
      sessionId,
      ...(patch.examType !== undefined ? { examType: patch.examType } : {}),
      ...(patch.groupKind !== undefined ? { groupKind: trim(patch.groupKind) || existing.groupKind } : {}),
      ...(patch.startDate !== undefined
        ? { startDate: patch.startDate ? new Date(patch.startDate) : null }
        : {}),
      ...(patch.endDate !== undefined
        ? { endDate: patch.endDate ? new Date(patch.endDate) : null }
        : {}),
      ...(patch.examMonthYear !== undefined
        ? { examMonthYear: trim(patch.examMonthYear) || null }
        : {}),
      ...(patch.isAdditional !== undefined ? { isAdditional: patch.isAdditional } : {}),
      ...(patch.revaluationOn !== undefined ? { revaluationOn: patch.revaluationOn } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      ...(patch.description !== undefined
        ? { description: trim(patch.description) || null }
        : {}),
    },
    include: examInclude,
  });
}

export async function removeExamGroup(campusId: string, id: string) {
  const existing = await getExamGroup(campusId, id);
  const [exams, formWindows, examForms] = await Promise.all([
    prisma.exam.count({ where: { examGroupId: existing.id } }),
    prisma.examFormWindow.count({ where: { examGroupId: existing.id } }),
    prisma.examForm.count({ where: { examGroupId: existing.id } }),
  ]);
  if (examGroupDeleteBlocked({ exams, formWindows, examForms })) {
    throw conflict("exam group is in use");
  }
  await prisma.examGroup.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}
