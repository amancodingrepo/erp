import { ok, fail } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { checkOutDaycare } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return ok(await checkOutDaycare(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
