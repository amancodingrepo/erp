import { ok, created, fail, readJson } from "@/lib/http";
import { createPerson, listPeople, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    const type = new URL(request.url).searchParams.get("type") || "";
    return ok({ people: await listPeople(user.campusId, type) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ person: await createPerson(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}
