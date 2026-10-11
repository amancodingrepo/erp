import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getMessageTemplate,
  patchMessageTemplate,
  removeMessageTemplate,
} from "@/lib/services/campus-comms";
import { parseMessageTemplatePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const { id } = await context.params;
    return ok(await getMessageTemplate(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "edit");
    const { id } = await context.params;
    const body = parseMessageTemplatePatch(await readJson(request));
    return ok(await patchMessageTemplate(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "edit");
    const { id } = await context.params;
    return ok({ data: await removeMessageTemplate(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
