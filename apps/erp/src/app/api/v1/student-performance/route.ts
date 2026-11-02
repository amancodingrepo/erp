import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { classPerformanceDesk } from "@/lib/services/engagement";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const classId = new URL(request.url).searchParams.get("classId") ?? "";
    if (!classId.trim()) throw validationError({ classId: "required" });
    return ok(await classPerformanceDesk(user.campusId, classId));
  } catch (error) {
    return fail(error);
  }
}
