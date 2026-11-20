import { randomBytes } from "node:crypto";
import { ActorType, InvoiceStatus, type PrismaClient } from "@prisma/client";
import { campusFeeDue } from "@/lib/services/campus-later";
import { OPTIONAL_MODULES } from "@/lib/catalog/nav-permissions";
import { ensureSchoolClasses } from "@/lib/school-classes";
import { prisma } from "@/lib/db";
import { conflict, forbidden, notFound, prismaErrorCode, validationError } from "@/lib/errors";
import { NAAC_CRITERIA } from "@/lib/naac-criteria";
import { hashPassword } from "@/lib/password";
import {
  PERMISSION_CATALOG,
  ROLE_GRANTS,
  SYSTEM_ROLES,
} from "@/lib/permission-catalog";
import type { AuthPrincipal } from "@/lib/permissions";
import {
  CAMPUS_MODULES_KEY,
  loadOrgModules,
  ORG_MODULES_KEY,
  parseOrgModulePatch,
  parseOrgModules,
  saveCampusModules,
  saveOrgModules,
  type OrgModuleId,
} from "@/lib/org-modules";

type RoleDb = Pick<PrismaClient, "permission" | "role" | "rolePermission">;

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
  timezone: string;
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
    timezone?: string | null;
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
    timezone: campus.timezone || "Asia/Kolkata",
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
  const out: {
    name?: string;
    code?: string;
    isActive?: boolean;
    modules?: Partial<Record<OrgModuleId, boolean>>;
  } = {};
  if (rec.name !== undefined) {
    const name = String(rec.name).trim();
    if (name.length < 2) throw validationError({ name: "required" });
    out.name = name;
  }
  if (rec.code !== undefined) out.code = normalizeCampusCode(String(rec.code));
  if (rec.isActive !== undefined) {
    if (typeof rec.isActive !== "boolean") throw validationError({ isActive: "boolean" });
    out.isActive = rec.isActive;
  }
  if (rec.modules !== undefined) out.modules = parseOrgModulePatch(rec.modules);
  if (!out.name && !out.code && out.isActive === undefined && !out.modules) {
    throw validationError({ name: "required" });
  }
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
    timezone?: string;
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
  if (rec.timezone !== undefined) {
    const timezone = String(rec.timezone).trim();
    if (!timezone || timezone.length > 80) throw validationError({ timezone: "required" });
    campus.timezone = timezone;
  }
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
    campus.timezone === undefined &&
    logoUrl === undefined &&
    principals === undefined
  ) {
    throw validationError({ name: "required" });
  }
  return { campus, logoUrl, principals };
}

export type OrgCampusRow = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  currentSessionId: string | null;
  academicYear: string | null;
  studentCount: number;
  principalUsername: string | null;
  maintenance: boolean;
  modules: Record<OrgModuleId, boolean>;
};

export type OrgListRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  archived: boolean;
  modules: Record<OrgModuleId, boolean>;
  campuses: OrgCampusRow[];
};

export type ProvisionedPrincipal = {
  campusId: string;
  campusCode: string | null;
  username: string;
  password: string;
};

/** June–May school year. June through December use this calendar year; January through May use the previous one. */
export function currentSchoolYear(now = new Date()) {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const name = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  return {
    name,
    code: name,
    startDate: new Date(`${start}-06-01`),
    endDate: new Date(`${start + 1}-05-31`),
  };
}

function temporaryPrincipalPassword() {
  return `Principal@${randomBytes(4).toString("hex")}`;
}

async function principalUsernameFor(campusId: string, campusCode: string | null) {
  const base = "principal";
  const taken = await prisma.user.findFirst({
    where: { campusId, username: base },
    select: { id: true },
  });
  if (!taken) return base;
  const coded = `principal-${(campusCode ?? "campus").toLowerCase()}`;
  const codedTaken = await prisma.user.findFirst({
    where: { campusId, username: coded },
    select: { id: true },
  });
  if (!codedTaken) return coded;
  return `${coded}-${randomBytes(2).toString("hex")}`;
}

async function createPrincipalUser(
  campus: { id: string; code: string | null; name: string },
  roleId: string,
): Promise<ProvisionedPrincipal> {
  const username = await principalUsernameFor(campus.id, campus.code);
  const password = temporaryPrincipalPassword();
  const passwordHash = await hashPassword(password);
  const email = `${username}@${(campus.code ?? "campus").toLowerCase()}.local`;
  const employeeId = `EMP-P-${randomBytes(3).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      campusId: campus.id,
      actorType: ActorType.STAFF,
      username,
      email,
      passwordHash,
      isActive: true,
      mustChangePassword: true,
      firstName: "Principal",
      lastName: "Admin",
    },
  });
  await prisma.staff.create({
    data: {
      campusId: campus.id,
      userId: user.id,
      employeeId,
      firstName: "Principal",
      lastName: "Admin",
      email,
    },
  });
  await prisma.userRole.create({
    data: { userId: user.id, roleId },
  });
  return {
    campusId: campus.id,
    campusCode: campus.code,
    username,
    password,
  };
}

/** Adds a principal only when the campus has none active. Does not change students, fees, or the current session. */
export async function ensureCampusPrincipal(campus: {
  id: string;
  code: string | null;
  name: string;
}): Promise<ProvisionedPrincipal | null> {
  const active = await prisma.user.findFirst({
    where: {
      campusId: campus.id,
      isActive: true,
      roles: { some: { role: { name: "Principal", campusId: campus.id } } },
    },
    select: { id: true },
  });
  if (active) return null;

  let role = await prisma.role.findFirst({
    where: { campusId: campus.id, name: "Principal" },
    select: { id: true },
  });
  if (!role) {
    const roles = await seedRolesForCampus(prisma, campus.id, { platformAdmin: false });
    const created = roles.get("Principal");
    if (!created) throw conflict("could not create principal role");
    role = created;
  }
  return createPrincipalUser(campus, role.id);
}

function flagOn(value: unknown, key: "archived" | "readOnly") {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>)[key] === true,
  );
}

export async function listOrgs(options?: { includeArchived?: boolean }): Promise<{
  orgs: OrgListRow[];
  provisionedPrincipals: ProvisionedPrincipal[];
}> {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      campuses: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          currentSessionId: true,
          _count: { select: { students: true } },
          sessions: { select: { id: true, name: true } },
        },
      },
    },
  });
  const provisionedPrincipals: ProvisionedPrincipal[] = [];
  for (const org of orgs) {
    for (const campus of org.campuses) {
      try {
        const created = await ensureCampusPrincipal(campus);
        if (created) provisionedPrincipals.push(created);
      } catch (error) {
        if (prismaErrorCode(error) !== "P2002") throw error;
      }
    }
  }
  const campusIds = orgs.flatMap((org) => org.campuses.map((campus) => campus.id));
  const principalRows = campusIds.length
    ? await prisma.user.findMany({
        where: {
          campusId: { in: campusIds },
          isActive: true,
          roles: { some: { role: { name: "Principal" } } },
        },
        select: { campusId: true, username: true },
        orderBy: { username: "asc" },
      })
    : [];
  const principalByCampus = new Map<string, string>();
  for (const row of principalRows) {
    if (!principalByCampus.has(row.campusId)) principalByCampus.set(row.campusId, row.username);
  }
  const moduleRows = campusIds.length
    ? await prisma.setting.findMany({
        where: { campusId: { in: campusIds }, key: ORG_MODULES_KEY },
        select: { campusId: true, value: true },
      })
    : [];
  const modulesByCampus = new Map(moduleRows.map((row) => [row.campusId, row.value]));
  const flagRows = campusIds.length
    ? await prisma.setting.findMany({
        where: {
          campusId: { in: campusIds },
          key: { in: ["org.archived", "campus.maintenance", CAMPUS_MODULES_KEY] },
        },
        select: { campusId: true, key: true, value: true },
      })
    : [];
  const flagByCampus = new Map<string, Map<string, unknown>>();
  for (const row of flagRows) {
    const bag = flagByCampus.get(row.campusId) ?? new Map<string, unknown>();
    bag.set(row.key, row.value);
    flagByCampus.set(row.campusId, bag);
  }
  const listed = orgs.map((org) => {
    const archived = org.campuses.some((campus) => flagOn(flagByCampus.get(campus.id)?.get("org.archived"), "archived"));
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      active: org.campuses.length > 0 && org.campuses.every((campus) => campus.isActive),
      archived,
      modules: parseOrgModules(org.campuses.map((campus) => modulesByCampus.get(campus.id)).find((value) => value != null)),
      campuses: org.campuses.map((campus) => {
        const session = campus.sessions.find((row) => row.id === campus.currentSessionId);
        const flags = flagByCampus.get(campus.id);
        return {
          id: campus.id,
          name: campus.name,
          code: campus.code,
          isActive: campus.isActive,
          currentSessionId: campus.currentSessionId,
          academicYear: session?.name ?? null,
          studentCount: campus._count.students,
          principalUsername: principalByCampus.get(campus.id) ?? null,
          maintenance: flagOn(flags?.get("campus.maintenance"), "readOnly"),
          modules: parseOrgModules(flags?.get(CAMPUS_MODULES_KEY)),
        };
      }),
    };
  });
  return {
    orgs: options?.includeArchived ? listed : listed.filter((org) => !org.archived),
    provisionedPrincipals,
  };
}

export async function getOrg(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound("org");
  return toOrgAlias(org);
}

export async function createOrg(input: { name: string; code: string }) {
  const parsed = parseOrgCreate(input);
  const [orgClash, campusClash] = await Promise.all([
    prisma.organization.findFirst({ where: { code: parsed.code }, select: { id: true } }),
    prisma.campus.findFirst({ where: { code: parsed.code }, select: { id: true } }),
  ]);
  if (orgClash) throw conflict("org code already used");
  if (campusClash) throw conflict("campus code already used");

  const year = currentSchoolYear();
  const password = temporaryPrincipalPassword();
  const passwordHash = await hashPassword(password);
  const email = `principal@${parsed.code.toLowerCase()}.local`;

  const created = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: parsed });
    const campus = await tx.campus.create({
      data: {
        orgId: org.id,
        name: parsed.name,
        code: parsed.code,
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        currencyCode: "INR",
      },
    });
    const session = await tx.academicSession.create({
      data: {
        campusId: campus.id,
        name: year.name,
        code: year.code,
        sequenceNo: 1,
        startDate: year.startDate,
        endDate: year.endDate,
        isCurrent: true,
        isActive: true,
      },
    });
    await tx.campus.update({
      where: { id: campus.id },
      data: { currentSessionId: session.id },
    });
    const roles = await seedRolesForCampus(tx, campus.id, { platformAdmin: false });
    const principalRole = roles.get("Principal");
    if (!principalRole) throw conflict("could not create principal role");
    const user = await tx.user.create({
      data: {
        campusId: campus.id,
        actorType: ActorType.STAFF,
        username: "principal",
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        firstName: "Principal",
        lastName: "Admin",
      },
    });
    await tx.staff.create({
      data: {
        campusId: campus.id,
        userId: user.id,
        employeeId: "EMP-PRINCIPAL",
        firstName: "Principal",
        lastName: "Admin",
        email,
      },
    });
    await tx.userRole.create({
      data: { userId: user.id, roleId: principalRole.id },
    });
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      campus: {
        id: campus.id,
        name: campus.name,
        code: campus.code,
        currentSessionId: session.id,
        academicYear: session.name,
      },
      principalUsername: "principal",
    };
  }, { timeout: 20000 });

  await seedCampusDefaults(created.campus.id, false);
  return { ...created, principalPassword: password };
}

export async function addCampus(orgId: string, input: { name: string; code: string }) {
  const name = input.name.trim();
  if (name.length < 2) throw validationError({ name: "required" });
  const code = normalizeCampusCode(input.code);
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { campuses: { select: { id: true } } },
  });
  if (!org) throw notFound("org");
  const archived = org.campuses.length
    ? await prisma.setting.findFirst({
        where: { campusId: { in: org.campuses.map((campus) => campus.id) }, key: "org.archived" },
        select: { value: true },
      })
    : null;
  if (flagOn(archived?.value, "archived")) throw conflict("organisation is archived");
  const clash = await prisma.campus.findFirst({ where: { code }, select: { id: true } });
  if (clash) throw conflict("campus code already used");

  const year = currentSchoolYear();
  const password = temporaryPrincipalPassword();
  const passwordHash = await hashPassword(password);
  const email = `principal@${code.toLowerCase()}.local`;
  const created = await prisma.$transaction(async (tx) => {
    const campus = await tx.campus.create({
      data: {
        orgId,
        name,
        code,
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        currencyCode: "INR",
      },
    });
    const session = await tx.academicSession.create({
      data: {
        campusId: campus.id,
        name: year.name,
        code: year.code,
        sequenceNo: 1,
        startDate: year.startDate,
        endDate: year.endDate,
        isCurrent: true,
        isActive: true,
      },
    });
    await tx.campus.update({
      where: { id: campus.id },
      data: { currentSessionId: session.id },
    });
    const roles = await seedRolesForCampus(tx, campus.id, { platformAdmin: false });
    const principalRole = roles.get("Principal");
    if (!principalRole) throw conflict("could not create principal role");
    const user = await tx.user.create({
      data: {
        campusId: campus.id,
        actorType: ActorType.STAFF,
        username: "principal",
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        firstName: "Principal",
        lastName: "Admin",
      },
    });
    await tx.staff.create({
      data: {
        campusId: campus.id,
        userId: user.id,
        employeeId: "EMP-PRINCIPAL",
        firstName: "Principal",
        lastName: "Admin",
        email,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: principalRole.id } });
    return {
      id: campus.id,
      name: campus.name,
      code: campus.code,
      currentSessionId: session.id,
      academicYear: session.name,
    };
  }, { timeout: 20000 });
  await seedCampusDefaults(created.id, true);
  return { campus: created, principalUsername: "principal", principalPassword: password };
}

export async function setOrgArchived(orgId: string, archived: boolean) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      campuses: { select: { id: true, code: true, _count: { select: { students: true } } } },
    },
  });
  if (!org) throw notFound("org");
  if (!org.campuses.length) throw conflict("organisation has no campus");
  if (archived) {
    if (org.campuses.some((campus) => campus.code === "MAIN")) {
      throw conflict("cannot archive the main organisation");
    }
    if (org.campuses.some((campus) => campus._count.students > 0)) {
      throw conflict("cannot archive an organisation that still has students");
    }
  }
  await prisma.$transaction(
    org.campuses.map((campus) =>
      prisma.setting.upsert({
        where: { campusId_key: { campusId: campus.id, key: "org.archived" } },
        update: { value: { archived } },
        create: { campusId: campus.id, key: "org.archived", value: { archived } },
      }),
    ),
  );
  return { id: org.id, code: org.code, archived };
}

export async function setCampusMaintenance(orgId: string, campusId: string, readOnly: boolean) {
  const campus = await campusInOrg(orgId, campusId);
  await prisma.setting.upsert({
    where: { campusId_key: { campusId: campus.id, key: "campus.maintenance" } },
    update: { value: { readOnly } },
    create: { campusId: campus.id, key: "campus.maintenance", value: { readOnly } },
  });
  return { campusId: campus.id, readOnly };
}

export async function setCampusModuleFlags(orgId: string, campusId: string, value: unknown) {
  const campus = await campusInOrg(orgId, campusId);
  const patch = parseOrgModulePatch(
    value && typeof value === "object" && value !== null && "modules" in value
      ? (value as { modules: unknown }).modules
      : value,
  );
  const modules = await saveCampusModules(campus.id, patch);
  return { campusId: campus.id, modules };
}

export async function patchOrg(orgId: string, value: unknown) {
  const patch = parseOrgPatch(value);
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound("org");
  if (patch.code && patch.code !== org.code) {
    const clash = await prisma.organization.findFirst({ where: { code: patch.code } });
    if (clash) throw conflict("org code already used");
  }
  const data: { name?: string; code?: string } = {};
  if (patch.name) data.name = patch.name;
  if (patch.code) data.code = patch.code;
  const updated = Object.keys(data).length
    ? await prisma.organization.update({ where: { id: orgId }, data })
    : org;
  if (patch.isActive !== undefined) {
    await prisma.campus.updateMany({
      where: { orgId },
      data: { isActive: patch.isActive },
    });
  }
  if (patch.modules) await saveOrgModules(orgId, patch.modules);
  const [campuses, modules] = await Promise.all([
    prisma.campus.findMany({
      where: { orgId },
      select: { isActive: true },
    }),
    loadOrgModules(orgId),
  ]);
  return {
    ...toOrgAlias(updated),
    active: campuses.length > 0 && campuses.every((row) => row.isActive),
    modules,
  };
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
    timezone?: string;
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
    campus.email === undefined &&
    campus.timezone === undefined
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
      ...(campus.timezone !== undefined ? { timezone: campus.timezone } : {}),
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
    timezone?: string | null;
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
        timezone: true,
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
            timezone: null,
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

async function ensurePermissions(db: RoleDb) {
  for (const perm of PERMISSION_CATALOG) {
    await db.permission.upsert({
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
  db: RoleDb,
  campusId: string,
  options: { platformAdmin: boolean },
) {
  await ensurePermissions(db);
  const allPermissions = await db.permission.findMany();
  const permByKey = new Map(
    allPermissions.map((p) => [`${p.module}.${p.feature}.${p.action}`, p]),
  );
  const roles = new Map<string, { id: string }>();
  for (const name of SYSTEM_ROLES) {
    if (name === "PlatformAdmin" && !options.platformAdmin) continue;
    const role = await db.role.upsert({
      where: { campusId_name: { campusId, name } },
      update: { isSystem: true },
      create: { campusId, name, isSystem: true },
    });
    roles.set(name, role);
  }
  const superAdmin = roles.get("SuperAdmin");
  if (superAdmin) {
    await db.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
    await db.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: superAdmin.id,
        permissionId: p.id,
      })),
    });
  }
  for (const [roleName, grants] of Object.entries(ROLE_GRANTS)) {
    const role = roles.get(roleName);
    if (!role) continue;
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = grants
      .map((key) => permByKey.get(key))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ roleId: role.id, permissionId: p.id }));
    if (rows.length) {
      await db.rolePermission.createMany({ data: rows });
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

  const roles = await seedRolesForCampus(prisma, campus.id, {
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
