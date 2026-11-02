import { requestIp, writeAudit } from "@/lib/audit";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  replacePrincipals,
  saveWebsite,
} from "@/lib/services/campus-branch";
import {
  assertPlatformAdmin,
  getBranch,
  homeCampusForUser,
  parseBranchPatch,
  patchCampusFields,
} from "@/lib/services/tenants";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "view");
    assertPlatformAdmin(user);
    const home = await homeCampusForUser(user.id);
    const { id } = await context.params;
    return ok(await getBranch(home.orgId, id));
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
    const home = await homeCampusForUser(user.id);
    const { id } = await context.params;
    const patch = parseBranchPatch(await readJson(request));
    await patchCampusFields(home.orgId, id, patch.campus);
    if (patch.logoUrl !== undefined) {
      await saveWebsite(id, { logoUrl: patch.logoUrl });
    }
    if (patch.principals) {
      await replacePrincipals(id, patch.principals);
    }
    const branch = await getBranch(home.orgId, id);
    await writeAudit({
      userId: user.id,
      campusId: home.id,
      action: "update",
      entity: "campus",
      entityId: branch.id,
      after: { name: branch.name, code: branch.code },
      ip: requestIp(request),
    });
    return ok(branch);
  } catch (error) {
    return fail(error);
  }
}
