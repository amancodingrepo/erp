import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { deleteNotice } from "@/lib/services/diary";

export async function DELETE(
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
    return ok(await deleteNotice(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
