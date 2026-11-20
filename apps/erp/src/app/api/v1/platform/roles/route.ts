import { fail, ok } from "@/lib/http";
import { platformRoles, requirePlatformDesk } from "@/lib/platform-desk";
import { validationError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    const campusId = new URL(request.url).searchParams.get("campusId") || "";
    if (!campusId) throw validationError({ campusId: "required" });
    return ok(await platformRoles(campusId));
  } catch (error) {
    return fail(error);
  }
}
