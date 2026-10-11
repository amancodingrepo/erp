import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFeeRemind } from "@/lib/services/campus-spec-aliases";
import { runFeeReminders } from "@/lib/services/messages";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const body = parseFeeRemind((await readJson(request).catch(() => ({}))) ?? {});
    return ok(await runFeeReminders(user.campusId, body.channel, body.classId));
  } catch (error) {
    return fail(error);
  }
}
