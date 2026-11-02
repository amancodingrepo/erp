import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  NOTICE_CHANNELS,
  NOTICE_TYPES,
  attachNoticeMedia,
  attachNoticeReplies,
  createNotice,
  listNoticeAttachments,
  listNoticeReplies,
  noticeListFilter,
  saveNoticeAttachment,
} from "@/lib/services/diary";

const AUDIENCE = ["all", "staff", "students", "class"] as const;

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(AUDIENCE).optional(),
  channelKind: z.enum(NOTICE_CHANNELS).optional(),
  type: z.enum(NOTICE_TYPES).optional(),
  allowReply: z.boolean().optional(),
  hashTag: z.string().optional(),
  classId: z.string().optional(),
  routeId: z.string().optional(),
  publishAt: z.string().optional(),
  isPublished: z.boolean().optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const url = new URL(request.url);
    const audience = url.searchParams.get("audience");
    const channelKind = url.searchParams.get("channelKind");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const data = await prisma.notice.findMany({
      where: {
        campusId: user.campusId,
        ...noticeListFilter(status),
        ...(audience ? { audience } : {}),
        ...(channelKind ? { channelKind } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { publishAt: "desc" },
    });
    const [attachments, replies] = await Promise.all([
      listNoticeAttachments(user.campusId),
      listNoticeReplies(user.campusId),
    ]);
    return ok({
      data: attachNoticeReplies(attachNoticeMedia(data, attachments), replies),
    });
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
    const body = createSchema.parse(await readJson(request));
    const notice = await createNotice(user.campusId, body);
    if (body.attachmentUrl) {
      await saveNoticeAttachment(user.campusId, {
        noticeId: notice.id,
        name: body.attachmentName || body.title,
        url: body.attachmentUrl,
      });
    }
    return created(notice);
  } catch (error) {
    return fail(error);
  }
}
