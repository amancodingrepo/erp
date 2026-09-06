import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ reason: z.string().optional() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "leave",
      "approve",
    );
    const { id } = await context.params;
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, leaveType: { campusId: user.campusId } },
    });
    if (!existing) throw notFound("leave request");
    const body = bodySchema.parse(await readJson(request).catch(() => ({})));
    const row = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approverId: user.id,
        reason: body.reason ?? existing.reason,
      },
    });
    return ok(row);
  } catch (error) {
    return fail(error);
  }
}
