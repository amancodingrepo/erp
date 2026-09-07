import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assignTransport } from "@/lib/services/campus-housing";

const bodySchema = z.object({
  studentId: z.string().min(1),
  routeId: z.string().min(1),
  pickupPointId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await assignTransport({ campusId: user.campusId, ...body }));
  } catch (error) {
    return fail(error);
  }
}
