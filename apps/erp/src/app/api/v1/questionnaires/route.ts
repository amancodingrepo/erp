import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createQuestionnaire,
  listQuestionnaires,
} from "@/lib/services/engagement";

const bodySchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  validFrom: z.string().optional(),
  validTill: z.string().optional(),
  classId: z.string().optional(),
  questions: z
    .array(z.object({ label: z.string().min(1), marks: z.number() }))
    .optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    return ok({ data: await listQuestionnaires(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await createQuestionnaire(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
