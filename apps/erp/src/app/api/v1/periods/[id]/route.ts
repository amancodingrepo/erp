import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getPeriod,
  patchPeriod,
  removePeriod,
} from "@/lib/services/campus-desk-masters";
import { parsePeriodPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    return ok(await getPeriod(user.campusId, id));
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
    const body = parsePeriodPatch(await readJson(request));
    return ok(await patchPeriod(user.campusId, id, body));
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
    return ok({ data: await removePeriod(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
