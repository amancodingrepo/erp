import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  NOTICE_TYPES,
  assertChannelInCampus,
  attachNoticeMedia,
  attachNoticeReplies,
  composeChannelNotice,
  createNotice,
  listNoticeAttachments,
  listNoticeReplies,
  noticeListFilter,
  noticeWhereForChannel,
  parseChannelId,
  saveNoticeAttachment,
} from "@/lib/services/diary";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const { id } = await context.params;
    const channel = parseChannelId(decodeURIComponent(id));
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "";
    const status = url.searchParams.get("status");
    const typed = NOTICE_TYPES.includes(type as (typeof NOTICE_TYPES)[number])
      ? type
      : "";
    const data = await prisma.notice.findMany({
      where: {
        campusId: user.campusId,
        ...noticeListFilter(status),
        ...noticeWhereForChannel(channel),
        ...(typed ? { type: typed } : {}),
      },
      orderBy: { publishAt: "desc" },
    });
    const [attachments, replies] = await Promise.all([
      listNoticeAttachments(user.campusId),
      listNoticeReplies(user.campusId),
    ]);
    return ok({
      data: attachNoticeReplies(attachNoticeMedia(data, attachments), replies),
      channel,
    });
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
    const channelId = decodeURIComponent(id);
    await assertChannelInCampus(user.campusId, channelId);
    const composed = composeChannelNotice(channelId, await readJson(request));
    const notice = await createNotice(user.campusId, composed);
    if (composed.attachmentUrl) {
      await saveNoticeAttachment(user.campusId, {
        noticeId: notice.id,
        name: composed.attachmentName || composed.title,
        url: composed.attachmentUrl,
      });
    }
    return created(notice);
  } catch (error) {
    return fail(error);
  }
}
