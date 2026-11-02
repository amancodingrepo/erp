import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { assertCampusStaff } from "@/lib/school-world-shape";

const NOTICE_TYPES = new Set(["News", "Alert", "Homework - Worksheet", "Homework - Assignment"]);
const BOARDS = new Set(["school", "class", "route"]);

function decodeDataUrl(value: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  if (!match) throw new HttpError(400, "validation_error", "An attachment was not a base64 data URL.");
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  return { mime: match[1], buffer };
}

function mapNotice(row: {
  id: string;
  academicYear: string;
  board: string;
  audienceKey: string;
  noticeType: string;
  body: string;
  authorName: string;
  createdAt?: Date;
  publishAt: Date;
  allowReply: boolean;
  isPublished: boolean;
  attachments?: { id: string; fileName: string; contentType: string; fileSize: number }[];
  views?: { viewerUserId: string; viewedAt: Date }[];
}) {
  const attachments = (row.attachments ?? []).map((file) => ({
    id: file.id,
    name: file.fileName,
    type: file.contentType,
    size: file.fileSize,
    downloadUrl: `/api/notices/${row.id}/attachments/${file.id}`,
  }));
  const viewRecords = (row.views ?? []).map((view) => ({
    userId: view.viewerUserId,
    viewedAt: view.viewedAt,
    viewStatus: "Viewed",
    fullName: "",
  }));
  return {
    id: row.id,
    year: row.academicYear,
    board: row.board,
    audience: row.audienceKey,
    type: row.noticeType,
    message: row.body,
    author: row.authorName,
    createdAt: row.publishAt,
    attachments,
    allowReply: row.allowReply,
    views: viewRecords.length,
    viewRecords,
    isPublished: row.isPublished,
  };
}

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const year = new URL(request.url).searchParams.get("year")?.trim() ?? "";
    const rows = await prisma.notice.findMany({
      where: { campusId: user.campusId, isPublished: true, ...(year ? { academicYear: year } : {}) },
      include: { attachments: true, views: true },
      orderBy: { publishAt: "desc" },
    });
    return ok({ notices: rows.map(mapNotice) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const body = await readJson<{
      year?: string;
      board?: string;
      audience?: string;
      type?: string;
      message?: string;
      author?: string;
      allowReply?: boolean;
      attachments?: { name?: string; dataUrl?: string }[];
    }>(request);
    const year = String(body.year || "").trim();
    const board = String(body.board || "").trim();
    const audience = String(body.audience || "").trim();
    const type = String(body.type || "").trim();
    const message = String(body.message || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (!year || !BOARDS.has(board) || !audience || !NOTICE_TYPES.has(type) || (!message && !attachments.length)) {
      throw new HttpError(400, "validation_error", "Provide academic year, category, audience, notice type and message or attachment.");
    }
    if (attachments.length > 5) {
      throw new HttpError(400, "validation_error", "A notice may contain at most 5 attachments.");
    }
    const files = attachments.map((file) => {
      const decoded = decodeDataUrl(String(file.dataUrl || ""));
      return { name: String(file.name || "attachment").slice(0, 180), ...decoded };
    });
    const total = files.reduce((sum, file) => sum + file.buffer.length, 0);
    if (files.some((file) => file.buffer.length > 2 * 1024 * 1024) || total > 2 * 1024 * 1024) {
      throw new HttpError(413, "payload_too_large", "Attachments are limited to 2 MB total per notice.");
    }
    const account = await prisma.user.findUnique({ where: { id: user.id } });
    const author = String(body.author || "").trim() || [account?.firstName, account?.lastName].filter(Boolean).join(" ");
    const notice = await prisma.notice.create({
      data: {
        campusId: user.campusId,
        title: (message || type).slice(0, 180),
        body: message || "(attachment)",
        audience,
        audienceKey: audience,
        board,
        noticeType: type,
        academicYear: year,
        allowReply: Boolean(body.allowReply),
        authorName: author,
        authorUserId: user.id,
        attachments: {
          create: files.map((file) => ({
            fileName: file.name,
            contentType: file.mime,
            fileSize: file.buffer.length,
            fileData: file.buffer,
          })),
        },
      },
      include: { attachments: true, views: true },
    });
    return created({ notice: mapNotice(notice) });
  } catch (error) {
    return fail(error);
  }
}
