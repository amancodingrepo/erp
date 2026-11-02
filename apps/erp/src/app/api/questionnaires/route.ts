import { created, fail, ok, readJson } from "@/lib/http";
import { listQuestionnaires, requireStaff, saveQuestionnaire } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ questionnaires: await listQuestionnaires(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ questionnaire: await saveQuestionnaire(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}
