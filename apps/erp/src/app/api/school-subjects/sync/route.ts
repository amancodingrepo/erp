import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, syncSubjects } from "@/lib/school-world-bridge";

export async function PUT(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ subjects?: unknown }>(request);
    return ok({ ok: true, subjects: await syncSubjects(user.campusId, body.subjects) });
  } catch (error) {
    return fail(error);
  }
}
