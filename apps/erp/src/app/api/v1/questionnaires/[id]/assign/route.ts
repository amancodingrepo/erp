import { created, fail, readJson } from "@/lib/http";
import { notFound, validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { parseQuestionnaireAssign } from "@/lib/services/campus-spec-aliases";
import { listQuestionnaires } from "@/lib/services/engagement";
import { assignFeedbackForm } from "@/lib/services/feedback";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    const body = parseQuestionnaireAssign(await readJson(request));
    const forms = await listQuestionnaires(user.campusId);
    const form = forms.find((row) => row.id === id);
    if (!form) throw notFound("questionnaire");
    const opensAt = body.opensAt || form.quiz?.validFrom;
    const closesAt = body.closesAt || form.quiz?.validTill;
    if (!opensAt) throw validationError({ opensAt: "required" });
    if (!closesAt) throw validationError({ closesAt: "required" });
    return created(
      await assignFeedbackForm(user.campusId, {
        formId: form.id,
        classId: body.classId,
        opensAt,
        closesAt,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
