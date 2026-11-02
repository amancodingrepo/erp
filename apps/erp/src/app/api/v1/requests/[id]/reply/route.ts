import { ActorType } from "@prisma/client";
import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { requirePermission } from "@/lib/permissions";
import { replyRequest } from "@/lib/services/diary";

const bodySchema = z.object({
  body: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) {
      requirePermission(user, "communicate", "notice", "create");
    }
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(await replyRequest(user, id, body.body));
  } catch (error) {
    return fail(error);
  }
}
