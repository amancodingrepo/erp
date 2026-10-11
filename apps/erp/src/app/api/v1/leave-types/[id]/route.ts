import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getLeaveType,
  patchLeaveType,
  removeLeaveType,
} from "@/lib/services/campus-desk-masters";
import { parseLeaveTypePatch } from "@/lib/services/campus-spec-aliases";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    const { id } = await context.params;
    return ok(await getLeaveType(user.campusId, id));
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
      "leave",
      "approve",
    );
    const { id } = await context.params;
    const body = parseLeaveTypePatch(await readJson(request));
    return ok(await patchLeaveType(user.campusId, id, body));
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
      "leave",
      "approve",
    );
    const { id } = await context.params;
    return ok({ data: await removeLeaveType(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
