import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseClassTeacherPatch } from "@/lib/services/campus-spec-aliases";
import {
  getClassTeacher,
  patchClassTeacher,
  removeClassTeacher,
} from "@/lib/services/session-context";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    return ok(await getClassTeacher(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "edit");
    const { id } = await context.params;
    const body = parseClassTeacherPatch(await readJson(request));
    return ok(await patchClassTeacher(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "edit");
    const { id } = await context.params;
    return ok({ data: await removeClassTeacher(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
