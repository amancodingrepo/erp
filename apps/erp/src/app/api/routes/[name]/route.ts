import { fail, ok, readJson } from "@/lib/http";
import { deactivateRoute, renameRoute, requireStaff } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ name: string }> }) {
  try {
    const user = await requireStaff(request);
    const { name } = await context.params;
    const body = await readJson<{ name?: string }>(request);
    return ok({ route: await renameRoute(user.campusId, decodeURIComponent(name), String(body.name || "")) });
  } catch (error) {
    return fail(error);
  }
}

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
