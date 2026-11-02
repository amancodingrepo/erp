import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { changeHouse, houseIdOrNull } from "@/lib/services/diary";

const bodySchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
  houseId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    return ok(
      await changeHouse(
        user.campusId,
        body.studentIds,
        houseIdOrNull(body.houseId ?? null),
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
