import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { completeNaacAssignment } from "@/lib/services/naac";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return ok(await completeNaacAssignment(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
