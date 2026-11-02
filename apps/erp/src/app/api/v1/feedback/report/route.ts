import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { feedbackReport } from "@/lib/services/feedback";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const formId = new URL(request.url).searchParams.get("formId");
    if (!formId) throw validationError({ formId: "required" });
    return ok(await feedbackReport(user.campusId, formId));
  } catch (error) {
    return fail(error);
  }
}
