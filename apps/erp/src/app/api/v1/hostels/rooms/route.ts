import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createRoom } from "@/lib/services/campus-housing";

const bodySchema = z.object({
  hostelId: z.string().min(1),
  number: z.string().min(1),
  capacity: z.number().int().min(1),
  roomType: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createRoom(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
