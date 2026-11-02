import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";

export async function GET(
  request: Request,
  context: { params: Promise<{ noticeId: string; attachmentId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { noticeId, attachmentId } = await context.params;
    const file = await prisma.noticeAttachment.findFirst({
      where: { id: attachmentId, noticeId, notice: { campusId: user.campusId, isPublished: true } },
    });
    if (!file) throw notFound("Attachment");
    const filename = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\r\n]/g, "_");
    return new Response(file.fileData, {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Length": String(file.fileSize),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
