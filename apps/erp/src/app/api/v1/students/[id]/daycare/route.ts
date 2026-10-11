import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { upsertDaycare } from "@/lib/services/diary";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";

const bodySchema = z.object({
  enrolled: z.boolean(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  allowCctv: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const row = await prisma.studentDaycare.findUnique({ where: { studentId: id } });
    return ok(row ?? { studentId: id, enrolled: false, allowCctv: false });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!student) throw notFound("student");
    const body = bodySchema.parse(await readJson(request));
    return ok(await upsertDaycare(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}
