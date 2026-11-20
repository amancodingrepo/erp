import { ActorType } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { hashPassword } from "./password";
import {
  platformAccounts,
  platformOverview,
  replacePlatformRolePermissions,
  resetPlatformAccountPassword,
  setPlatformAccountActive,
} from "./platform-desk";
import { clearTenant } from "./tenant-context";

describe("platform desk", () => {
  const created: string[] = [];
  let roleId = "";

  afterAll(async () => {
    clearTenant();
    if (roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.role.delete({ where: { id: roleId } }).catch(() => undefined);
    }
    if (created.length) await prisma.user.deleteMany({ where: { id: { in: created } } });
    clearTenant();
  });

  it("lists the network, resets a school login, and keeps SuperAdmin grants locked", async () => {
    clearTenant();
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("MAIN campus missing");
    const overview = await platformOverview();
    expect(overview.schools).toBeGreaterThan(0);
    expect(overview.students).toBeGreaterThan(0);

    const username = `desk${Date.now().toString(36)}`;
    const user = await prisma.user.create({
      data: {
        campusId: campus.id,
        actorType: ActorType.STAFF,
        username,
        passwordHash: await hashPassword("Temp@12345"),
        firstName: "Desk",
        lastName: "Check",
      },
    });
    created.push(user.id);
    const listed = await platformAccounts({ orgId: campus.orgId, q: username });
    expect(listed.some((row) => row.id === user.id && row.orgId === campus.orgId)).toBe(true);

    const actor = {
      id: user.id,
      campusId: campus.id,
      actorType: "STAFF",
      roles: ["PlatformAdmin"],
      permissions: [],
    };
    await setPlatformAccountActive(actor, user.id, false);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.isActive).toBe(false);

    const reset = await resetPlatformAccountPassword(user.id);
    expect(reset.temporaryPassword.length).toBeGreaterThan(8);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.mustChangePassword).toBe(true);

    const permission = await prisma.permission.findFirst();
    if (!permission) return;
    const role = await prisma.role.create({
      data: { campusId: campus.id, name: `Desk ${username}`, isSystem: false },
    });
    roleId = role.id;
    const saved = await replacePlatformRolePermissions(role.id, [permission.id]);
    expect(saved.permissionIds).toEqual([permission.id]);
    const locked = await prisma.role.findFirst({
      where: { campusId: campus.id, name: "SuperAdmin" },
    });
    if (locked) {
      await expect(replacePlatformRolePermissions(locked.id, [])).rejects.toThrow(/cannot edit this role/);
    }
    clearTenant();
  });
});
