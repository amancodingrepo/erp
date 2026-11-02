import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listNoticeReplies, saveNoticeReply } from "@/lib/services/diary";

const bodySchema = z.object({
  body: z.string().min(1),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const { id } = await context.params;
    return ok({ data: await listNoticeReplies(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(
      await saveNoticeReply(user.campusId, {
        noticeId: id,
        body: body.body,
        authorRole: "staff",
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
