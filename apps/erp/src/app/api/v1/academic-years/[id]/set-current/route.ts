import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { setCurrentSession, toAcademicYear } from "@/lib/services/session-context";

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
    const session = await setCurrentSession(user.campusId, id);
    if (!session) throw notFound("session");
    const sessions = await prisma.academicSession.findMany({
      where: { campusId: user.campusId },
      select: { id: true, sequenceNo: true },
    });
    return ok(toAcademicYear(session, sessions));
  } catch (error) {
    return fail(error);
  }
}
