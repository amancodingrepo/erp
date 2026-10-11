import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { resetCampusUserPassword } from "@/lib/services/campus-user-passwords";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "users", "edit");
    const { id } = await context.params;
    const data = await resetCampusUserPassword(user, id);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "users.reset-password",
      entity: "User",
      entityId: id,
      ip: requestIp(request),
    });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
