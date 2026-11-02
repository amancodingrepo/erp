import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { noticeReceipts } from "@/lib/services/diary";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const { id } = await context.params;
    return ok(await noticeReceipts(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
