import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { composeToClass } from "@/lib/services/messages";

const bodySchema = z.object({
  templateId: z.string().min(1),
  classId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    return ok(await composeToClass({ campusId: user.campusId, ...body }));
  } catch (error) {
    return fail(error);
  }
}
