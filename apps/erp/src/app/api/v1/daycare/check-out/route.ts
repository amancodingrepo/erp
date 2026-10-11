import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseDaycarePunch } from "@/lib/services/campus-spec-aliases";
import { checkOutDaycare } from "@/lib/services/diary";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseDaycarePunch(await readJson(request));
    return ok(await checkOutDaycare(user.campusId, body.studentId));
  } catch (error) {
    return fail(error);
  }
}
