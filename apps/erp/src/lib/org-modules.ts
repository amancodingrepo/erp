import { prisma } from "./db";
import { forbidden, notFound, validationError } from "./errors";
import type { AuthPrincipal } from "./permissions";

export const ORG_MODULES_KEY = "org.modules";
export const PLATFORM_MODULES_KEY = "platform.modules";
export const CAMPUS_MODULES_KEY = "campus.modules";

/** Modules a platform god can turn off for one organisation. Missing means on. */
export const ORG_MODULES = [
  "students",
  "fees",
  "attendance",
  "academics",
  "exams",
  "hr",
  "communicate",
  "transport",
  "store",
] as const;

export type OrgModuleId = (typeof ORG_MODULES)[number];

const ORG_MODULE_IDS = new Set<string>(ORG_MODULES);

export function defaultOrgModules(): Record<OrgModuleId, boolean> {
  return Object.fromEntries(ORG_MODULES.map((id) => [id, true])) as Record<OrgModuleId, boolean>;
}

export function parseOrgModules(value: unknown): Record<OrgModuleId, boolean> {
  const flags = defaultOrgModules();
  if (!value || typeof value !== "object" || Array.isArray(value)) return flags;
  const record = value as Record<string, unknown>;
  for (const id of ORG_MODULES) {
    if (typeof record[id] === "boolean") flags[id] = record[id];
  }
  return flags;
}

export function parseOrgModulePatch(value: unknown): Partial<Record<OrgModuleId, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ modules: "object" });
  }
  const record = value as Record<string, unknown>;
  const patch: Partial<Record<OrgModuleId, boolean>> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (!ORG_MODULE_IDS.has(key)) throw validationError({ modules: "unknown" });
    if (typeof entry !== "boolean") throw validationError({ modules: "boolean" });
    patch[key as OrgModuleId] = entry;
  }
  if (!Object.keys(patch).length) throw validationError({ modules: "required" });
  return patch;
}

/** A module is on only when the platform, organisation, and campus switches are on. */
export function combineModuleFlags(
  orgFlags: Record<OrgModuleId, boolean>,
  platformFlags: Record<OrgModuleId, boolean>,
  campusFlags: Record<OrgModuleId, boolean> = defaultOrgModules(),
): Record<OrgModuleId, boolean> {
  const flags = defaultOrgModules();
  for (const id of ORG_MODULES) {
    flags[id] = orgFlags[id] !== false && platformFlags[id] !== false && campusFlags[id] !== false;
  }
  return flags;
}

export async function loadPlatformModules(): Promise<Record<OrgModuleId, boolean>> {
  const row = await prisma.setting.findFirst({
    where: { key: PLATFORM_MODULES_KEY },
    orderBy: { id: "asc" },
  });
  return parseOrgModules(row?.value);
}

export async function savePlatformModules(
  patch: Partial<Record<OrgModuleId, boolean>>,
): Promise<Record<OrgModuleId, boolean>> {
  const next = { ...(await loadPlatformModules()), ...patch };
  const campuses = await prisma.campus.findMany({ select: { id: true } });
  if (campuses.length) {
    await prisma.$transaction(
      campuses.map((campus) =>
        prisma.setting.upsert({
          where: { campusId_key: { campusId: campus.id, key: PLATFORM_MODULES_KEY } },
          update: { value: next },
          create: { campusId: campus.id, key: PLATFORM_MODULES_KEY, value: next },
        }),
      ),
    );
  }
  return next;
}

export async function loadOrgModules(orgId: string): Promise<Record<OrgModuleId, boolean>> {
  const campuses = await prisma.campus.findMany({
    where: { orgId },
    select: { id: true },
  });
  if (!campuses.length) return defaultOrgModules();
  const row = await prisma.setting.findFirst({
    where: {
      campusId: { in: campuses.map((campus) => campus.id) },
      key: ORG_MODULES_KEY,
    },
    orderBy: { id: "asc" },
  });
  return parseOrgModules(row?.value);
}

export async function schoolModulesForCampus(campusId: string): Promise<Record<OrgModuleId, boolean>> {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { orgId: true },
  });
  if (!campus) return defaultOrgModules();
  const [orgFlags, platformFlags, campusFlags] = await Promise.all([
    loadOrgModules(campus.orgId),
    loadPlatformModules(),
    loadCampusModules(campusId),
  ]);
  return combineModuleFlags(orgFlags, platformFlags, campusFlags);
}

export async function loadCampusModules(campusId: string): Promise<Record<OrgModuleId, boolean>> {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: CAMPUS_MODULES_KEY } },
  });
  return parseOrgModules(row?.value);
}

export async function saveCampusModules(
  campusId: string,
  patch: Partial<Record<OrgModuleId, boolean>>,
): Promise<Record<OrgModuleId, boolean>> {
  const campus = await prisma.campus.findUnique({ where: { id: campusId }, select: { id: true } });
  if (!campus) throw notFound("campus");
  const next = { ...(await loadCampusModules(campusId)), ...patch };
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: CAMPUS_MODULES_KEY } },
    update: { value: next },
    create: { campusId, key: CAMPUS_MODULES_KEY, value: next },
  });
  return next;
}

export async function saveOrgModules(
  orgId: string,
  patch: Partial<Record<OrgModuleId, boolean>>,
): Promise<Record<OrgModuleId, boolean>> {
  const next = { ...(await loadOrgModules(orgId)), ...patch };
  const campuses = await prisma.campus.findMany({
    where: { orgId },
    select: { id: true },
  });
  if (campuses.length) {
    await prisma.$transaction(
      campuses.map((campus) =>
        prisma.setting.upsert({
          where: { campusId_key: { campusId: campus.id, key: ORG_MODULES_KEY } },
          update: { value: next },
          create: { campusId: campus.id, key: ORG_MODULES_KEY, value: next },
        }),
      ),
    );
  }
  return next;
}

/** PlatformAdmin ignores the ceiling. Everyone else is refused when the module is off. */
export async function assertOrgModule(user: AuthPrincipal, moduleId: string) {
  if (!ORG_MODULE_IDS.has(moduleId)) return;
  if (user.roles.includes("PlatformAdmin")) return;
  const flags = await schoolModulesForCampus(user.campusId);
  if (flags[moduleId as OrgModuleId] === false) {
    throw forbidden("this module is off for the organisation");
  }
}

export function requestAsksForFeeModule(url: string) {
  try {
    return /\/fees(\/|$)/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export async function assertNewGrantsAllowed(
  user: AuthPrincipal,
  beforeIds: string[],
  nextIds: string[],
) {
  if (user.roles.includes("PlatformAdmin")) return;
  const added = nextIds.filter((id) => !beforeIds.includes(id));
  if (!added.length) return;
  const permissions = await prisma.permission.findMany({
    where: { id: { in: added } },
    select: { module: true },
  });
  const flags = await schoolModulesForCampus(user.campusId);
  for (const permission of permissions) {
    if (ORG_MODULE_IDS.has(permission.module) && flags[permission.module as OrgModuleId] === false) {
      throw forbidden("this module is off for the organisation");
    }
  }
}
