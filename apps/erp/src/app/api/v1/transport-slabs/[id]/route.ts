import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseTransportSlabPatch } from "@/lib/services/campus-spec-aliases";
import {
  getTransportSlab,
  patchCampusTransportSlab,
  removeTransportSlab,
} from "@/lib/services/campus-transport-ops";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getTransportSlab(user.campusId, id));
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
    const body = parseTransportSlabPatch(await readJson(request));
    return ok(await patchCampusTransportSlab(user.campusId, id, body));
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
    return ok({ data: await removeTransportSlab(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
