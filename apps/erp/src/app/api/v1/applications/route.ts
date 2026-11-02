import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listApplications } from "@/lib/services/applications";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const data = await listApplications(user.campusId, q);
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}
