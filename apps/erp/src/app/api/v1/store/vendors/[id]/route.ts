import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getStoreVendor,
  removeStoreVendor,
  saveStoreVendor,
} from "@/lib/services/engagement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getStoreVendor(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    await getStoreVendor(user.campusId, id);
    const body = (await readJson(request)) as { name?: unknown };
    const name = String(body?.name ?? "").trim();
    return ok(await saveStoreVendor(user.campusId, { id, name }));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return ok({ data: await removeStoreVendor(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
