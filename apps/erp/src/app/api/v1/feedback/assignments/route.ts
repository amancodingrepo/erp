import { FeedbackAudience } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  assignFeedbackForm,
  listOpenFeedbackAssignments,
} from "@/lib/services/feedback";

const bodySchema = z.object({
  formId: z.string().min(1),
  classId: z.string().optional(),
  audience: z.nativeEnum(FeedbackAudience).optional(),
  opensAt: z.string().min(1),
  closesAt: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const rows = await listOpenFeedbackAssignments(user.campusId);
    return ok({
      data: rows.map((a) => ({
        id: a.id,
        opensAt: a.opensAt,
        closesAt: a.closesAt,
        form: { id: a.form.id, name: a.form.name, fields: a.form.fields },
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
    return created(await assignFeedbackForm(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
