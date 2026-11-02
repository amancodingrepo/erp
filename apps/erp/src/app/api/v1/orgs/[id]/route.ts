import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  assertPlatformAdmin,
  getOrg,
  patchOrg,
} from "@/lib/services/tenants";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "view");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    return ok(await getOrg(id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "edit");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    const org = await patchOrg(id, await readJson(request));
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "update",
      entity: "org",
      entityId: org.id,
      after: org,
      ip: requestIp(request),
    });
    return ok(org);
  } catch (error) {
    return fail(error);
  }
}
