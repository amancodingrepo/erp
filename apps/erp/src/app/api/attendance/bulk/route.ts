import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { parseDay } from "@/lib/school-world-fees";
import { assertCampusStaff } from "@/lib/school-world-shape";

const TO_ERP: Record<string, AttendanceStatus> = {
  Present: AttendanceStatus.PRESENT,
  Absent: AttendanceStatus.ABSENT,
  Late: AttendanceStatus.LATE,
  Excused: AttendanceStatus.LEAVE,
};

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const body = await readJson<{ date?: string; records?: Array<{ studentCode?: string; status?: string; note?: string }> }>(request);
    const day = parseDay(body.date);
    const records = Array.isArray(body.records) ? body.records : [];
    if (!day || !records.length || records.length > 2000) {
      throw new HttpError(400, "validation_error", "Provide an attendance date and between 1 and 2,000 student records.");
    }
    await prisma.$transaction(async (tx) => {
      for (const item of records) {
        const code = String(item.studentCode || "").trim();
        const status = TO_ERP[String(item.status || "").trim()];
        if (!code || !status) {
          throw new HttpError(400, "validation_error", "Each attendance row requires a student ID and a supported status.");
        }
        const student = await tx.student.findFirst({
          where: { campusId: user.campusId, admissionNo: code },
        });
        if (!student) throw notFound(`Student ${code}`);
        await tx.studentAttendance.upsert({
          where: {
            studentId_date_subjectId: { studentId: student.id, date: day, subjectId: "" },
          },
          update: { status, markedBy: user.id, note: String(item.note || "") },
          create: {
            studentId: student.id,
            date: day,
            subjectId: "",
            status,
            markedBy: user.id,
            note: String(item.note || ""),
          },
        });
      }
    });
    return ok({ ok: true, date: day.toISOString().slice(0, 10), saved: records.length });
  } catch (error) {
    return fail(error);
  }
}
