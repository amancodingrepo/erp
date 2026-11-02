import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { parseDay } from "@/lib/school-world-fees";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const params = new URL(request.url).searchParams;
    const start = parseDay(params.get("startDate"));
    const end = parseDay(params.get("endDate"));
    if (!start || !end) {
      throw new HttpError(400, "validation_error", "Provide startDate and endDate for the attendance calendar.");
    }
    if (start > end) {
      throw new HttpError(400, "validation_error", "startDate cannot be later than endDate.");
    }
    const className = params.get("className")?.trim() ?? "";
    const academicYear = params.get("academicYear")?.trim() ?? "";
    const rows = await prisma.studentAttendance.findMany({
      where: {
        date: { gte: start, lte: end },
        student: { campusId: user.campusId },
      },
      include: {
        student: {
          include: {
            enrollments: { where: { isCurrent: true }, include: { class: true, session: true }, take: 1 },
          },
        },
      },
    });
    const buckets = new Map<string, { date: string; marked: number; present: number; absent: number; late: number; excused: number }>();
    for (const row of rows) {
      const enrollment = row.student.enrollments[0];
      if (className && enrollment?.class.name !== className) continue;
      if (academicYear && enrollment?.session.name !== academicYear) continue;
      const date = row.date.toISOString().slice(0, 10);
      const bucket = buckets.get(date) ?? { date, marked: 0, present: 0, absent: 0, late: 0, excused: 0 };
      bucket.marked += 1;
      if (row.status === "PRESENT") bucket.present += 1;
      else if (row.status === "ABSENT") bucket.absent += 1;
      else if (row.status === "LATE" || row.status === "HALFDAY") bucket.late += 1;
      else bucket.excused += 1;
      buckets.set(date, bucket);
    }
    return ok({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      summaries: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    return fail(error);
  }
}
