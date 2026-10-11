import { requestIp, writeAudit } from "@/lib/audit";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  assertPlatformAdmin,
  createOrg,
  listOrgs,
  parseOrgCreate,
} from "@/lib/services/tenants";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "view");
    assertPlatformAdmin(user);
    return ok({ data: await listOrgs() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "tenants",
      "campus",
      "create",
    );
    assertPlatformAdmin(user);
    const body = parseOrgCreate(await readJson(request));
    const org = await createOrg(body);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "create",
      entity: "org",
      entityId: org.id,
      after: org,
      ip: requestIp(request),
    });
    return created(org);
  } catch (error) {
    return fail(error);
  }
}
