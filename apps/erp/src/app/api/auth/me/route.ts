import { campusSummary } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { schoolWorldUser } from "@/lib/school-world-shape";

export async function GET(request: Request) {
  try {
    const principal = await principalFromRequest(request);
    const [account, campus] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: principal.id } }),
      campusSummary(principal.campusId),
    ]);
    return ok({ user: schoolWorldUser(principal, account, campus) });
  } catch (error) {
    return fail(error);
  }
}
