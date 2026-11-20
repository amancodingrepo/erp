import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertPlatformAdmin, setCampusModuleFlags } from "@/lib/services/tenants";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; campusId: string }> }) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "edit");
    assertPlatformAdmin(user);
    const { id, campusId } = await context.params;
    const saved = await setCampusModuleFlags(id, campusId, await readJson(request));
    await writeAudit({ userId: user.id, campusId, action: "update", entity: "campus-modules", entityId: campusId, after: saved, ip: requestIp(request) });
    return ok(saved);
  } catch (error) { return fail(error); }
}
