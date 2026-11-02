import { fail, ok, readJson } from "@/lib/http";
import { getQuestionnaire, requireStaff, saveQuestionnaire } from "@/lib/school-world-bridge";

export async function GET(request: Request, context: { params: Promise<{ questionnaireId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { questionnaireId } = await context.params;
    return ok({ questionnaire: await getQuestionnaire(user.campusId, decodeURIComponent(questionnaireId)) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ questionnaireId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { questionnaireId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    return ok({ questionnaire: await saveQuestionnaire(user.campusId, body, decodeURIComponent(questionnaireId)) });
  } catch (error) {
    return fail(error);
  }
}
