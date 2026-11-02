import { fail, ok } from "@/lib/http";
import { deactivateRoute, requireStaff } from "@/lib/school-world-bridge";

export async function DELETE(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    const user = await requireStaff(request);
    const { name } = await context.params;
    await deactivateRoute(user.campusId, decodeURIComponent(name));
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
