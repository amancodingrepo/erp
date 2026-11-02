import { fail, ok } from "@/lib/http";
import { listNamedCatalog, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ categories: await listNamedCatalog(user.campusId, "categories") });
  } catch (error) {
    return fail(error);
  }
}
