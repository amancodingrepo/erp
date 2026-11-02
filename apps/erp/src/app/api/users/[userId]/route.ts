import { fail, ok, readJson } from "@/lib/http";
import { patchUser, requireSchoolAdmin } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const user = await requireSchoolAdmin(request);
    const { userId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ user: await patchUser(user.campusId, user.id, decodeURIComponent(userId), body) });
  } catch (error) {
    return fail(error);
  }
}
