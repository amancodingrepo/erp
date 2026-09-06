import { StudentStatus } from "@prisma/client";
import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ reasonId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "delete",
    );
    const { id } = await context.params;
    const existing = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("student");
    const body = bodySchema.parse(await readJson(request));
    const reason = await prisma.disableReason.findFirst({
      where: { id: body.reasonId, campusId: user.campusId },
    });
    if (!reason) {
      throw notFound("disable reason");
    }
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.DISABLED,
        disableReasonId: body.reasonId,
      },
    });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "students.disable",
      entity: "Student",
      entityId: id,
      before: { status: existing.status },
      after: { status: StudentStatus.DISABLED, reasonId: body.reasonId ?? null },
      ip: requestIp(request),
    });
    return ok(student);
  } catch (error) {
    return fail(error);
  }
}
