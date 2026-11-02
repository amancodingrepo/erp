import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { allocateRoom } from "@/lib/services/campus-housing";

const bodySchema = z.object({
  studentId: z.string().min(1),
  roomId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await allocateRoom({ campusId: user.campusId, ...body }));
  } catch (error) {
    return fail(error);
  }
}
