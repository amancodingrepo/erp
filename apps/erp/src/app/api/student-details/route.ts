import { fail, ok } from "@/lib/http";
import { listStudentDetails, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ detailsById: await listStudentDetails(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
