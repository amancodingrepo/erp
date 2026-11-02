import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listAttendanceModes,
  saveAttendanceMode,
} from "@/lib/services/campus-branch";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

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
    const body = bodySchema.parse(await readJson(request));
    return created(await saveAttendanceMode(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
