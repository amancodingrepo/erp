import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getExamFormWindow,
  patchExamFormWindow,
  removeExamFormWindow,
} from "@/lib/services/campus-exam-forms";
import { parseExamFormWindowPatch } from "@/lib/services/campus-spec-aliases";

function withFee(row: { feeAmount: { toString(): string } }) {
  return { ...row, feeAmount: row.feeAmount.toString() };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const { id } = await context.params;
    return ok(withFee(await getExamFormWindow(user.campusId, id)));
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
    const body = parseExamFormWindowPatch(await readJson(request));
    return ok(withFee(await patchExamFormWindow(user.campusId, id, body)));
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
    return ok({ data: await removeExamFormWindow(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
