import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ name: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const { id } = await context.params;
    const group = await prisma.examGroup.findFirst({
      where: { id, campusId: user.campusId },
      select: { id: true },
    });
    if (!group) throw notFound("exam group");
    const body = bodySchema.parse(await readJson(request));
    const exam = await prisma.exam.create({
      data: { examGroupId: group.id, name: body.name },
    });
    return created(exam);
  } catch (error) {
    return fail(error);
  }
}
