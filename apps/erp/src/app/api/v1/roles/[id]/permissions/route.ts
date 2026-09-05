import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const bodySchema = z.object({
  permissionIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "roles", "edit");
    const { id } = await context.params;
    const role = await prisma.role.findFirst({
      where: {
        id,
        OR: [{ campusId: user.campusId }, { campusId: null }],
      },
      include: { grants: true },
    });
    if (!role) throw notFound("role");
    if (role.name === "SuperAdmin") {
      throw forbidden("cannot edit SuperAdmin grants");
    }
    const body = bodySchema.parse(await readJson(request));
    let permissionIds = body.permissionIds ?? [];
    if (body.permissions?.length) {
      const perms = await prisma.permission.findMany();
      const byKey = new Map(
        perms.map((p) => [`${p.module}.${p.feature}.${p.action}`, p.id]),
      );
      permissionIds = body.permissions
        .map((key) => byKey.get(key))
        .filter((pid): pid is string => Boolean(pid));
    }
    const uniqueIds = [...new Set(permissionIds)];
    const before = role.grants.map((g) => g.permissionId);
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ...(uniqueIds.length
        ? [
            prisma.rolePermission.createMany({
              data: uniqueIds.map((permissionId) => ({
                roleId: role.id,
                permissionId,
              })),
            }),
          ]
        : []),
    ]);
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "roles.permissions.update",
      entity: "Role",
      entityId: role.id,
      before: { permissionIds: before },
      after: { permissionIds: uniqueIds },
      ip: requestIp(request),
    });
    return ok({ ok: true, permissionIds: uniqueIds });
  } catch (error) {
    return fail(error);
  }
}
