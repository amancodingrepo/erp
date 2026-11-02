import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getCategory,
  patchCategory,
  removeCategory,
} from "@/lib/services/campus-org-masters";
import { parseOrgMasterPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getCategory(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    const { id } = await context.params;
    const body = parseOrgMasterPatch(await readJson(request));
    return ok(await patchCategory(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeCategory(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
