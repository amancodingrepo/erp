import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    const examId = new URL(request.url).searchParams.get("examId");
    const student = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!student) throw notFound("student");
    const marks = await prisma.examMark.findMany({
      where: {
        studentId: id,
        ...(examId ? { examSubject: { examId } } : {}),
      },
      include: { examSubject: { include: { exam: true } } },
    });
    const withheld = marks.some((m) => m.isBlocked);
    if (withheld) {
      return ok({ studentId: id, status: "withheld", marks: [] });
    }
    return ok({
      studentId: id,
      status: "ok",
      marks: marks.map((m) => ({
        exam: m.examSubject.exam.name,
        subjectId: m.examSubject.subjectId,
        marks: m.marks,
        isAbsent: m.isAbsent,
        maxMarks: m.examSubject.maxMarks,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
