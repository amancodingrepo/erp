import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listPrintTemplates } from "@/lib/services/print-docs";
import {
  assignReportTemplate,
  listReportTemplateAssigns,
  saveReportTemplate,
} from "@/lib/services/engagement";

const bodySchema = z.object({
  name: z.string().optional(),
  body: z.string().optional(),
  sectionId: z.string().optional(),
  templateId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const [templates, assigns] = await Promise.all([
      listPrintTemplates(user.campusId, "MARKSHEET"),
      listReportTemplateAssigns(user.campusId),
    ]);
    return ok({ data: templates, assigns });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const body = bodySchema.parse(await readJson(request));
    if (body.templateId && body.sectionId) {
      return ok(
        await assignReportTemplate(user.campusId, {
          sectionId: body.sectionId,
          templateId: body.templateId,
        }),
      );
    }
    return created(
      await saveReportTemplate(user.campusId, {
        name: body.name ?? "",
        body: body.body ?? "",
        sectionId: body.sectionId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
