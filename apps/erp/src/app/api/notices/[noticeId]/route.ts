import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ noticeId: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { noticeId } = await context.params;
    const existing = await prisma.notice.findFirst({
      where: { id: noticeId, campusId: user.campusId },
    });
    if (!existing) throw notFound("Notice");
    await prisma.noticeView.deleteMany({ where: { noticeId: existing.id } });
    await prisma.noticeAttachment.deleteMany({ where: { noticeId: existing.id } });
    await prisma.notice.delete({ where: { id: existing.id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
