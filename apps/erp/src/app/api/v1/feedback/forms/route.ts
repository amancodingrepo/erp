import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createFeedbackForm, listFeedbackForms } from "@/lib/services/feedback";

const bodySchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const rows = await listFeedbackForms(user.campusId);
    return ok({
      data: rows.map((f) => ({
        id: f.id,
        name: f.name,
        fields: f.fields,
        assignments: f.assignments.length,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createFeedbackForm(user.campusId, body.name));
  } catch (error) {
    return fail(error);
  }
}
