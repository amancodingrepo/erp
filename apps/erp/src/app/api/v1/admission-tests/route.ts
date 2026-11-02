import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listAdmissionTests,
  listAdmissionTestSits,
  saveAdmissionTest,
} from "@/lib/services/campus-admission-tests";
import { parseAdmissionTest } from "@/lib/services/campus-spec-aliases";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [data, sits] = await Promise.all([
      listAdmissionTests(user.campusId),
      listAdmissionTestSits(user.campusId),
    ]);
    return ok({ data, sits });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "create");
    const body = parseAdmissionTest(await readJson(request));
    return created(await saveAdmissionTest(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
