import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { sectionInCampus, sessionInCampus } from "@/lib/campus";

export type PromoteInput = {
  campusId: string;
  fromSectionId: string;
  toSectionId: string;
  toSessionId: string;
  studentIds: string[];
};

export type PromoteResult = {
  promoted: number;
  enrollmentIds: string[];
};

export async function promote(input: PromoteInput): Promise<PromoteResult> {
  if (!input.studentIds?.length) {
    throw validationError({ studentIds: "required" });
  }
  const fromSection = await sectionInCampus(input.campusId, input.fromSectionId);
  const toSection = await sectionInCampus(input.campusId, input.toSectionId);
  await sessionInCampus(input.campusId, input.toSessionId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.studentEnrollment.findMany({
      where: {
        sectionId: fromSection.id,
        isCurrent: true,
        studentId: { in: input.studentIds },
        student: { campusId: input.campusId },
      },
    });

    const enrollmentIds: string[] = [];
    for (const row of current) {
      const inTarget = await tx.studentEnrollment.findFirst({
        where: {
          studentId: row.studentId,
          sessionId: input.toSessionId,
          sectionId: toSection.id,
        },
      });
      if (inTarget?.isCurrent) continue;

      await tx.studentEnrollment.updateMany({
        where: { studentId: row.studentId, isCurrent: true },
        data: { isCurrent: false },
      });

      const existing =
        inTarget ??
        (await tx.studentEnrollment.findFirst({
          where: {
            studentId: row.studentId,
            sessionId: input.toSessionId,
          },
        }));
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

    return { promoted: enrollmentIds.length, enrollmentIds };
  });
}
