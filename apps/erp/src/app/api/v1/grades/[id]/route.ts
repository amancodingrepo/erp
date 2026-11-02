import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getGrade,
  patchGrade,
  removeGrade,
} from "@/lib/services/campus-desk-masters";
import { parseGradePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const { id } = await context.params;
    return ok(await getGrade(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const { id } = await context.params;
    const body = parseGradePatch(await readJson(request));
    return ok(await patchGrade(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const { id } = await context.params;
    return ok({ data: await removeGrade(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
