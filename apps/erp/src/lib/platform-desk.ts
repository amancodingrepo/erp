import { prisma } from "./db";
import { conflict, forbidden, notFound, validationError } from "./errors";
import {
  loadPlatformModules,
  parseOrgModulePatch,
  savePlatformModules,
  type OrgModuleId,
} from "./org-modules";
import type { AuthPrincipal } from "./permissions";
import {
  newTemporaryPassword,
  resettableActor,
} from "./services/campus-user-passwords";
import { hashPassword } from "./password";
import {
  assertCanChangePlatformAdmin,
  assertCanChangeSuperAdmin,
} from "./superadmin-guard";
import { assertPlatformAdmin } from "./services/tenants";
import { ActorType } from "@prisma/client";
import { bumpSessionEpoch, requireApiPermission } from "./principal";

export async function requirePlatformDesk(request: Request, mode: "view" | "edit") {
  const user = await requireApiPermission(
    request,
    "tenants",
    "campus",
    mode === "view" ? "view" : "edit",
  );
  assertPlatformAdmin(user);
  return user;
}

function money(value: { toString(): string } | null | undefined) {
  return value ? value.toString() : "0";
}

export async function platformOverview() {
  const [schools, campuses, activeSchools, students, accounts, fees, collected] = await Promise.all([
    prisma.organization.count(),
    prisma.campus.count(),
    prisma.campus.count({ where: { isActive: true } }),
    prisma.student.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.feeInvoice.aggregate({ _sum: { total: true, paid: true } }),
    prisma.payment.aggregate({
      where: { cancelledAt: null },
      _sum: { amount: true },
    }),
  ]);
  const total = Number(fees._sum.total ?? 0);
  const paid = Number(fees._sum.paid ?? 0);
  return {
    schools,
    campuses,
    activeCampuses: activeSchools,
    students,
    accounts,
    outstanding: String(Math.max(0, total - paid)),
    collected: money(collected._sum.amount),
    modules: await loadPlatformModules(),
  };
}

export async function platformActivity(orgId?: string, q?: string) {
  const term = (q ?? "").trim().slice(0, 80);
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(orgId ? { campus: { orgId } } : {}),
      ...(term
        ? {
            OR: [
              { action: { contains: term, mode: "insensitive" } },
              { entity: { contains: term, mode: "insensitive" } },
              { user: { username: { contains: term, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { username: true, email: true } },
      campus: { select: { name: true, code: true, org: { select: { name: true, code: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    createdAt: row.createdAt,
    actor: row.user?.username || row.user?.email || "",
    school: row.campus?.org.name || "",
    campus: row.campus?.code || row.campus?.name || "",
  }));
}

export async function platformAccounts(input: { orgId?: string; q?: string }) {
  const q = (input.q ?? "").trim().slice(0, 80);
  const rows = await prisma.user.findMany({
    where: {
      ...(input.orgId ? { campus: { orgId: input.orgId } } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ username: "asc" }],
    take: 100,
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      mustChangePassword: true,
      actorType: true,
      lastLoginAt: true,
      campus: {
        select: {
          id: true,
          name: true,
          code: true,
          org: { select: { id: true, name: true, code: true } },
        },
      },
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    actorType: row.actorType,
    lastLoginAt: row.lastLoginAt,
    campusId: row.campus.id,
    campusName: row.campus.name,
    campusCode: row.campus.code,
    orgId: row.campus.org.id,
    orgName: row.campus.org.name,
    roles: row.roles.map((link) => link.role.name),
  }));
}

async function accountWithRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw notFound("user");
  return user;
}

export async function setPlatformAccountActive(actor: AuthPrincipal, userId: string, isActive: boolean) {
  const user = await accountWithRoles(userId);
  const names = user.roles.map((row) => row.role.name);
  await assertCanChangePlatformAdmin({
    userId: user.id,
    currentlyActive: user.isActive,
    currentlyPlatformAdmin: names.includes("PlatformAdmin"),
    nextIsActive: isActive,
  });
  await assertCanChangeSuperAdmin({
    campusId: user.campusId,
    userId: user.id,
    currentlyActive: user.isActive,
    currentlySuperAdmin: names.includes("SuperAdmin"),
    nextIsActive: isActive,
  });
  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  if (!isActive) await bumpSessionEpoch(user.id, user.campusId);
  return { id: user.id, isActive, actorId: actor.id };
}

export async function resetPlatformAccountPassword(userId: string) {
  const user = await accountWithRoles(userId);
  if (!resettableActor(user.actorType)) throw forbidden("cannot reset this login");
  const temporaryPassword = newTemporaryPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
  });
  await bumpSessionEpoch(user.id, user.campusId);
  return { id: user.id, username: user.username, temporaryPassword };
}

export async function platformTemplates(orgId?: string) {
  const rows = await prisma.printTemplate.findMany({
    where: orgId ? { campus: { orgId } } : {},
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    take: 100,
    select: {
      id: true,
      kind: true,
      name: true,
      body: true,
      campus: { select: { id: true, name: true, code: true, org: { select: { name: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    body: row.body,
    campusId: row.campus.id,
    campusName: row.campus.name,
    campusCode: row.campus.code,
    orgName: row.campus.org.name,
  }));
}

export async function platformRoles(campusId: string) {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { id: true, name: true, code: true },
  });
  if (!campus) throw notFound("campus");
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { campusId },
      orderBy: { name: "asc" },
      include: { grants: { select: { permissionId: true } } },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { feature: "asc" }, { action: "asc" }],
      select: { id: true, module: true, feature: true, action: true },
    }),
  ]);
  return {
    campus,
    permissions,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      locked: role.name === "SuperAdmin" || role.name === "PlatformAdmin",
      permissionIds: role.grants.map((grant) => grant.permissionId),
    })),
  };
}

export async function replacePlatformRolePermissions(roleId: string, permissionIds: string[]) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { grants: true },
  });
  if (!role?.campusId) throw notFound("role");
  if (role.name === "SuperAdmin" || role.name === "PlatformAdmin") {
    throw forbidden("cannot edit this role");
  }
  const uniqueIds = [...new Set(permissionIds)];
  const known = await prisma.permission.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (known.length !== uniqueIds.length) throw notFound("permission");
  const before = role.grants.map((grant) => grant.permissionId);
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    ...(uniqueIds.length
      ? [prisma.rolePermission.createMany({
          data: uniqueIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        })]
      : []),
  ]);
  return { roleId: role.id, campusId: role.campusId, before, permissionIds: uniqueIds };
}

export async function readPlatformModules() {
  return loadPlatformModules();
}

export async function updatePlatformTemplate(id: string, body: string) {
  const text = body.trim();
  if (!text) throw validationError({ body: "required" });
  const row = await prisma.printTemplate.findUnique({ where: { id }, select: { id: true, campusId: true } });
  if (!row) throw notFound("template");
  await prisma.printTemplate.update({ where: { id }, data: { body: text } });
  return { id: row.id, campusId: row.campusId, body: text };
}

export async function invitePlatformAdmin(usernameRaw: string) {
  const username = usernameRaw.trim();
  if (username.length < 3) throw validationError({ username: "required" });
  const main = await prisma.campus.findFirst({ where: { code: "MAIN" }, select: { id: true } });
  if (!main) throw notFound("campus");
  const taken = await prisma.user.findFirst({
    where: { campusId: main.id, username },
    select: { id: true },
  });
  if (taken) throw conflict("username already used");
  const role = await prisma.role.upsert({
    where: { campusId_name: { campusId: main.id, name: "PlatformAdmin" } },
    update: { isSystem: true },
    create: { campusId: main.id, name: "PlatformAdmin", isSystem: true },
  });
  const temporaryPassword = newTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      campusId: main.id,
      actorType: ActorType.STAFF,
      username,
      email: `${username}@main.local`,
      passwordHash: await hashPassword(temporaryPassword),
      isActive: true,
      mustChangePassword: true,
      firstName: "Platform",
      lastName: "Admin",
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return { id: user.id, username, temporaryPassword };
}

export async function retirePlatformAdmin(userId: string) {
  const user = await accountWithRoles(userId);
  const names = user.roles.map((row) => row.role.name);
  if (!names.includes("PlatformAdmin")) throw notFound("platform admin");
  await assertCanChangePlatformAdmin({
    userId: user.id,
    currentlyActive: user.isActive,
    currentlyPlatformAdmin: true,
    nextRoleNames: names.filter((name) => name !== "PlatformAdmin"),
  });
  await prisma.userRole.deleteMany({
    where: { userId: user.id, role: { name: "PlatformAdmin" } },
  });
  await bumpSessionEpoch(user.id, user.campusId);
  return { id: user.id, username: user.username };
}

export async function searchStudents(q: string) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) throw validationError({ q: "required" });
  const rows = await prisma.student.findMany({
    where: {
      OR: [
        { admissionNo: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { admissionNo: "asc" },
    take: 50,
    select: {
      id: true,
      admissionNo: true,
      firstName: true,
      lastName: true,
      status: true,
      campus: { select: { id: true, name: true, code: true, org: { select: { id: true, name: true, code: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    admissionNo: row.admissionNo,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.status,
    campusId: row.campus.id,
    campusName: row.campus.name,
    campusCode: row.campus.code,
    orgId: row.campus.org.id,
    orgName: row.campus.org.name,
    orgCode: row.campus.org.code,
  }));
}

export async function broadcastToPrincipals(actor: AuthPrincipal, titleRaw: string, bodyRaw: string) {
  const title = titleRaw.trim();
  const body = bodyRaw.trim();
  if (title.length < 2) throw validationError({ title: "required" });
  if (!body) throw validationError({ body: "required" });
  const campuses = await prisma.campus.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const archived = campuses.length
    ? await prisma.setting.findMany({
        where: { campusId: { in: campuses.map((campus) => campus.id) }, key: "org.archived" },
        select: { campusId: true, value: true },
      })
    : [];
  const skipped = new Set(
    archived
      .filter((row) => row.value && typeof row.value === "object" && !Array.isArray(row.value) && (row.value as { archived?: boolean }).archived === true)
      .map((row) => row.campusId),
  );
  const targets = campuses.filter((campus) => !skipped.has(campus.id));
  if (targets.length) {
    await prisma.notice.createMany({
      data: targets.map((campus) => ({
        campusId: campus.id,
        title,
        body,
        audience: "staff",
        audienceKey: "principal",
        channelKind: "school",
        authorUserId: actor.id,
        authorName: "Platform",
        noticeType: "News",
        board: "school",
      })),
    });
  }
  return { campuses: targets.length };
}

export async function writePlatformModules(value: unknown) {
  const patch = parseOrgModulePatch(
    value && typeof value === "object" && "modules" in (value as object)
      ? (value as { modules: unknown }).modules
      : value,
  );
  return savePlatformModules(patch);
}

export type PlatformModulePatch = Partial<Record<OrgModuleId, boolean>>;
