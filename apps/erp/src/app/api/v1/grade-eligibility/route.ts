import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listEligibility,
  saveEligibility,
} from "@/lib/services/campus-branch";
import {
  attachGradeEligibility,
  parseGradeEligibility,
} from "@/lib/services/campus-spec-aliases";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const data = attachGradeEligibility(await listEligibility(user.campusId));
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseGradeEligibility(await readJson(request));
    const row = await saveEligibility(user.campusId, body);
    return created(attachGradeEligibility([row])[0]);
  } catch (error) {
    return fail(error);
  }
}
