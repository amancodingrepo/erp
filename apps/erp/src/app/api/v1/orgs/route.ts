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
    const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "1";
    const { orgs, provisionedPrincipals } = await listOrgs({ includeArchived });
    return ok({ data: orgs, provisionedPrincipals });
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
      after: {
        id: org.id,
        name: org.name,
        code: org.code,
        campusId: org.campus.id,
        academicYear: org.campus.academicYear,
        principalUsername: org.principalUsername,
      },
      ip: requestIp(request),
    });
    return created(org);
  } catch (error) {
    return fail(error);
  }
}
