import { z } from "zod";
import { prisma } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const putSchema = z.object({
  entries: z.array(
    z.object({
      studentId: z.string(),
      marks: z.number().nullable().optional(),
      isAbsent: z.boolean().optional(),
    }),
  ),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiPermission(request, "exams", "marks", "view");
    const { id: examSubjectId } = await context.params;
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: { marks: true, exam: { include: { group: true } } },
    });
    if (!examSubject) throw notFound("exam subject");
    return ok(examSubject);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const { id: examSubjectId } = await context.params;
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: { marks: true },
    });
    if (!examSubject) throw notFound("exam subject");
    const finalized = examSubject.marks.some((m) => m.finalizedAt);
    if (
      finalized &&
      !user.roles.includes("SuperAdmin") &&
      !user.roles.includes("Principal")
    ) {
      throw forbidden("subject is finalized");
    }
    const body = putSchema.parse(await readJson(request));
    await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.examMark.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId,
              studentId: entry.studentId,
            },
          },
          update: {
            marks: entry.marks ?? undefined,
            isAbsent: entry.isAbsent ?? false,
          },
          create: {
            examSubjectId,
            studentId: entry.studentId,
            marks: entry.marks,
            isAbsent: entry.isAbsent ?? false,
          },
        }),
      ),
    );
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
