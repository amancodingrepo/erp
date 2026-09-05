import { StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({ reasonId: z.string().optional() });

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
    const body = bodySchema.parse(await readJson(request).catch(() => ({})));
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.DISABLED,
        disableReasonId: body.reasonId,
      },
    });
    return ok(student);
  } catch (error) {
    return fail(error);
  }
}
