import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listClassDeskStudents } from "@/lib/services/campus-class-desk";
import { viewingSessionId } from "@/lib/services/session-context";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    const sessionId = await viewingSessionId(request, user);
    return ok(await listClassDeskStudents(user.campusId, id, sessionId));
  } catch (error) {
    return fail(error);
  }
}
