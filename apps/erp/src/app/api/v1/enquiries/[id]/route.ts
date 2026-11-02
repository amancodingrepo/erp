import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  convertEnquiryToApplication,
  updateEnquiryStatus,
} from "@/lib/services/front-office";

const bodySchema = z.object({
  status: z.enum(["UNASSIGNED", "ASSIGNED", "WON", "LOST"]).optional(),
  assignedTo: z.string().optional(),
  convert: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    if (body.convert) {
      return ok(await convertEnquiryToApplication(user.campusId, id));
    }
    if (!body.status) {
      return ok(await updateEnquiryStatus(user.campusId, id, "ASSIGNED", body.assignedTo));
    }
    return ok(
      await updateEnquiryStatus(user.campusId, id, body.status, body.assignedTo),
    );
  } catch (error) {
    return fail(error);
  }
}
