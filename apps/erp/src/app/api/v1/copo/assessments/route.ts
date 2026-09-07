import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { linkCoAssessment } from "@/lib/services/copo";

const bodySchema = z.object({
  courseOutcomeId: z.string().min(1),
  examSubjectId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await linkCoAssessment(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
