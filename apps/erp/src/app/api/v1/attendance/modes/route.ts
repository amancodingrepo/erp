import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listAttendanceModes,
  saveAttendanceMode,
} from "@/lib/services/campus-branch";
import { parseAttendanceMode } from "@/lib/services/campus-spec-aliases";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "attendance", "student", "view");
    return ok({ data: await listAttendanceModes(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "edit",
    );
    const body = parseAttendanceMode(await readJson(request));
    return created(await saveAttendanceMode(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
