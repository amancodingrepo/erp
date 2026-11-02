import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, syncNamedCatalog } from "@/lib/school-world-bridge";

export async function PUT(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ categories?: unknown }>(request);
    return ok({ ok: true, categories: await syncNamedCatalog(user.campusId, "categories", body.categories) });
  } catch (error) {
    return fail(error);
  }
}
