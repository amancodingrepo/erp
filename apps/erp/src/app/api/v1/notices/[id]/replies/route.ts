import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { canSeeNotice, canSeeReply, noticeViewer } from "@/lib/notice-audience";
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
    const viewer = await noticeViewer(user);
    if (!viewer.staff) {
      const notice = await prisma.notice.findFirst({ where: { id, campusId: user.campusId } });
      if (!notice || !canSeeNotice(notice, viewer)) throw notFound("notice");
    }
    const replies = await listNoticeReplies(user.campusId, id);
    return ok({ data: replies.filter((reply) => canSeeReply(reply, viewer)) });
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
