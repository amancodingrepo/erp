import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listClassMarks,
  saveClassMarks,
} from "@/lib/services/campus-class-marks";
import { requirePerformanceTemplate } from "@/lib/services/engagement";
import { viewingSessionId } from "@/lib/services/session-context";

const putSchema = z.object({
  examId: z.string().optional(),
  entries: z.array(
    z.object({
      examSubjectId: z.string(),
      studentId: z.string(),
      marks: z.union([z.number(), z.string()]).nullable().optional(),
      isAbsent: z.boolean().optional(),
    }),
  ),
});

async function classSectionIds(campusId: string, classId: string) {
  const klass = await prisma.class.findFirst({
    where: { id: classId, program: { department: { campusId } } },
    include: { sections: { select: { id: true } } },
  });
  if (!klass) throw notFound("class");
  return klass;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    const klass = await classSectionIds(user.campusId, id);
    await requirePerformanceTemplate(
      user.campusId,
      klass.sections.map((row) => row.id),
    );
    const sessionId = await viewingSessionId(request, user);
    const examId = new URL(request.url).searchParams.get("examId");
    return ok(await listClassMarks(user.campusId, id, sessionId, examId));
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
    const { id } = await context.params;
    const klass = await classSectionIds(user.campusId, id);
    await requirePerformanceTemplate(
      user.campusId,
      klass.sections.map((row) => row.id),
    );
    const body = putSchema.parse(await readJson(request));
    const sessionId = await viewingSessionId(request, user);
    return ok(
      await saveClassMarks({
        user,
        classId: id,
        sessionId,
        examId: body.examId,
        entries: body.entries,
        request,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
