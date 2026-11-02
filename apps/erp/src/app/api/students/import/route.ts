import { fail, ok, readJson } from "@/lib/http";
import { importStudents, requireStaff } from "@/lib/school-world-bridge";

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ students?: unknown[] }>(request);
    return ok(await importStudents(user.campusId, body.students || []));
  } catch (error) {
    return fail(error);
  }
}
