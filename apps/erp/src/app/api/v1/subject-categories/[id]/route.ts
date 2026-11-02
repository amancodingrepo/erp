import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getSubjectCategory,
  removeSubjectCategory,
  saveSubjectCategory,
} from "@/lib/services/academics-masters";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "subject", "view");
    const { id } = await context.params;
    return ok(await getSubjectCategory(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "subject", "create");
    const { id } = await context.params;
    await getSubjectCategory(user.campusId, id);
    const body = (await readJson(request)) as { name?: unknown };
    const name = String(body?.name ?? "").trim();
    return ok(await saveSubjectCategory(user.campusId, { id, name }));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "subject", "create");
    const { id } = await context.params;
    return ok({ data: await removeSubjectCategory(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
