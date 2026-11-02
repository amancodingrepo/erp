import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { messageAttachment, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request, context: { params: Promise<{ messageId: string; attachmentId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { messageId, attachmentId } = await context.params;
    const file = await messageAttachment(user.campusId, user.id, decodeURIComponent(messageId), decodeURIComponent(attachmentId));
    const name = file.fileName.replace(/[^\x20-\x7E]/g, "_");
    return new NextResponse(new Uint8Array(file.fileData), {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
