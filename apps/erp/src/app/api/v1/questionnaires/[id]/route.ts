import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseQuestionnairePatch } from "@/lib/services/campus-spec-aliases";
import {
  getQuestionnaire,
  patchQuestionnaire,
  removeQuestionnaire,
} from "@/lib/services/engagement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const { id } = await context.params;
    return ok(await getQuestionnaire(user.campusId, id));
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
    const body = parseQuestionnairePatch(await readJson(request));
    return ok(await patchQuestionnaire(user.campusId, id, body));
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
    return ok({ data: await removeQuestionnaire(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
