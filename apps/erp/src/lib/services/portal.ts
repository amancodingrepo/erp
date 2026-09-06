import { ActorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";
import { monthlyReport } from "@/lib/services/attendance";
import { studentMarksheet } from "@/lib/services/exams";
import { studentLedger } from "@/lib/services/fees";

export async function portalDashboard(user: AuthPrincipal, childId?: string) {
  let studentId =
    user.actorType === ActorType.STUDENT
      ? user.studentId
      : childId && user.childIds?.includes(childId)
        ? childId
        : user.childIds?.[0];
  if (!studentId) throw notFound("student");

  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId: user.campusId },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true, section: true, session: true },
        take: 1,
      },
    },
  });
  if (!student) throw notFound("student");
  const enrollment = student.enrollments[0];
  const ledger = await studentLedger({
    campusId: user.campusId,
    studentId: student.id,
  });
  const attendance = enrollment
    ? await monthlyReport({
        campusId: user.campusId,
        sectionId: enrollment.sectionId,
      })
    : { data: [] };
  const selfAttendance = attendance.data.find((r) => r.studentId === student.id);
  const notices = await prisma.notice.findMany({
    where: {
      campusId: user.campusId,
      isPublished: true,
      audience: { in: ["all", "students"] },
    },
    orderBy: { publishAt: "desc" },
    take: 8,
  });
  const exams = await studentMarksheet({
    campusId: user.campusId,
    studentId: student.id,
  });
  const children =
    user.actorType === ActorType.GUARDIAN && user.childIds?.length
      ? await prisma.student.findMany({
          where: { id: { in: user.childIds }, campusId: user.campusId },
          select: { id: true, firstName: true, lastName: true, admissionNo: true },
        })
      : [];

  return {
    actorType: user.actorType,
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: [student.firstName, student.lastName].filter(Boolean).join(" "),
      class: enrollment?.class.name ?? null,
      section: enrollment?.section.name ?? null,
    },
    children,
    dues: { balance: ledger.balance, paid: ledger.paid, total: ledger.total },
    attendancePercent: selfAttendance?.percent ?? 0,
    notices: notices.map((n) => ({ id: n.id, title: n.title, publishAt: n.publishAt })),
    timetable: {
      placeholder: true,
      nextClass: enrollment
        ? `${enrollment.class.name} / ${enrollment.section.name}`
        : null,
    },
    exams: exams.json,
  };
}
