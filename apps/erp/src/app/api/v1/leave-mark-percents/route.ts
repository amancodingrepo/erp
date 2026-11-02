import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLeaveMarkPercent } from "@/lib/services/campus-spec-aliases";
import {
  listLeaveMarksPercents,
  saveLeaveMarksPercent,
} from "@/lib/services/academics-masters";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    return ok({ data: await listLeaveMarksPercents(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const body = parseLeaveMarkPercent(await readJson(request));
    return created(await saveLeaveMarksPercent(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
