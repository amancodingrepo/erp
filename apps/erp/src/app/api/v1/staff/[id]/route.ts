import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const staff = await prisma.staff.findFirst({
      where: { id, campusId: user.campusId },
      include: { department: true, designation: true, user: true },
    });
    if (!staff) throw notFound("staff");
    return ok(staff);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    const existing = await prisma.staff.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("staff");
    const body = patchSchema.parse(await readJson(request));
    const staff = await prisma.staff.update({
      where: { id },
      data: body,
    });
    return ok(staff);
  } catch (error) {
    return fail(error);
  }
}
