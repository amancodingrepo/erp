import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listBirthdays } from "@/lib/services/campus-branch";
import { viewingSessionId } from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const url = new URL(request.url);
    const days = Math.min(
      31,
      Math.max(1, Number(url.searchParams.get("days") ?? 7) || 7),
    );
    const sessionId = await viewingSessionId(request, user);
    return ok({
      data: await listBirthdays(user.campusId, sessionId, new Date(), days, days),
    });
  } catch (error) {
    return fail(error);
  }
}
