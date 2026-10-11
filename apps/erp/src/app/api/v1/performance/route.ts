import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { classPerformanceDesk } from "@/lib/services/engagement";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const params = new URL(request.url).searchParams;
    const classId =
      params.get("class_id")?.trim() || params.get("classId")?.trim() || "";
    if (!classId) throw validationError({ classId: "required" });
    return ok(await classPerformanceDesk(user.campusId, classId));
  } catch (error) {
    return fail(error);
  }
}
