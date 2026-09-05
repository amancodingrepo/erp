import { campusSummary } from "@/lib/campus";
import { fail, ok } from "@/lib/http";
import { loadModuleFlags } from "@/lib/modules";
import { principalFromRequest } from "@/lib/principal";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const campus = await campusSummary(user.campusId);
    const modules = await loadModuleFlags(user.campusId);
    return ok({ user, campus, modules });
  } catch (error) {
    return fail(error);
  }
}
