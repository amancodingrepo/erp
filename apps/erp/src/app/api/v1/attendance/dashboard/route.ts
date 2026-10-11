import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { attendanceDashboard } from "@/lib/services/directory";
import { viewingSessionId } from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "attendance", "student", "view");
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    return ok(
      await attendanceDashboard(
        user.campusId,
        date,
        await viewingSessionId(request, user),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
