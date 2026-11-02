import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listContacts } from "@/lib/services/directory";
import { viewingSessionId } from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const url = new URL(request.url);
    return ok(
      await listContacts(user.campusId, {
        audience: url.searchParams.get("audience") ?? undefined,
        gender: url.searchParams.get("gender") ?? undefined,
        q: url.searchParams.get("q") ?? undefined,
        sessionId: await viewingSessionId(request, user),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
