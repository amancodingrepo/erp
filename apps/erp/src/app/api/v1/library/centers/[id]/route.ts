import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryCenterPatch } from "@/lib/services/campus-spec-aliases";
import {
  getLibraryCenter,
  patchLibraryCenter,
  removeLibraryCenter,
} from "@/lib/services/campus-library-centers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getLibraryCenter(user.campusId, id));
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
    const body = parseLibraryCenterPatch(await readJson(request));
    return ok(await patchLibraryCenter(user.campusId, id, body.name));
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
    return ok({ data: await removeLibraryCenter(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
