import { prisma } from "@/lib/db";
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
    await prisma.$transaction([
      prisma.academicSession.updateMany({
        where: { campusId: user.campusId },
        data: { isCurrent: false },
      }),
      prisma.academicSession.update({
        where: { id },
        data: { isCurrent: true, isActive: true },
      }),
      prisma.campus.update({
        where: { id: user.campusId },
        data: { currentSessionId: id },
      }),
    ]);
    const session = await prisma.academicSession.findUnique({ where: { id } });
    return ok(session);
  } catch (error) {
    return fail(error);
  }
}
