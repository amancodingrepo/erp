import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listClassFlags, saveClassFlags } from "@/lib/services/campus-comms";

const bodySchema = z.object({
  classId: z.string().min(1),
  sendAbsentSms: z.boolean().optional(),
  virtualClassroom: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    return ok({ data: await listClassFlags(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await saveClassFlags(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
