import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { prisma } from "@/lib/db";
import {
  listCoScholastic,
  saveCoScholasticEntry,
} from "@/lib/services/campus-coscholastic";
import { requirePerformanceTemplate } from "@/lib/services/engagement";

const bodySchema = z.object({
  aspectId: z.string().min(1),
  grade: z.string().min(1),
  remark: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    return ok({ data: await listCoScholastic(user.campusId, id) });
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
    const student = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
      include: {
        enrollments: { where: { isCurrent: true }, select: { sectionId: true } },
      },
    });
    if (!student) throw notFound("student");
    await requirePerformanceTemplate(
      user.campusId,
      student.enrollments.map((row) => row.sectionId),
    );
    const body = bodySchema.parse(await readJson(request));
    return ok(
      await saveCoScholasticEntry(user.campusId, {
        studentId: student.id,
        aspectId: body.aspectId,
        grade: body.grade,
        remark: body.remark,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
