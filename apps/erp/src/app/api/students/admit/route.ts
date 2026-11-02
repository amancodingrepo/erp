import { created, fail, readJson } from "@/lib/http";
import { admitStudent, requireStaff } from "@/lib/school-world-bridge";

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created(await admitStudent(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
