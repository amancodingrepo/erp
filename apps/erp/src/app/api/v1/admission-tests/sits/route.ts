import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { recordAdmissionTestSit } from "@/lib/services/campus-admission-tests";

const bodySchema = z.object({
  testId: z.string().min(1),
  applicationId: z.string().min(1),
  score: z.union([z.number(), z.string()]).optional().nullable(),
  appeared: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await recordAdmissionTestSit(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
