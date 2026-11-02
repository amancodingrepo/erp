import { fail, ok, readJson } from "@/lib/http";
import { requireSchoolAdmin, saveSchoolSettings } from "@/lib/school-world-bridge";

export async function PATCH(request: Request) {
  try {
    const user = await requireSchoolAdmin(request);
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ school: await saveSchoolSettings(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}
