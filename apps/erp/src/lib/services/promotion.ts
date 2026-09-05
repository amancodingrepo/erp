import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { sectionInCampus, sessionInCampus } from "@/lib/campus";

export type PromoteInput = {
  campusId: string;
  fromSectionId: string;
  toSectionId: string;
  toSessionId: string;
  studentIds?: string[];
};

export type PromoteResult = {
  promoted: number;
  enrollmentIds: string[];
};

export async function promote(input: PromoteInput): Promise<PromoteResult> {
  const fromSection = await sectionInCampus(input.campusId, input.fromSectionId);
  const toSection = await sectionInCampus(input.campusId, input.toSectionId);
  await sessionInCampus(input.campusId, input.toSessionId);

  if (input.fromSectionId === input.toSectionId) {
    const sameSessionCurrent = await prisma.studentEnrollment.findFirst({
      where: {
        sectionId: input.fromSectionId,
        sessionId: input.toSessionId,
        isCurrent: true,
      },
    });
    if (sameSessionCurrent) {
      throw validationError({
        toSectionId: "from and to section cannot be the same in the same session",
      });
    }
  }

  return prisma.$transaction(async (tx) => {
    const whereStudents =
      input.studentIds && input.studentIds.length
        ? { studentId: { in: input.studentIds } }
        : {};
    const current = await tx.studentEnrollment.findMany({
      where: {
        sectionId: fromSection.id,
        isCurrent: true,
        student: { campusId: input.campusId },
        ...whereStudents,
      },
    });

    if (input.studentIds?.length && current.length) {
      const found = new Set(current.map((row) => row.studentId));
      const missing = input.studentIds.filter((id) => !found.has(id));
      if (missing.length) {
        throw validationError({
          studentIds: "student is not currently enrolled in the from section",
        });
      }
    }

    const enrollmentIds: string[] = [];
    for (const row of current) {
      await tx.studentEnrollment.updateMany({
        where: { studentId: row.studentId, isCurrent: true },
        data: { isCurrent: false },
      });

      const existing = await tx.studentEnrollment.findFirst({
        where: {
          studentId: row.studentId,
          sessionId: input.toSessionId,
        },
      });
      if (existing) {
        const updated = await tx.studentEnrollment.update({
          where: { id: existing.id },
          data: {
            classId: toSection.classId,
            sectionId: toSection.id,
            isCurrent: true,
          },
        });
        enrollmentIds.push(updated.id);
        continue;
      }

      const created = await tx.studentEnrollment.create({
        data: {
          studentId: row.studentId,
          sessionId: input.toSessionId,
          classId: toSection.classId,
          sectionId: toSection.id,
          rollNo: row.rollNo,
          isCurrent: true,
        },
      });
      enrollmentIds.push(created.id);
    }

    return { promoted: current.length, enrollmentIds };
  });
}
