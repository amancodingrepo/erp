import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listFeedbackResponses,
  submitFeedback,
} from "@/lib/services/feedback";

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  respondentId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const rows = await listFeedbackResponses(user.campusId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        form: r.form.name,
        respondentId: r.respondentId,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const body = bodySchema.parse(await readJson(request));
    return created(await submitFeedback(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
