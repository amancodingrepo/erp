import { z } from "zod";
import { prisma } from "@/lib/db";
import { forbidden } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { assertNewGrantsAllowed, schoolModulesForCampus } from "@/lib/org-modules";
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
      modules: await schoolModulesForCampus(user.campusId),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "roles", "edit");
    const body = createSchema.parse(await readJson(request));
    if (body.name.trim().toLowerCase() === "platformadmin" && !user.roles.includes("PlatformAdmin")) {
      throw forbidden("only a platform admin can grant platform access");
    }
    let cloneIds: string[] = [];
    if (body.cloneFromId) {
      const source = await prisma.role.findFirst({
        where: {
          id: body.cloneFromId,
          OR: [{ campusId: user.campusId }, { campusId: null }],
        },
        include: { grants: true },
      });
      cloneIds = source?.grants.map((grant) => grant.permissionId) ?? [];
      await assertNewGrantsAllowed(user, [], cloneIds);
    }
    const role = await prisma.role.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        isSystem: false,
      },
    });
    if (cloneIds.length) {
      await prisma.rolePermission.createMany({
        data: cloneIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
    return created(role);
  } catch (error) {
    return fail(error);
  }
}
