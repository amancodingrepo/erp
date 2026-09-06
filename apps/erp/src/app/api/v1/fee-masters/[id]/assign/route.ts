import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assignMasterToClass } from "@/lib/services/fees";

const bodySchema = z.object({
  classId: z.string().min(1),
  sessionId: z.string().optional(),
  sectionId: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return ok(
      await assignMasterToClass({
        campusId: user.campusId,
        masterId: id,
        classId: body.classId,
        sessionId: body.sessionId,
        sectionId: body.sectionId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
