import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  replacePrincipals,
  saveWebsite,
} from "@/lib/services/campus-branch";
import {
  assertPlatformAdmin,
  getBranch,
  parseBranchPatch,
  patchCampusFields,
} from "@/lib/services/tenants";

async function campusOrgId(campusId: string) {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { orgId: true },
  });
  if (!campus) throw notFound("campus");
  return campus.orgId;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "view");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    return ok(await getBranch(await campusOrgId(id), id));
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
    const orgId = await campusOrgId(id);
    const patch = parseBranchPatch(await readJson(request));
    await patchCampusFields(orgId, id, patch.campus);
    if (patch.logoUrl !== undefined) {
      await saveWebsite(id, { logoUrl: patch.logoUrl });
    }
    if (patch.principals) {
      await replacePrincipals(id, patch.principals);
    }
    const branch = await getBranch(orgId, id);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
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
