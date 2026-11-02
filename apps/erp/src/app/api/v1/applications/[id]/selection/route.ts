import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { setSelection } from "@/lib/services/merit";

const bodySchema = z.object({
  status: z.enum(["SELECTED", "WAITLISTED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const row = await setSelection(user.campusId, id, body.status);
    return ok({ id: row.id, selectionStatus: row.selectionStatus });
  } catch (error) {
    return fail(error);
  }
}
