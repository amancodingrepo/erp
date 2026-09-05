import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const sectionId = params.get("sectionId");
    const from = params.get("from");
    const to = params.get("to");
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        isCurrent: true,
        ...(sectionId ? { sectionId } : {}),
        student: { campusId: user.campusId },
      },
      include: { student: true },
    });
    const rows = await prisma.studentAttendance.findMany({
      where: {
        studentId: { in: enrollments.map((e) => e.studentId) },
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
    });
    const grouped = new Map<string, { present: number; total: number }>();
    for (const row of rows) {
      const bucket = grouped.get(row.studentId) ?? { present: 0, total: 0 };
      if (row.status !== AttendanceStatus.HOLIDAY) {
        bucket.total += 1;
        if (row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.LATE) {
          bucket.present += 1;
        }
      }
      grouped.set(row.studentId, bucket);
    }
    return ok({
      data: enrollments.map((e) => {
        const stats = grouped.get(e.studentId) ?? { present: 0, total: 0 };
        return {
          studentId: e.studentId,
          name: [e.student.firstName, e.student.lastName].filter(Boolean).join(" "),
          present: stats.present,
          total: stats.total,
          percent: stats.total ? Math.round((stats.present / stats.total) * 1000) / 10 : 0,
        };
      }),
    });
  } catch (error) {
    return fail(error);
  }
}
