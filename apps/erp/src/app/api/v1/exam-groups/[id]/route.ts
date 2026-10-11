import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getExamGroup,
  patchExamGroup,
  removeExamGroup,
} from "@/lib/services/campus-exam-groups";
import { parseExamGroupPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const { id } = await context.params;
    return ok(await getExamGroup(user.campusId, id));
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
    const body = parseExamGroupPatch(await readJson(request));
    return ok(await patchExamGroup(user.campusId, id, body));
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
    return ok({ data: await removeExamGroup(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
