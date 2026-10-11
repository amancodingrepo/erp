import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { daycareRoster } from "@/lib/services/directory";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await daycareRoster(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
