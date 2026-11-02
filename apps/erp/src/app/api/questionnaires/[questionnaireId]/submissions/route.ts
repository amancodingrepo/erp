import { fail, ok } from "@/lib/http";
import { getQuestionnaire, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request, context: { params: Promise<{ questionnaireId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { questionnaireId } = await context.params;
    await getQuestionnaire(user.campusId, decodeURIComponent(questionnaireId));
    return ok({ submissions: [] });
  } catch (error) {
    return fail(error);
  }
}
