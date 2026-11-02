import { fail, ok, readJson } from "@/lib/http";
import { getQuestionnaire, requireStaff, saveQuestionnaire } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ questionnaireId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { questionnaireId } = await context.params;
    const id = decodeURIComponent(questionnaireId);
    const current = await getQuestionnaire(user.campusId, id);
    const body = await readJson<{ allClasses?: boolean; classes?: unknown }>(request);
    const questionnaire = await saveQuestionnaire(user.campusId, {
      questionnaire: { ...current, allClasses: Boolean(body.allClasses), classes: body.classes || [] },
    }, id);
    return ok({ questionnaire });
  } catch (error) {
    return fail(error);
  }
}
