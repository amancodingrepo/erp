import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { setCurrentSession } from "@/lib/services/session-context";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "edit",
    );
    const { id } = await context.params;
    return ok(await setCurrentSession(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
