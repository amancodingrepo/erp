import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { routeMap } from "@/lib/services/campus-route-stops";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok({ data: await routeMap(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
