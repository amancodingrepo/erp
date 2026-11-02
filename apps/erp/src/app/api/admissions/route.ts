import { created, fail, ok, readJson } from "@/lib/http";
import { createAdmission, listAdmissions, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ admissions: await listAdmissions(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ admission: await createAdmission(user.campusId, user.id, body) });
  } catch (error) {
    return fail(error);
  }
}
