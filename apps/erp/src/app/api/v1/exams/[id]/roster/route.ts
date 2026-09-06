import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { examRoster } from "@/lib/services/exams";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "view");
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    return ok(
      await examRoster({
        campusId: user.campusId,
        examSubjectId: id,
        classId: params.get("classId") ?? undefined,
        sectionId: params.get("sectionId") ?? undefined,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
