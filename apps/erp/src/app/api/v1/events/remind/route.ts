import { z } from "zod";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { runEventReminders, saveRemindHours } from "@/lib/services/campus-comms";

const bodySchema = z.object({
  hours: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "edit",
    );
    const text = await request.text();
    const body = bodySchema.parse(text ? JSON.parse(text) : {});
    if (body.hours != null) {
      await saveRemindHours(user.campusId, body.hours);
    }
    return ok(await runEventReminders(user.campusId));
  } catch (error) {
    return fail(error);
  }
}
