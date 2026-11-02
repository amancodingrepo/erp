import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getAttendanceMode,
  patchAttendanceMode,
  removeAttendanceMode,
} from "@/lib/services/campus-branch";
import { parseAttendanceModePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "attendance", "student", "view");
    const { id } = await context.params;
    return ok(await getAttendanceMode(user.campusId, id));
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
      "attendance",
      "student",
      "edit",
    );
    const { id } = await context.params;
    const body = parseAttendanceModePatch(await readJson(request));
    return ok(await patchAttendanceMode(user.campusId, id, body.name));
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
      "attendance",
      "student",
      "edit",
    );
    const { id } = await context.params;
    return ok({ data: await removeAttendanceMode(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
