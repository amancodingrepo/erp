import { fail, ok, readJson } from "@/lib/http";
import { requireStaff, saveStaffCategory } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { categoryId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ category: await saveStaffCategory(user.campusId, body, decodeURIComponent(categoryId)) });
  } catch (error) {
    return fail(error);
  }
}
