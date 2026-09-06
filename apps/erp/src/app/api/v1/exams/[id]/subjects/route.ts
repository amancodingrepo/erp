import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({
  subjectId: z.string(),
  dateFrom: z.string().optional(),
  startTime: z.string().optional(),
  durationMin: z.number().int().optional(),
  roomNo: z.string().optional(),
  maxMarks: z.number(),
  minMarks: z.number(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const { id } = await context.params;
    const exam = await prisma.exam.findFirst({
      where: { id, group: { campusId: user.campusId } },
      include: { subjects: true },
    });
    if (!exam) throw notFound("exam");
    return ok({ data: exam.subjects });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const { id } = await context.params;
    const exam = await prisma.exam.findFirst({
      where: { id, group: { campusId: user.campusId } },
    });
    if (!exam) throw notFound("exam");
    const body = bodySchema.parse(await readJson(request));
    const row = await prisma.examSubject.create({
      data: {
        examId: id,
        subjectId: body.subjectId,
        dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
        startTime: body.startTime,
        durationMin: body.durationMin,
        roomNo: body.roomNo,
        maxMarks: body.maxMarks,
        minMarks: body.minMarks,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
