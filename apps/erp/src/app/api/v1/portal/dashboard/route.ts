import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { portalDashboard } from "@/lib/services/portal";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const childId = new URL(request.url).searchParams.get("studentId") ?? undefined;
    return ok(await portalDashboard(user, childId ?? undefined));
  } catch (error) {
    return fail(error);
  }
}
