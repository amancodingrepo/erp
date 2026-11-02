import { fail, ok } from "@/lib/http";
import { listCategoryAssignments, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ assignments: await listCategoryAssignments(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
