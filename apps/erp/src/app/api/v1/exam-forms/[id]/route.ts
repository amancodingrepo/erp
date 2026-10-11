import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getExamForm,
  patchExamForm,
  removeExamForm,
} from "@/lib/services/campus-exam-forms";
import { parseExamFormPatch } from "@/lib/services/campus-spec-aliases";

function toForm(row: Awaited<ReturnType<typeof getExamForm>>) {
  return {
    id: row.id,
    kind: row.kind,
    subjectIds: row.subjectIds,
    feeInvoiceId: row.feeInvoiceId,
    feeAmount: row.window.feeAmount.toString(),
    createdAt: row.createdAt,
    student: {
      id: row.student.id,
      admissionNo: row.student.admissionNo,
      name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
    },
    examGroup: row.examGroup,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const { id } = await context.params;
    return ok(toForm(await getExamForm(user.campusId, id)));
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
    const body = parseExamFormPatch(await readJson(request));
    return ok(toForm(await patchExamForm(user.campusId, id, body)));
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
    return ok({ data: await removeExamForm(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
