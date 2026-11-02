import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getAdmissionTest,
  patchAdmissionTest,
  removeAdmissionTest,
} from "@/lib/services/campus-admission-tests";
import { parseAdmissionTestPatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await getAdmissionTest(user.campusId, id));
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
      "students",
      "profile",
      "create",
    );
    const { id } = await context.params;
    const body = parseAdmissionTestPatch(await readJson(request));
    return ok(await patchAdmissionTest(user.campusId, id, body));
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
      "students",
      "profile",
      "create",
    );
    const { id } = await context.params;
    return ok({ data: await removeAdmissionTest(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
