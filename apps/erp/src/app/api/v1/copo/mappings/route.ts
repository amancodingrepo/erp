import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listCoPoMappings, upsertCoPoMapping } from "@/lib/services/copo";

const bodySchema = z.object({
  courseOutcomeId: z.string().min(1),
  programOutcomeId: z.string().min(1),
  weight: z.number().int(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    return ok({ data: await listCoPoMappings(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await upsertCoPoMapping(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
