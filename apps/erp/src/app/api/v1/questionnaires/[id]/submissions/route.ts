import { created, fail, ok, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { parseQuestionnaireSubmission } from "@/lib/services/campus-spec-aliases";
import { listQuestionnaires } from "@/lib/services/engagement";
import {
  assignmentForForm,
  listFeedbackResponses,
  submitFeedback,
} from "@/lib/services/feedback";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const { id } = await context.params;
    const forms = await listQuestionnaires(user.campusId);
    if (!forms.some((row) => row.id === id)) throw notFound("questionnaire");
    const rows = await listFeedbackResponses(user.campusId);
    return ok({
      data: rows
        .filter((row) => row.formId === id)
        .map((row) => ({
          id: row.id,
          form: row.form.name,
          respondentId: row.respondentId,
          createdAt: row.createdAt,
        })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const { id } = await context.params;
    const forms = await listQuestionnaires(user.campusId);
    if (!forms.some((row) => row.id === id)) throw notFound("questionnaire");
    const body = parseQuestionnaireSubmission(await readJson(request));
    const assignment = await assignmentForForm(
      user.campusId,
      id,
      body.assignmentId,
    );
    return created(
      await submitFeedback(user.campusId, {
        assignmentId: assignment.id,
        respondentId: body.respondentId,
        answers: body.answers,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
