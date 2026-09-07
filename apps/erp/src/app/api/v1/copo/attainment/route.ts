import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { copoAttainment } from "@/lib/services/copo";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const programId = new URL(request.url).searchParams.get("programId");
    if (!programId) throw validationError({ programId: "required" });
    return ok({ data: await copoAttainment(user.campusId, programId) });
  } catch (error) {
    return fail(error);
  }
}
