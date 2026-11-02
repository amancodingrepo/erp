import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { siblingsFor } from "@/lib/services/engagement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const { id } = await context.params;
    return ok(await siblingsFor(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
