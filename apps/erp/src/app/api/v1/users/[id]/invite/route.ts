import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { issuePasswordReset } from "@/lib/password-reset";
import { requireApiPermission } from "@/lib/principal";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "users", "edit");
    const { id } = await context.params;
    const target = await prisma.user.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!target) throw notFound("user");
    const token = await issuePasswordReset(target.id);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "users.invite",
      entity: "User",
      entityId: id,
      ip: requestIp(request),
    });
    return ok({ token });
  } catch (error) {
    return fail(error);
  }
}
