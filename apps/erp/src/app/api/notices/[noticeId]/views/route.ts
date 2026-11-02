import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";

export async function POST(
  request: Request,
  context: { params: Promise<{ noticeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { noticeId } = await context.params;
    const notice = await prisma.notice.findFirst({
      where: { id: noticeId, campusId: user.campusId },
    });
    if (!notice) throw notFound("Notice");
    const existing = await prisma.noticeView.findUnique({
      where: { noticeId_viewerUserId: { noticeId: notice.id, viewerUserId: user.id } },
    });
    if (existing) return ok({ ok: true, alreadyViewed: true, viewedAt: existing.viewedAt });
    const createdView = await prisma.noticeView.create({
      data: { noticeId: notice.id, viewerUserId: user.id },
    });
    return ok({ ok: true, alreadyViewed: false, viewedAt: createdView.viewedAt });
  } catch (error) {
    return fail(error);
  }
}
