import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { assertCanChangeSuperAdmin } from "@/lib/superadmin-guard";

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
      include: { roles: { include: { role: true } } },
    });
    if (!existing) throw notFound("user");
    const body = patchSchema.parse(await readJson(request));
    const currentNames = existing.roles.map((r) => r.role.name);
    let nextRoleNames: string[] | null = null;
    let nextRoles: { id: string; name: string }[] | null = null;
    if (body.roleIds) {
      nextRoles = await prisma.role.findMany({
        where: {
          id: { in: body.roleIds },
          OR: [{ campusId: user.campusId }, { campusId: null }],
        },
      });
      nextRoleNames = nextRoles.map((role) => role.name);
    }
    await assertCanChangeSuperAdmin({
      campusId: user.campusId,
      userId: existing.id,
      currentlyActive: existing.isActive,
      currentlySuperAdmin: currentNames.includes("SuperAdmin"),
      nextIsActive: body.isActive,
      nextRoleNames,
    });
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        ...(body.email === undefined
          ? {}
          : { email: body.email === "" ? null : body.email }),
      },
    });
    if (nextRoles) {
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId: id } }),
        ...(nextRoles.length
          ? [
              prisma.userRole.createMany({
                data: nextRoles.map((role) => ({
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
