import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getExternalLink,
  patchExternalLink,
  removeExternalLink,
} from "@/lib/services/campus-branch";
import { parseExternalLinkPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    const { id } = await context.params;
    return ok(await getExternalLink(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    const body = parseExternalLinkPatch(await readJson(request));
    return ok(await patchExternalLink(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    return ok({ data: await removeExternalLink(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
