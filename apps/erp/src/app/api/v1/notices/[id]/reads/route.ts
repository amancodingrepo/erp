import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertCampusStaff } from "@/lib/school-world-shape";
import { noticeReads } from "@/lib/services/diary";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    // Who has and hasn't read a notice names other families: staff only.
    assertCampusStaff(user);
    const { id } = await context.params;
    return ok(await noticeReads(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}
