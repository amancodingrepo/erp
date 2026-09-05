import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "users", "edit");
    const { id } = await context.params;
    const existing = await prisma.user.findFirst({
      where: { id, campusId: user.campusId },
      include: { roles: true },
    });
    if (!existing) throw notFound("user");
    const body = patchSchema.parse(await readJson(request));
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        ...(body.email === undefined
          ? {}
          : { email: body.email === "" ? null : body.email }),
      },
    });
    if (body.roleIds) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: body.roleIds },
          OR: [{ campusId: user.campusId }, { campusId: null }],
        },
      });
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId: id } }),
        ...(roles.length
          ? [
              prisma.userRole.createMany({
                data: roles.map((role) => ({
                  userId: id,
                  roleId: role.id,
                })),
              }),
            ]
          : []),
      ]);
    }
    if (body.isActive === false && existing.isActive) {
      await writeAudit({
        userId: user.id,
        campusId: user.campusId,
        action: "users.disable",
        entity: "User",
        entityId: id,
        before: { isActive: true },
        after: { isActive: false },
        ip: requestIp(request),
      });
    }
    return ok({
      id: updated.id,
      isActive: updated.isActive,
      email: updated.email,
    });
  } catch (error) {
    return fail(error);
  }
}
