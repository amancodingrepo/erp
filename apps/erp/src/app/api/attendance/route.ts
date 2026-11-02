import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { parseDay } from "@/lib/school-world-fees";

const TO_SCHOOL: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  LEAVE: "Excused",
  HALFDAY: "Late",
  HOLIDAY: "Excused",
};

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const requested = new URL(request.url).searchParams.get("date");
    const day = parseDay(requested) ?? parseDay(new Date().toISOString().slice(0, 10));
    const rows = await prisma.studentAttendance.findMany({
      where: {
        date: day ?? undefined,
        student: { campusId: user.campusId },
      },
      include: {
        student: {
          include: {
            enrollments: { where: { isCurrent: true }, include: { class: true, section: true }, take: 1 },
          },
        },
      },
      orderBy: { student: { firstName: "asc" } },
    });
    return ok({
      date: (day ?? new Date()).toISOString().slice(0, 10),
      records: rows.map((row) => ({
        id: row.id,
        studentCode: row.student.admissionNo,
        studentName: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
        className: row.student.enrollments[0]?.class.name ?? "",
        section: row.student.enrollments[0]?.section.name ?? "",
        attendanceDate: row.date,
        status: TO_SCHOOL[row.status] ?? row.status,
        note: row.note,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
