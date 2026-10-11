import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { sendEmergencySms } from "@/lib/services/campus-comms";

const bodySchema = z.object({
  body: z.string().min(1),
  classId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    return ok(await sendEmergencySms({ campusId: user.campusId, ...body }));
  } catch (error) {
    return fail(error);
  }
}
