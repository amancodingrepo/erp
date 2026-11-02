import { created, fail } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { checkInDaycare } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return created(await checkInDaycare(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
