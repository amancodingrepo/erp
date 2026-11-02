import { fail, ok } from "@/lib/http";
import { requireSchoolAdmin, resetUserPassword } from "@/lib/school-world-bridge";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const user = await requireSchoolAdmin(request);
    const { userId } = await context.params;
    return ok(await resetUserPassword(user.campusId, decodeURIComponent(userId)));
  } catch (error) {
    return fail(error);
  }
}
