import { StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";

export async function disableStudent(
  campusId: string,
  studentId: string,
  reasonId: string,
) {
  const existing = await prisma.student.findFirst({
    where: { id: studentId, campusId },
  });
  if (!existing) throw notFound("student");
  const reason = await prisma.disableReason.findFirst({
    where: { id: reasonId, campusId },
  });
  if (!reason) throw notFound("disable reason");
  const student = await prisma.student.update({
    where: { id: studentId },
    data: {
      status: StudentStatus.DISABLED,
      disableReasonId: reasonId,
    },
  });
  return { student, previousStatus: existing.status };
}

export async function enableStudent(campusId: string, studentId: string) {
  const existing = await prisma.student.findFirst({
    where: { id: studentId, campusId },
  });
  if (!existing) throw notFound("student");
  return prisma.student.update({
    where: { id: studentId },
    data: { status: StudentStatus.ACTIVE, disableReasonId: null },
  });
}
