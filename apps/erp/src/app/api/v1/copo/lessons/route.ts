import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createCopoLesson, listCopoLessons } from "@/lib/services/copo";

const bodySchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  courseOutcomeId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    return ok({ data: await listCopoLessons(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createCopoLesson(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
