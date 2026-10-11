import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { roster } from "@/lib/services/attendance";
import {
  parseAttendanceQuery,
  resolveRollTarget,
} from "@/lib/services/campus-spec-aliases";
import { viewingSessionId } from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = parseAttendanceQuery(url.searchParams);
    if (parsed.book === "staff") {
      const user = await requireApiPermission(request, "hr", "staff", "view");
      const date = parseDateOnly(parsed.date);
      const staff = await prisma.staff.findMany({
        where: { campusId: user.campusId, isActive: true },
        orderBy: { firstName: "asc" },
      });
      const marks = await prisma.staffAttendance.findMany({
        where: { date, staffId: { in: staff.map((s) => s.id) } },
      });
      const byStaff = new Map(marks.map((m) => [m.staffId, m]));
      return ok({
        date: parsed.date,
        book: "staff",
        data: staff.map((s) => ({
          staffId: s.id,
          person_id: s.id,
          employeeId: s.employeeId,
          name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          status: byStaff.get(s.id)?.status ?? null,
          inTime: byStaff.get(s.id)?.inTime ?? null,
          outTime: byStaff.get(s.id)?.outTime ?? null,
        })),
      });
    }
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    if (!parsed.classId) {
      throw validationError({ classId: "required" });
    }
    const target = await resolveRollTarget(user.campusId, {
      classId: parsed.classId,
      sectionId: parsed.classId,
    });
    const data = await roster({
      campusId: user.campusId,
      sectionId: target.sectionId,
      date: parsed.date,
      subjectId: parsed.subjectId,
      sessionId: await viewingSessionId(request, user),
    });
    return ok({
      ...data,
      book: "class",
      class_id: target.sectionId,
      data: data.data.map((row) => ({ ...row, person_id: row.studentId })),
    });
  } catch (error) {
    return fail(error);
  }
}
