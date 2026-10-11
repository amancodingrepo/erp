import { classInCampus } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseClassReportTemplate } from "@/lib/services/campus-spec-aliases";
import {
  classReportTemplate,
  saveClassReportTemplate,
} from "@/lib/services/engagement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    await classInCampus(user.campusId, id);
    return ok({ data: await classReportTemplate(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const { id } = await context.params;
    const body = parseClassReportTemplate(await readJson(request));
    return ok({
      data: await saveClassReportTemplate(user.campusId, id, body.templateId),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}
