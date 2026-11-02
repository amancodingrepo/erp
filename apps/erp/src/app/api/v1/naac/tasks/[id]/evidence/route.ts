import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { addNaacEvidence } from "@/lib/services/naac";

const bodySchema = z.object({
  note: z.string().optional(),
  fileUrl: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(await addNaacEvidence(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}
