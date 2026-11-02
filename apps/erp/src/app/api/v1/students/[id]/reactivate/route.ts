import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { enableStudent } from "@/lib/services/campus-student-status";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    return ok(await enableStudent(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
