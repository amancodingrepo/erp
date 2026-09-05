import { campusSummary } from "@/lib/campus";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const campus = await campusSummary(user.campusId);
    return ok({ user, campus });
  } catch (error) {
    return fail(error);
  }
}
