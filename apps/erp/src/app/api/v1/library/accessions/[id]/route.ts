import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryAccessionPatch } from "@/lib/services/campus-spec-aliases";
import {
  getAccession,
  patchAccession,
  removeAccession,
} from "@/lib/services/campus-later";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getAccession(user.campusId, id));
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
    const body = parseLibraryAccessionPatch(await readJson(request));
    return ok(await patchAccession(user.campusId, id, body.accessionNo));
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
    return ok({ data: await removeAccession(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
