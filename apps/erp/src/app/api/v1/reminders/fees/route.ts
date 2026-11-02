import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { runFeeReminders } from "@/lib/services/messages";

const bodySchema = z.object({
  channel: z.enum(["EMAIL", "SMS"]).default("SMS"),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const body = bodySchema.parse((await readJson(request).catch(() => ({}))) ?? {});
    return ok(await runFeeReminders(user.campusId, body.channel));
  } catch (error) {
    return fail(error);
  }
}
