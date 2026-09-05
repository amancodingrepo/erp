import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const putSchema = z.object({
  date: z.string(),
  sectionId: z.string(),
  subjectId: z.string().optional(),
  entries: z.array(
    z.object({
      studentId: z.string(),
      status: z.nativeEnum(AttendanceStatus),
    }),
  ),
});

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
    const date = params.get("date");
    const subjectId = params.get("subjectId");
    const day = date ? new Date(date) : new Date();
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        isCurrent: true,
        ...(sectionId ? { sectionId } : {}),
        student: { campusId: user.campusId },
      },
      include: { student: true },
    });
    const marks = await prisma.studentAttendance.findMany({
      where: {
        date: day,
        studentId: { in: enrollments.map((e) => e.studentId) },
        ...(subjectId ? { subjectId } : {}),
      },
    });
    const byStudent = new Map(marks.map((m) => [m.studentId, m]));
    return ok({
      date: day.toISOString().slice(0, 10),
      data: enrollments.map((e) => ({
        studentId: e.studentId,
        admissionNo: e.student.admissionNo,
        name: [e.student.firstName, e.student.lastName].filter(Boolean).join(" "),
        status: byStudent.get(e.studentId)?.status ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "edit",
    );
    const body = putSchema.parse(await readJson(request));
    const date = new Date(body.date);
    await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.studentAttendance.upsert({
          where: {
            studentId_date_subjectId: {
              studentId: entry.studentId,
              date,
              subjectId: body.subjectId ?? "",
            },
          },
          update: { status: entry.status, markedBy: user.id },
          create: {
            studentId: entry.studentId,
            date,
            subjectId: body.subjectId ?? "",
            status: entry.status,
            markedBy: user.id,
          },
        }),
      ),
    );
    return ok({ ok: true, count: body.entries.length });
  } catch (error) {
    return fail(error);
  }
}
