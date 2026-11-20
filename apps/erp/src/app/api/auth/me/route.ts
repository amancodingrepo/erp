import { campusSummary } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { schoolWorldUser } from "@/lib/school-world-shape";
import { schoolModulesForCampus } from "@/lib/org-modules";
import { schoolBranding } from "@/lib/school-branding";

export async function GET(request: Request) {
  try {
    const principal = await principalFromRequest(request);
    const [account, campus] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: principal.id } }),
      campusSummary(principal.campusId),
    ]);
    return ok({ user: schoolWorldUser(principal, account, campus, await schoolBranding(principal.campusId), await schoolModulesForCampus(principal.campusId)) });
  } catch (error) {
    return fail(error);
  }
}
