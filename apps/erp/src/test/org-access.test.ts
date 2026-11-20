import { ActorType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GET as feesGet } from "@/app/api/fees/route";
import { PATCH as orgPatch } from "@/app/api/v1/orgs/[id]/route";
import { POST as orgsPost } from "@/app/api/v1/orgs/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { POST as rolesPost } from "@/app/api/v1/roles/route";
import { PUT as rolePermsPut } from "@/app/api/v1/roles/[id]/permissions/route";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { schoolModulesForCampus } from "@/lib/org-modules";
import { login, req, json, SEED_PASSWORD } from "./acceptance/helpers";
import { godToken } from "./platform-god";

describe("organisation module access", () => {
  it("blocks a teacher on fee routes when fees are off and still lets the god through", async () => {
    const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!main) throw new Error("MAIN campus missing");
    const token = await godToken();
    const code = `M${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await json(await orgsPost(req("POST", "/api/v1/orgs", token, { name: `Modules ${code}`, code })));
    expect(created.status).toBe(201);
    const orgId = String(created.body.id);
    const campus = created.body.campus as { id: string };
    const principalPassword = String(created.body.principalPassword);

    const patched = await json(await orgPatch(
      req("PATCH", `/api/v1/orgs/${orgId}`, token, { modules: { fees: false } }),
      { params: Promise.resolve({ id: orgId }) },
    ));
    expect(patched.status).toBe(200);
    expect((patched.body.modules as { fees: boolean }).fees).toBe(false);

    const teacherRole = await prisma.role.findFirst({ where: { campusId: campus.id, name: "Teacher" } });
    if (!teacherRole) throw new Error("Teacher role missing");
    await prisma.user.create({
      data: {
        campusId: campus.id,
        actorType: ActorType.STAFF,
        username: "fee-teacher",
        email: `fee-teacher@${code.toLowerCase()}.local`,
        passwordHash: await hashPassword(SEED_PASSWORD),
        isActive: true,
        firstName: "Fee",
        lastName: "Teacher",
        roles: { create: { roleId: teacherRole.id } },
      },
    });
    const teacher = await login("fee-teacher", "staff", SEED_PASSWORD, code);
    expect(teacher.status).toBe(200);
    const teacherFees = await feesGet(req("GET", "/api/fees", teacher.token!));
    expect(teacherFees.status).toBe(403);

    const switched = await json(await switchPost(req("POST", "/api/v1/auth/switch-campus", token, { campusId: campus.id })));
    expect(switched.status).toBe(200);
    const godFees = await feesGet(req("GET", "/api/fees", String(switched.body.token)));
    expect(godFees.status).toBe(200);

    const edit = await prisma.permission.findFirst({ where: { module: "settings", feature: "roles", action: "edit" } });
    const principalRole = await prisma.role.findFirst({ where: { campusId: campus.id, name: "Principal" } });
    const feeView = await prisma.permission.findFirst({ where: { module: "fees", feature: "collect", action: "view" } });
    if (!edit || !principalRole || !feeView) throw new Error("role grant setup missing");
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: principalRole.id, permissionId: edit.id } },
      update: {},
      create: { roleId: principalRole.id, permissionId: edit.id },
    });
    const principal = await login("principal", "staff", principalPassword, code);
    expect(principal.status).toBe(200);
    const named = await rolesPost(req("POST", "/api/v1/roles", principal.token!, { name: "PlatformAdmin" }));
    expect(named.status).toBe(403);
    const made = await json(await rolesPost(req("POST", "/api/v1/roles", principal.token!, { name: "Office" })));
    expect(made.status).toBe(201);
    const roleId = String(made.body.id);
    const blocked = await rolePermsPut(
      req("PUT", `/api/v1/roles/${roleId}/permissions`, principal.token!, { permissionIds: [feeView.id] }),
      { params: Promise.resolve({ id: roleId }) },
    );
    expect(blocked.status).toBe(403);
    const allowed = await rolePermsPut(
      req("PUT", `/api/v1/roles/${roleId}/permissions`, String(switched.body.token), { permissionIds: [feeView.id] }),
      { params: Promise.resolve({ id: roleId }) },
    );
    expect(allowed.status).toBe(200);

    expect((await schoolModulesForCampus(main.id)).fees).toBe(true);
  }, 120000);
});
