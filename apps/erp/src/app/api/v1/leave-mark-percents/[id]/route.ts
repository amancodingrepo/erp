import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLeaveMarkPercentPatch } from "@/lib/services/campus-spec-aliases";
import {
  getLeaveMarksPercent,
  removeLeaveMarksPercent,
  saveLeaveMarksPercent,
} from "@/lib/services/academics-masters";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    return ok(await getLeaveMarksPercent(user.campusId, id));
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
    const existing = await getLeaveMarksPercent(user.campusId, id);
    const body = parseLeaveMarkPercentPatch(await readJson(request));
    return ok(
      await saveLeaveMarksPercent(user.campusId, {
        id,
        leaveTypeId: body.leaveTypeId ?? existing.leaveTypeId,
        percent: body.percent ?? existing.percent,
      }),
    );
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
    return ok({ data: await removeLeaveMarksPercent(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
