import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { promote } from "@/lib/services/promotion";

const bodySchema = z.object({
  fromSectionId: z.string().min(1),
  toSectionId: z.string().min(1),
  toSessionId: z.string().min(1),
  studentIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    const result = await promote({
      campusId: user.campusId,
      fromSectionId: body.fromSectionId,
      toSectionId: body.toSectionId,
      toSessionId: body.toSessionId,
      studentIds: body.studentIds,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
