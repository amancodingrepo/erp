import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseDaycarePunch } from "@/lib/services/campus-spec-aliases";
import { checkInDaycare } from "@/lib/services/diary";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseDaycarePunch(await readJson(request));
    return created(await checkInDaycare(user.campusId, body.studentId));
  } catch (error) {
    return fail(error);
  }
}
