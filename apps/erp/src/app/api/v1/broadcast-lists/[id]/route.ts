import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseBroadcastList } from "@/lib/services/campus-spec-aliases";
import {
  getBroadcastList,
  removeBroadcastList,
  saveBroadcastList,
} from "@/lib/services/directory";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getBroadcastList(user.campusId, id));
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
    await getBroadcastList(user.campusId, id);
    const body = parseBroadcastList(await readJson(request));
    return ok(await saveBroadcastList(user.campusId, { ...body, id }));
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
    return ok({ data: await removeBroadcastList(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
