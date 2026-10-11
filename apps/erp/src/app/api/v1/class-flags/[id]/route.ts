import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getClassFlags,
  patchClassFlags,
  removeClassFlags,
} from "@/lib/services/campus-comms";
import { parseClassFlagsPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    return ok(await getClassFlags(user.campusId, id));
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
      "class",
      "create",
    );
    const { id } = await context.params;
    const body = parseClassFlagsPatch(await readJson(request));
    return ok(await patchClassFlags(user.campusId, id, body));
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
      "class",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeClassFlags(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
