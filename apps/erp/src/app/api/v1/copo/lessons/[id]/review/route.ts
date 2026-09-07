import { CopoLessonStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { reviewCopoLesson } from "@/lib/services/copo";

const bodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return ok(
      await reviewCopoLesson(user.campusId, id, body.status as CopoLessonStatus),
    );
  } catch (error) {
    return fail(error);
  }
}
