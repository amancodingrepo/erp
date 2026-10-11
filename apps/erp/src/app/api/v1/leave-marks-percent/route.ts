import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listLeaveMarksPercents,
  saveLeaveMarksPercent,
} from "@/lib/services/academics-masters";

const bodySchema = z.object({
  id: z.string().optional(),
  leaveTypeId: z.string().min(1),
  percent: z.number(),
});

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
    const body = bodySchema.parse(await readJson(request));
    return created(await saveLeaveMarksPercent(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
