import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiPermission(request, "exams", "results", "publish");
    const { id: examSubjectId } = await context.params;
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
    });
    if (!examSubject) throw notFound("exam subject");
    await prisma.examMark.updateMany({
      where: { examSubjectId },
      data: { finalizedAt: new Date() },
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
