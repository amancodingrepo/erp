import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "edit",
    );
    const { id } = await context.params;
    const session = await prisma.academicSession.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!session) throw notFound("session");
    await prisma.$transaction([
      prisma.academicSession.updateMany({
        where: { campusId: user.campusId },
        data: { isCurrent: false },
      }),
      prisma.academicSession.updateMany({
        where: { id, campusId: user.campusId },
        data: { isCurrent: true, isActive: true },
      }),
      prisma.campus.update({
        where: { id: user.campusId },
        data: { currentSessionId: id },
      }),
    ]);
    return ok(
      await prisma.academicSession.findFirst({
        where: { id, campusId: user.campusId },
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
