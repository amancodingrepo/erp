import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  markApplicationPaid,
  paySchema,
} from "@/lib/services/applications";

export async function POST(
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
    const body = paySchema.parse(await readJson(request).catch(() => ({})));
    const row = await markApplicationPaid(user.campusId, id, body.method);
    return ok({
      id: row.id,
      paymentStatus: row.paymentStatus,
      status: row.status,
      feePaid: row.feePaid.toString(),
    });
  } catch (error) {
    return fail(error);
  }
}
