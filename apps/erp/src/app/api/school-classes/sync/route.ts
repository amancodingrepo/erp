import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, syncClasses } from "@/lib/school-world-bridge";

export async function PUT(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ classes?: unknown }>(request);
    return ok({ ok: true, classes: await syncClasses(user.campusId, body.classes) });
  } catch (error) {
    return fail(error);
  }
}
