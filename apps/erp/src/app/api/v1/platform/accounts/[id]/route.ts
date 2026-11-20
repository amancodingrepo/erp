import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requirePlatformDesk, setPlatformAccountActive } from "@/lib/platform-desk";

const bodySchema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const updated = await setPlatformAccountActive(user, id, body.isActive);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: body.isActive ? "account.activated" : "account.deactivated",
      entity: "user",
      entityId: id,
      after: { isActive: body.isActive },
      ip: requestIp(request),
    });
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
