import { fail, ok } from "@/lib/http";
import { listClasses, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ classes: await listClasses(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
