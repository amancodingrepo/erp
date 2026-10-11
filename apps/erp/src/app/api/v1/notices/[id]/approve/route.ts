import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { approveNotice } from "@/lib/services/diary";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    return ok(await approveNotice(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
