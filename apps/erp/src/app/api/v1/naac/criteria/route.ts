import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { ensureNaacCriteria } from "@/lib/services/naac";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await ensureNaacCriteria(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
