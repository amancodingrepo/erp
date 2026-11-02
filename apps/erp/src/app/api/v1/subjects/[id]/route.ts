import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getSubject,
  patchSubject,
  removeSubject,
} from "@/lib/services/academics-masters";
import { parseSubjectPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "subject", "view");
    const { id } = await context.params;
    return ok(await getSubject(user.campusId, id));
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
      "academics",
      "subject",
      "create",
    );
    const { id } = await context.params;
    const body = parseSubjectPatch(await readJson(request));
    return ok(await patchSubject(user.campusId, id, body));
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
      "academics",
      "subject",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeSubject(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
