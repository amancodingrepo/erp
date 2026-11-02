import { fail, ok } from "@/lib/http";
import { listSubjects, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ subjects: await listSubjects(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
