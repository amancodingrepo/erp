import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getDesignation,
  patchDesignation,
  removeDesignation,
} from "@/lib/services/campus-org-masters";
import { parseNamePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    return ok(await getDesignation(user.campusId, id));
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
    const body = parseNamePatch(await readJson(request));
    return ok(await patchDesignation(user.campusId, id, body));
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
    return ok({ data: await removeDesignation(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
