import { FeedbackFieldKind } from "@prisma/client";
import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { addFeedbackField } from "@/lib/services/feedback";

const bodySchema = z.object({
  formId: z.string().min(1),
  label: z.string().min(1),
  kind: z.nativeEnum(FeedbackFieldKind),
  options: z.array(z.string().min(1)).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await addFeedbackField(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
