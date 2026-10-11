import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getEligibility,
  patchEligibility,
  removeEligibility,
} from "@/lib/services/campus-branch";
import {
  attachGradeEligibility,
  parseGradeEligibilityPatch,
} from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    const row = await getEligibility(user.campusId, id);
    return ok(attachGradeEligibility([row])[0]);
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
    const body = parseGradeEligibilityPatch(await readJson(request));
    const row = await patchEligibility(user.campusId, id, body);
    return ok(attachGradeEligibility([row])[0]);
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
    return ok({ data: await removeEligibility(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
