import { ActorType, InvoiceStatus } from "@prisma/client";
import { campusFeeDue } from "@/lib/services/campus-later";
import { OPTIONAL_MODULES } from "@/lib/catalog/nav-permissions";
import { ensureSchoolClasses } from "@/lib/school-classes";
import { prisma } from "@/lib/db";
import { conflict, forbidden, notFound, validationError } from "@/lib/errors";
import { NAAC_CRITERIA } from "@/lib/naac-criteria";
import {
  PERMISSION_CATALOG,
  ROLE_GRANTS,
  SYSTEM_ROLES,
} from "@/lib/permission-catalog";
import type { AuthPrincipal } from "@/lib/permissions";

export const DEFAULT_CAMPUS_CODE = "MAIN";

const ENABLED_MODULES = new Set<string>(
  OPTIONAL_MODULES.filter((id) => id !== "updater"),
);

export function normalizeCampusCode(raw: string) {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (code.length < 2) {
    throw validationError({ code: "use 2+ letters or numbers" });
  }
  return code;
}

export function isPlatformAdmin(user: AuthPrincipal | null | undefined) {
  return Boolean(user?.roles.includes("PlatformAdmin"));
}

export function assertPlatformAdmin(user: AuthPrincipal) {
  if (!isPlatformAdmin(user)) {
    throw forbidden("platform admin only");
  }
}

export async function resolveCampusByCode(code?: string | null) {
  const normalized = code?.trim()
    ? normalizeCampusCode(code)
    : DEFAULT_CAMPUS_CODE;
  const campus = await prisma.campus.findFirst({
    where: { code: normalized },
    include: { org: true },
  });
  if (!campus) throw notFound("campus");
  return campus;
}

export async function listPublicCampuses() {
  return prisma.campus.findMany({
    where: { code: { not: null } },
    orderBy: { name: "asc" },
    select: { name: true, code: true },
  });
}

export async function homeCampusForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { campus: true },
  });
  if (!user) throw notFound("user");
  return user.campus;
}

export async function campusInOrg(orgId: string, campusIdOrCode: string) {
  const campus = await prisma.campus.findFirst({
    where: {
      orgId,
      OR: [{ id: campusIdOrCode }, { code: campusIdOrCode.toUpperCase() }],
    },
  });
  if (!campus) throw notFound("campus");
  return campus;
}

export async function listOrgCampuses(orgId: string) {
  const campuses = await prisma.campus.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { students: true, staff: true, users: true } },
    },
  });
  const dues = await Promise.all(
    campuses.map(async (c) => {
      const agg = await prisma.feeInvoice.aggregate({
        where: {
          student: { campusId: c.id },
          status: { in: [InvoiceStatus.DUE, InvoiceStatus.PARTIAL] },
        },
        _sum: { total: true, paid: true, discount: true },
      });
      return {
        campusId: c.id,
        feeDue: campusFeeDue(
          agg._sum.total?.toString(),
          agg._sum.paid?.toString(),
          agg._sum.discount?.toString(),
        ),
      };
    }),
  );
  const dueByCampus = new Map(dues.map((row) => [row.campusId, row.feeDue]));
  return campuses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    studentCount: c._count.students,
    staffCount: c._count.staff,
    userCount: c._count.users,
    feeDue: dueByCampus.get(c.id) ?? 0,
  }));
}

export type OrgAlias = { id: string; name: string; code: string };
export type BranchPrincipal = {
  id: string;
  classId: string;
  staffId: string;
  signatureUrl: string;
};
export type BranchAlias = {
  id: string;
  orgId: string;
  name: string;
  code: string | null;
  address: string;
  phone: string;
  email: string;
  logo: string;
  principals: BranchPrincipal[];
  studentCount?: number;
  staffCount?: number;
  userCount?: number;
  feeDue?: number;
};

export function toOrgAlias(org: { id: string; name: string; code: string }): OrgAlias {
  return { id: org.id, name: org.name, code: org.code };
}

export function toBranchAlias(
  campus: {
    id: string;
    orgId: string;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  },
  extras?: {
    logoUrl?: string;
    principals?: BranchPrincipal[];
    studentCount?: number;
    staffCount?: number;
    userCount?: number;
    feeDue?: number;
  },
): BranchAlias {
  return {
    id: campus.id,
    orgId: campus.orgId,
    name: campus.name,
    code: campus.code,
    address: campus.address ?? "",
    phone: campus.phone ?? "",
    email: campus.email ?? "",
    logo: extras?.logoUrl ?? "",
    principals: extras?.principals ?? [],
    studentCount: extras?.studentCount,
    staffCount: extras?.staffCount,
    userCount: extras?.userCount,
    feeDue: extras?.feeDue,
  };
}

export function parseOrgCreate(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ name: "required" });
  const rec = value as Record<string, unknown>;
  const name = String(rec.name ?? "").trim();
  if (name.length < 2) throw validationError({ name: "required" });
  return { name, code: normalizeCampusCode(String(rec.code ?? "")) };
}

export function parseOrgPatch(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ name: "required" });
  const rec = value as Record<string, unknown>;
  const out: { name?: string; code?: string } = {};
  if (rec.name !== undefined) {
    const name = String(rec.name).trim();
    if (name.length < 2) throw validationError({ name: "required" });
    out.name = name;
  }
  if (rec.code !== undefined) out.code = normalizeCampusCode(String(rec.code));
  if (!out.name && !out.code) throw validationError({ name: "required" });
  return out;
}

export function parseBranchPatch(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ name: "required" });
  const rec = value as Record<string, unknown>;
  const campus: {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    email?: string;
  } = {};
  if (rec.name !== undefined) {
    const name = String(rec.name).trim();
    if (name.length < 2) throw validationError({ name: "required" });
    campus.name = name;
  }
  if (rec.code !== undefined) campus.code = normalizeCampusCode(String(rec.code));
  if (rec.address !== undefined) campus.address = String(rec.address).trim();
  if (rec.phone !== undefined) campus.phone = String(rec.phone).trim();
  if (rec.email !== undefined) campus.email = String(rec.email).trim();
  let logoUrl: string | undefined;
  if (rec.logo !== undefined || rec.logoUrl !== undefined) {
    logoUrl = String(rec.logo ?? rec.logoUrl ?? "").trim();
  }
  let principals:
    | Array<{ id?: string; classId: string; staffId: string; signatureUrl?: string }>
    | undefined;
  if (rec.principals !== undefined) {
    if (!Array.isArray(rec.principals)) throw validationError({ principals: "array" });
    principals = rec.principals.map((row) => {
      if (!row || typeof row !== "object") throw validationError({ principals: "invalid" });
      const p = row as Record<string, unknown>;
      const classId = String(p.classId ?? "").trim();
      const staffId = String(p.staffId ?? "").trim();
      if (!classId) throw validationError({ classId: "required" });
      if (!staffId) throw validationError({ staffId: "required" });
      return {
        id: p.id != null ? String(p.id) : undefined,
        classId,
        staffId,
        signatureUrl: p.signatureUrl != null ? String(p.signatureUrl) : undefined,
      };
    });
  }
  if (
    !campus.name &&
    !campus.code &&
    campus.address === undefined &&
    campus.phone === undefined &&
    campus.email === undefined &&
    logoUrl === undefined &&
    principals === undefined
  ) {
    throw validationError({ name: "required" });
  }
  return { campus, logoUrl, principals };
}

export async function listOrgs() {
  const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  return orgs.map(toOrgAlias);
}

export async function getOrg(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound("org");
  return toOrgAlias(org);
}

export async function createOrg(input: { name: string; code: string }) {
  const parsed = parseOrgCreate(input);
  const clash = await prisma.organization.findFirst({ where: { code: parsed.code } });
  if (clash) throw conflict("org code already used");
  return toOrgAlias(await prisma.organization.create({ data: parsed }));
}

export async function patchOrg(orgId: string, value: unknown) {
  const patch = parseOrgPatch(value);
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound("org");
  if (patch.code && patch.code !== org.code) {
    const clash = await prisma.organization.findFirst({ where: { code: patch.code } });
    if (clash) throw conflict("org code already used");
  }
  return toOrgAlias(await prisma.organization.update({ where: { id: orgId }, data: patch }));
}

export async function patchCampusFields(
  orgId: string,
  campusId: string,
  campus: {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    email?: string;
  },
) {
  const row = await campusInOrg(orgId, campusId);
  if (campus.code && campus.code !== row.code) {
    const clash = await prisma.campus.findFirst({ where: { code: campus.code } });
    if (clash) throw conflict("campus code already used");
  }
  if (
    !campus.name &&
    !campus.code &&
    campus.address === undefined &&
    campus.phone === undefined &&
    campus.email === undefined
  ) {
    return row;
  }
  return prisma.campus.update({
    where: { id: row.id },
    data: {
      ...(campus.name ? { name: campus.name } : {}),
      ...(campus.code ? { code: campus.code } : {}),
      ...(campus.address !== undefined ? { address: campus.address } : {}),
      ...(campus.phone !== undefined ? { phone: campus.phone } : {}),
      ...(campus.email !== undefined ? { email: campus.email } : {}),
    },
  });
}

export async function attachBranchExtras(
  campus: {
    id: string;
    orgId: string;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  },
  counts?: {
    studentCount?: number;
    staffCount?: number;
    userCount?: number;
    feeDue?: number;
  },
) {
  const { getWebsite, listPrincipals } = await import("@/lib/services/campus-branch");
  const [site, principals] = await Promise.all([
    getWebsite(campus.id),
    listPrincipals(campus.id),
  ]);
  return toBranchAlias(campus, {
    logoUrl: site.logoUrl,
    principals,
    studentCount: counts?.studentCount,
    staffCount: counts?.staffCount,
    userCount: counts?.userCount,
    feeDue: counts?.feeDue,
  });
}

export async function listBranches(orgId: string) {
  const [rows, campuses] = await Promise.all([
    listOrgCampuses(orgId),
    prisma.campus.findMany({
      where: { orgId },
      select: {
        id: true,
        orgId: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
      },
    }),
  ]);
  const byId = new Map(campuses.map((row) => [row.id, row]));
  return Promise.all(
    rows.map((row) => {
      const campus = byId.get(row.id);
      if (!campus) {
        return toBranchAlias(
          {
            id: row.id,
            orgId,
            name: row.name,
            code: row.code,
            address: null,
            phone: null,
            email: null,
          },
          row,
        );
      }
      return attachBranchExtras(campus, row);
    }),
  );
}

export async function getBranch(orgId: string, campusId: string) {
  const campus = await campusInOrg(orgId, campusId);
  const counts = (await listOrgCampuses(orgId)).find((row) => row.id === campus.id);
  return attachBranchExtras(campus, counts);
}

async function ensurePermissions() {
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: {
        module_feature_action: {
          module: perm.module,
          feature: perm.feature,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }
}

async function seedRolesForCampus(
  campusId: string,
  options: { platformAdmin: boolean },
) {
  await ensurePermissions();
  const allPermissions = await prisma.permission.findMany();
  const permByKey = new Map(
    allPermissions.map((p) => [`${p.module}.${p.feature}.${p.action}`, p]),
  );
  const roles = new Map<string, { id: string }>();
  for (const name of SYSTEM_ROLES) {
    if (name === "PlatformAdmin" && !options.platformAdmin) continue;
    const role = await prisma.role.upsert({
      where: { campusId_name: { campusId, name } },
      update: { isSystem: true },
      create: { campusId, name, isSystem: true },
    });
    roles.set(name, role);
  }
  const superAdmin = roles.get("SuperAdmin");
  if (superAdmin) {
    await prisma.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
    await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: superAdmin.id,
        permissionId: p.id,
      })),
    });
  }
  for (const [roleName, grants] of Object.entries(ROLE_GRANTS)) {
    const role = roles.get(roleName);
    if (!role) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = grants
      .map((key) => permByKey.get(key))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ roleId: role.id, permissionId: p.id }));
    if (rows.length) {
      await prisma.rolePermission.createMany({ data: rows });
    }
  }
  return roles;
}

async function seedCampusDefaults(campusId: string, enableMultiCampus: boolean) {
  const defaultCategories = [
    { name: "General", code: "GEN" },
    { name: "OBC", code: "OBC" },
    { name: "SC", code: "SC" },
    { name: "ST", code: "ST" },
  ];
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { campusId, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { campusId, name: cat.name, code: cat.code },
      });
    }
  }
  for (const name of ["Left college", "Disciplinary", "Transferred"]) {
    const existing = await prisma.disableReason.findFirst({
      where: { campusId, name },
    });
    if (!existing) {
      await prisma.disableReason.create({ data: { campusId, name } });
    }
  }
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: "attendance.lockDays" } },
    update: {},
    create: { campusId, key: "attendance.lockDays", value: 7 },
  });
  for (const id of OPTIONAL_MODULES) {
    const key = `module.${id}.enabled`;
    const enabled =
      ENABLED_MODULES.has(id) || (id === "multi-campus" && enableMultiCampus);
    await prisma.setting.upsert({
      where: { campusId_key: { campusId, key } },
      update: { value: enabled },
      create: { campusId, key, value: enabled },
    });
  }
  for (const row of NAAC_CRITERIA) {
    await prisma.naacCriterion.upsert({
      where: { campusId_number: { campusId, number: row.number } },
      update: { title: row.title },
      create: { campusId, number: row.number, title: row.title },
    });
  }
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: "admission.applicationFee" } },
    update: {},
    create: { campusId, key: "admission.applicationFee", value: 500 },
  });
  await prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: { campusId, channel: "SMS", name: "fee_due" },
    },
    update: {},
    create: {
      campusId,
      channel: "SMS",
      name: "fee_due",
      body: "Dear {{name}}, fee due {{balance}} at {{campus}}. ID {{admissionNo}}.",
    },
  });
  await prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: { campusId, channel: "EMAIL", name: "fee_due" },
    },
    update: {},
    create: {
      campusId,
      channel: "EMAIL",
      name: "fee_due",
      subject: "Fee reminder — {{campus}}",
      body: "Dear {{name}}, your outstanding balance is {{balance}}.",
    },
  });
  await prisma.messageTemplate.upsert({
    where: {
      campusId_channel_name: { campusId, channel: "EMAIL", name: "portal_login" },
    },
    update: {},
    create: {
      campusId,
      channel: "EMAIL",
      name: "portal_login",
      subject: "{{campus}} {{portal}} portal login",
      body: "Dear {{name}}, your {{portal}} portal login for {{campus}} is ready.\n\nCampus code: {{campusCode}}\nUsername: {{username}}\nPassword: {{password}}\nAdmission no: {{admissionNo}}\n\nSign in at {{loginUrl}}.",
    },
  });
  await prisma.printTemplate.upsert({
    where: {
      campusId_kind_name: { campusId, kind: "CERTIFICATE", name: "Bonafide" },
    },
    update: {},
    create: {
      campusId,
      kind: "CERTIFICATE",
      name: "Bonafide",
      body: "This is to certify that {{name}} ({{admissionNo}}) is a bona fide student of {{campus}}, class {{class}} / {{section}}.",
    },
  });
  await ensureSchoolClasses(campusId);
}

async function seedDemoPeople(
  campusId: string,
  sessionId: string,
  passwordHash: string,
  roles: Map<string, { id: string }>,
) {
  const teacherRole = roles.get("Teacher");
  const studentRole = roles.get("Student");
  const parentRole = roles.get("Parent");
  if (!teacherRole || !studentRole || !parentRole) return;

  const teacherUser = await prisma.user.upsert({
    where: { campusId_username: { campusId, username: "teacher" } },
    update: { passwordHash, isActive: true, actorType: ActorType.STAFF },
    create: {
      campusId,
      actorType: ActorType.STAFF,
      username: "teacher",
      email: "teacher@campus.local",
      passwordHash,
      isActive: true,
    },
  });
  await prisma.staff.upsert({
    where: { campusId_employeeId: { campusId, employeeId: "EMP-T01" } },
    update: { userId: teacherUser.id },
    create: {
      campusId,
      userId: teacherUser.id,
      employeeId: "EMP-T01",
      firstName: "Demo",
      lastName: "Teacher",
      email: "teacher@campus.local",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: teacherUser.id } });
  await prisma.userRole.create({
    data: { userId: teacherUser.id, roleId: teacherRole.id },
  });

  const dept = await prisma.department.create({
    data: { campusId, name: "General", code: "GEN" },
  });
  const program = await prisma.program.create({
    data: {
      departmentId: dept.id,
      name: "BA",
      level: "UNDERGRADUATE",
    },
  });
  const klass = await prisma.class.create({
    data: { programId: program.id, name: "FY BA", yearNo: 1 },
  });
  const section = await prisma.section.create({
    data: { classId: klass.id, name: "A" },
  });

  const studentUser = await prisma.user.upsert({
    where: { campusId_username: { campusId, username: "student1" } },
    update: { passwordHash, isActive: true, actorType: ActorType.STUDENT },
    create: {
      campusId,
      actorType: ActorType.STUDENT,
      username: "student1",
      email: "student1@campus.local",
      passwordHash,
      isActive: true,
    },
  });
  const student = await prisma.student.upsert({
    where: { campusId_admissionNo: { campusId, admissionNo: "STU-001" } },
    update: { userId: studentUser.id, firstName: "Demo", lastName: "Student" },
    create: {
      campusId,
      userId: studentUser.id,
      admissionNo: "STU-001",
      firstName: "Demo",
      lastName: "Student",
    },
  });
  const existingEnroll = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id, sessionId, isCurrent: true },
  });
  if (!existingEnroll) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        sessionId,
        classId: klass.id,
        sectionId: section.id,
        isCurrent: true,
      },
    });
  }
  await prisma.userRole.deleteMany({ where: { userId: studentUser.id } });
  await prisma.userRole.create({
    data: { userId: studentUser.id, roleId: studentRole.id },
  });

  const parentUser = await prisma.user.upsert({
    where: { campusId_username: { campusId, username: "parent1" } },
    update: { passwordHash, isActive: true, actorType: ActorType.GUARDIAN },
    create: {
      campusId,
      actorType: ActorType.GUARDIAN,
      username: "parent1",
      email: "parent1@campus.local",
      passwordHash,
      isActive: true,
    },
  });
  const guardian = await prisma.guardian.upsert({
    where: { userId: parentUser.id },
    update: { name: "Demo Parent" },
    create: {
      userId: parentUser.id,
      name: "Demo Parent",
      phone: "9000000001",
    },
  });
  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId_relation: {
        studentId: student.id,
        guardianId: guardian.id,
        relation: "father",
      },
    },
    update: {},
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      relation: "father",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: parentUser.id } });
  await prisma.userRole.create({
    data: { userId: parentUser.id, roleId: parentRole.id },
  });
}

export async function provisionCampusTenant(input: {
  orgId: string;
  name: string;
  code: string;
  adminUsername?: string;
  adminPasswordHash: string;
  demoUsers?: boolean;
  enableMultiCampus?: boolean;
  platformAdmin?: boolean;
}) {
  const code = normalizeCampusCode(input.code);
  const existing = await prisma.campus.findFirst({ where: { code } });
  if (existing) throw conflict("campus code already used");
  const adminUsername = (input.adminUsername ?? "admin").trim().toLowerCase();
  if (!adminUsername) throw validationError({ adminUsername: "required" });

  const campus = await prisma.campus.create({
    data: {
      orgId: input.orgId,
      name: input.name.trim(),
      code,
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      currencyCode: "INR",
    },
  });
  const session = await prisma.academicSession.create({
    data: {
      campusId: campus.id,
      name: "2025-26",
      code: "2025-26",
      sequenceNo: 1,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-05-31"),
      isCurrent: true,
      isActive: true,
    },
  });
  await prisma.campus.update({
    where: { id: campus.id },
    data: { currentSessionId: session.id },
  });

  const roles = await seedRolesForCampus(campus.id, {
    platformAdmin: Boolean(input.platformAdmin),
  });
  await seedCampusDefaults(campus.id, Boolean(input.enableMultiCampus));

  const superAdmin = roles.get("SuperAdmin");
  if (!superAdmin) throw conflict("could not create campus admin role");
  const adminUser = await prisma.user.create({
    data: {
      campusId: campus.id,
      actorType: ActorType.STAFF,
      username: adminUsername,
      email: `${adminUsername}@${code.toLowerCase()}.local`,
      passwordHash: input.adminPasswordHash,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      campusId: campus.id,
      userId: adminUser.id,
      employeeId: "EMP-001",
      firstName: "Campus",
      lastName: "Admin",
      email: `${adminUsername}@${code.toLowerCase()}.local`,
    },
  });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: superAdmin.id },
  });
  if (input.platformAdmin) {
    const platform = roles.get("PlatformAdmin");
    if (platform) {
      await prisma.userRole.create({
        data: { userId: adminUser.id, roleId: platform.id },
      });
    }
  }
  if (input.demoUsers) {
    await seedDemoPeople(
      campus.id,
      session.id,
      input.adminPasswordHash,
      roles,
    );
  }
  return { campus, adminUsername };
}
