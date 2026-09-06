import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { setResultBlock } from "@/lib/services/exams";

const bodySchema = z.object({
  examGroupId: z.string().min(1),
  blocked: z.boolean(),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "exams",
      "results",
      "approve",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return ok(
      await setResultBlock({
        campusId: user.campusId,
        studentId: id,
        examGroupId: body.examGroupId,
        blocked: body.blocked,
        reason: body.reason,
        userId: user.id,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
