import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { replacePlatformRolePermissions, requirePlatformDesk } from "@/lib/platform-desk";

const bodySchema = z.object({ permissionIds: z.array(z.string()) });

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePlatformDesk(request, "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const saved = await replacePlatformRolePermissions(id, body.permissionIds);
    await writeAudit({
      userId: user.id,
      campusId: saved.campusId,
      action: "roles.permissions.update",
      entity: "Role",
      entityId: id,
      before: { permissionIds: saved.before },
      after: { permissionIds: saved.permissionIds },
      ip: requestIp(request),
    });
    return ok({ ok: true, permissionIds: saved.permissionIds });
  } catch (error) {
    return fail(error);
  }
}
