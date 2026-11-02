import { AttendanceStatus } from "@prisma/client";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { markStaff, markStudents } from "@/lib/services/attendance";
import { withAttendanceIdempotency } from "@/lib/services/campus-attendance-idempotency";
import {
  parseAttendanceDay,
  resolveRollTarget,
} from "@/lib/services/campus-spec-aliases";

export async function PUT(request: Request) {
  try {
    const parsed = parseAttendanceDay(await readJson(request));
    if (parsed.book === "staff") {
      const user = await requireApiPermission(request, "hr", "staff", "edit");
      const entries = parsed.entries.flatMap((row) => {
        if (!row.staffId || !row.status) return [];
        if (
          !Object.values(AttendanceStatus).includes(row.status as AttendanceStatus)
        ) {
          return [];
        }
        return [
          {
            staffId: row.staffId,
            status: row.status as AttendanceStatus,
            inTime: row.inTime,
            outTime: row.outTime,
          },
        ];
      });
      return ok(
        await withAttendanceIdempotency(user.campusId, request, parsed, () =>
          markStaff({
            user,
            date: parsed.date,
            override: parsed.override,
            entries,
          }),
        ),
      );
    }
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "edit",
    );
    const target = await resolveRollTarget(user.campusId, {
      classId: parsed.classId!,
      sectionId: parsed.classId!,
    });
    return ok(
      await withAttendanceIdempotency(user.campusId, request, parsed, () =>
        markStudents({
          user,
          date: parsed.date,
          sectionId: target.sectionId,
          subjectId: parsed.subjectId,
          override: parsed.override,
          entries: parsed.entries.map((row) => ({
            studentId: row.studentId!,
            status: row.status,
            source: row.source,
          })),
        }),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
