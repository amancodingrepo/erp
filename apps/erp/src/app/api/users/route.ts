import { created, fail, ok, readJson } from "@/lib/http";
import { createUser, listUsers, requireSchoolAdmin } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireSchoolAdmin(request);
    return ok({ users: await listUsers(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSchoolAdmin(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ user: await createUser(user.campusId, user.id, body) });
  } catch (error) {
    return fail(error);
  }
}
