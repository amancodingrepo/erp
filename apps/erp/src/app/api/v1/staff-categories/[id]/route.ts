import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getStaffCategory,
  removeStaffCategory,
  saveStaffCategory,
} from "@/lib/services/campus-staff-categories";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    return ok(await getStaffCategory(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    await getStaffCategory(user.campusId, id);
    const body = (await readJson(request)) as { name?: unknown };
    const name = String(body?.name ?? "").trim();
    return ok(await saveStaffCategory(user.campusId, { id, name }));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    return ok({ data: await removeStaffCategory(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
