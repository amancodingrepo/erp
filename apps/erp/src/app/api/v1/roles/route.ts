import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  cloneFromId: z.string().optional(),
});

function grantKey(g: {
  permission: { module: string; feature: string; action: string };
}) {
  return `${g.permission.module}.${g.permission.feature}.${g.permission.action}`;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "roles", "view");
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        where: { OR: [{ campusId: user.campusId }, { campusId: null }] },
        include: { grants: { include: { permission: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { feature: "asc" }, { action: "asc" }],
      }),
    ]);
    return ok({
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        isSystem: role.isSystem,
        campusId: role.campusId,
        grants: role.grants.map(grantKey),
        permissionIds: role.grants.map((g) => g.permissionId),
      })),
      permissions: permissions.map((p) => ({
        id: p.id,
        key: `${p.module}.${p.feature}.${p.action}`,
        module: p.module,
        feature: p.feature,
        action: p.action,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "roles", "edit");
    const body = createSchema.parse(await readJson(request));
    const role = await prisma.role.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        isSystem: false,
      },
    });
    if (body.cloneFromId) {
      const source = await prisma.role.findFirst({
        where: {
          id: body.cloneFromId,
          OR: [{ campusId: user.campusId }, { campusId: null }],
        },
        include: { grants: true },
      });
      if (source?.grants.length) {
        await prisma.rolePermission.createMany({
          data: source.grants.map((g) => ({
            roleId: role.id,
            permissionId: g.permissionId,
          })),
        });
      }
    }
    return created(role);
  } catch (error) {
    return fail(error);
  }
}
