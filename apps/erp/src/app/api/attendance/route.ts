import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { ownStudentsFilter } from "@/lib/school-world-shape";
import { parseDay } from "@/lib/school-world-fees";

const TO_SCHOOL: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  LEAVE: "Excused",
  HALFDAY: "Late",
  HOLIDAY: "Excused",
};

type AttendanceRow = {
  id: string;
  date: Date;
  status: string;
  note: string;
  student: {
    admissionNo: string;
    firstName: string;
    lastName: string | null;
    enrollments: Array<{ class: { name: string }; section: { name: string } }>;
  };
};

function toRecord(row: AttendanceRow) {
  return {
    id: row.id,
    studentCode: row.student.admissionNo,
    studentName: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
    className: row.student.enrollments[0]?.class.name ?? "",
    section: row.student.enrollments[0]?.section.name ?? "",
    attendanceDate: row.date,
    status: TO_SCHOOL[row.status] ?? row.status,
    note: row.note,
  };
}

const attendanceInclude = {
  student: {
    include: {
      enrollments: { where: { isCurrent: true }, include: { class: true, section: true }, take: 1 },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim() ?? "";
    if (id) {
      const row = await prisma.studentAttendance.findFirst({
        where: {
          id,
          student: { campusId: user.campusId, ...ownStudentsFilter(user) },
        },
        include: attendanceInclude,
      });
      if (!row) throw notFound("attendance");
      return ok({ record: toRecord(row) });
    }
    const requested = params.get("date");
    const day = parseDay(requested) ?? parseDay(new Date().toISOString().slice(0, 10));
    const rows = await prisma.studentAttendance.findMany({
      where: {
        date: day ?? undefined,
        student: { campusId: user.campusId, ...ownStudentsFilter(user) },
      },
      include: attendanceInclude,
      orderBy: { student: { firstName: "asc" } },
    });
    return ok({
      date: (day ?? new Date()).toISOString().slice(0, 10),
      records: rows.map((row) => toRecord(row)),
    });
  } catch (error) {
    return fail(error);
  }
}
