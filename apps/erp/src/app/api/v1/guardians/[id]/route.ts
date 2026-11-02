import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { patchGuardian } from "@/lib/services/campus-student-guardians";

const patchSchema = z
  .object({
    name: z.string().optional(),
    relation: z.string().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    occupation: z.string().nullable().optional(),
    aadhaar: z.string().optional(),
    altPhone: z.string().optional(),
    education: z.string().optional(),
    photoUrl: z.string().optional(),
    residentialAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    sameAsResidential: z.boolean().optional(),
  })
  .passthrough();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    return ok(await patchGuardian(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}
