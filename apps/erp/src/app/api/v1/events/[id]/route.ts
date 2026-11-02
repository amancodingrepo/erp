import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseEventPatch } from "@/lib/services/campus-spec-aliases";
import { getEvent, patchEvent, removeEvent } from "@/lib/services/diary";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const { id } = await context.params;
    return ok(await getEvent(user.campusId, id));
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
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    const body = parseEventPatch(await readJson(request));
    return ok(await patchEvent(user.campusId, id, body));
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
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeEvent(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
