import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createCourseOutcome, listCourseOutcomes } from "@/lib/services/copo";

const bodySchema = z.object({
  subjectId: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const subjectId = new URL(request.url).searchParams.get("subjectId") ?? undefined;
    return ok({ data: await listCourseOutcomes(user.campusId, subjectId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createCourseOutcome(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
