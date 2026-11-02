import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listEligibility, saveEligibility } from "@/lib/services/campus-branch";

const bodySchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  fromBirthDate: z.string().min(1),
  toBirthDate: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listEligibility(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveEligibility(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
