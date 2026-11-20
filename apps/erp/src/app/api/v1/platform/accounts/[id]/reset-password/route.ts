import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok } from "@/lib/http";
import { requirePlatformDesk, resetPlatformAccountPassword } from "@/lib/platform-desk";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const { id } = await context.params;
    const reset = await resetPlatformAccountPassword(id);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "account.password_reset",
      entity: "user",
      entityId: id,
      after: { username: reset.username },
      ip: requestIp(request),
    });
    return ok(reset);
  } catch (error) {
    return fail(error);
  }
}
