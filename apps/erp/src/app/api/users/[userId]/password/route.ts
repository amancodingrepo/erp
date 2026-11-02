import { fail, ok, readJson } from "@/lib/http";
import { requireSchoolAdmin, setUserPassword } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const user = await requireSchoolAdmin(request);
    const { userId } = await context.params;
    const body = await readJson<{ newPassword?: string }>(request);
    return ok(await setUserPassword(user.campusId, decodeURIComponent(userId), String(body.newPassword || "")));
  } catch (error) {
    return fail(error);
  }
}
