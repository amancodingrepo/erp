import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getCoScholasticAspect,
  patchCoScholasticAspect,
  removeCoScholasticAspect,
} from "@/lib/services/campus-coscholastic";
import { parseNamePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    return ok(await getCoScholasticAspect(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const { id } = await context.params;
    const body = parseNamePatch(await readJson(request));
    return ok(await patchCoScholasticAspect(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const { id } = await context.params;
    return ok({ data: await removeCoScholasticAspect(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
