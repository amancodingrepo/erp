import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseReportTemplatePatch } from "@/lib/services/campus-spec-aliases";
import {
  getReportTemplate,
  patchReportTemplate,
  removeReportTemplate,
} from "@/lib/services/engagement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    return ok(await getReportTemplate(user.campusId, id));
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
    const body = parseReportTemplatePatch(await readJson(request));
    return ok(await patchReportTemplate(user.campusId, id, body));
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
    return ok({ data: await removeReportTemplate(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
