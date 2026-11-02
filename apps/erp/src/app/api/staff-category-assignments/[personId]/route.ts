import { fail, ok, readJson } from "@/lib/http";
import { assignStaffCategory, requireStaff } from "@/lib/school-world-bridge";

export async function PUT(request: Request, context: { params: Promise<{ personId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { personId } = await context.params;
    const body = await readJson<{ categoryId?: string | null }>(request);
    return ok(await assignStaffCategory(user.campusId, decodeURIComponent(personId), String(body.categoryId || "")));
  } catch (error) {
    return fail(error);
  }
}
