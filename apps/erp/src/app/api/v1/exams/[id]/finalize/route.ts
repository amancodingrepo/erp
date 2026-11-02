import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { finalizeSubject } from "@/lib/services/exams";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "exams",
      "results",
      "publish",
    );
    const { id } = await context.params;
    return ok(
      await finalizeSubject({ user, examSubjectId: id, request }),
    );
  } catch (error) {
    return fail(error);
  }
}
