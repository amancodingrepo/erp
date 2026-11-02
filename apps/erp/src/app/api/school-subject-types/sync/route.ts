import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, syncNamedCatalog } from "@/lib/school-world-bridge";

export async function PUT(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ subjectTypes?: unknown }>(request);
    return ok({ ok: true, subjectTypes: await syncNamedCatalog(user.campusId, "subjectTypes", body.subjectTypes) });
  } catch (error) {
    return fail(error);
  }
}
