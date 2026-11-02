import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listNoticeChannels } from "@/lib/services/diary";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    return ok({ data: await listNoticeChannels(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}
