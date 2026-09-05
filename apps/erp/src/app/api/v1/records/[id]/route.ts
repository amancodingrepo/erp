import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const { id } = await context.params;
    const existing = await prisma.screenRecord.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("record");
    await prisma.screenRecord.delete({ where: { id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
