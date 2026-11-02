import { z } from "zod";
import { validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  parsePromoteProcedure,
  promote,
  promoteNeedsTarget,
} from "@/lib/services/promotion";

const bodySchema = z.object({
  fromSectionId: z.string().min(1),
  toSectionId: z.string().optional(),
  toSessionId: z.string().optional(),
  studentIds: z.array(z.string().min(1)).min(1),
  procedure: z.string().optional(),
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
    const procedure = parsePromoteProcedure(body.procedure);
    if (promoteNeedsTarget(procedure)) {
      if (!body.toSectionId) throw validationError({ toSectionId: "required" });
      if (!body.toSessionId) throw validationError({ toSessionId: "required" });
    }
    const result = await promote({
      campusId: user.campusId,
      fromSectionId: body.fromSectionId,
      toSectionId: body.toSectionId,
      toSessionId: body.toSessionId,
      studentIds: body.studentIds,
      procedure,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
