import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertPlatformAdmin, getOrg, listBranches } from "@/lib/services/tenants";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "tenants", "campus", "view");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    const org = await getOrg(id);
    return ok({ data: await listBranches(org.id) });
  } catch (error) {
    return fail(error);
  }
}
