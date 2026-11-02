import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listMessageLogs } from "@/lib/services/messages";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    return ok({ data: await listMessageLogs(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
