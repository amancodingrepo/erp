import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const STAFF_MODULES_KEY = "hr.staffModules";
export const STAFF_MODULE_KEYS = [
  "fees",
  "transport",
  "uniforms",
  "library",
  "academics",
  "others",
] as const;

export type StaffModuleKey = (typeof STAFF_MODULE_KEYS)[number];
export type StaffModuleRow = { staffId: string; modules: StaffModuleKey[] };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(
  campusId: string,
  key: string,
  value: Prisma.InputJsonValue,
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export function resolveStaffModules(value: unknown): StaffModuleKey[] {
  if (!Array.isArray(value)) throw validationError({ modules: "required" });
  const out: StaffModuleKey[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const key = trim(raw).toLowerCase();
    if (!key || seen.has(key)) continue;
    if (!STAFF_MODULE_KEYS.includes(key as StaffModuleKey)) {
      throw validationError({ modules: "unknown" });
    }
    seen.add(key);
    out.push(key as StaffModuleKey);
  }
  return out;
}

export function parseStaffModules(value: unknown): StaffModuleRow[] {
  if (!Array.isArray(value)) return [];
  const out: StaffModuleRow[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const staffId = trim(rec.staffId);
    if (!staffId || seen.has(staffId)) continue;
    seen.add(staffId);
    const modules = Array.isArray(rec.modules)
      ? rec.modules
          .map((item) => trim(item).toLowerCase())
          .filter((key): key is StaffModuleKey =>
            STAFF_MODULE_KEYS.includes(key as StaffModuleKey),
          )
          .filter((key, index, all) => all.indexOf(key) === index)
      : [];
    out.push({ staffId, modules });
  }
  return out;
}

export function upsertStaffModules(
  rows: StaffModuleRow[],
  staffId: string,
  modules: unknown,
) {
  const id = trim(staffId);
  if (!id) throw validationError({ staffId: "required" });
  const next: StaffModuleRow = { staffId: id, modules: resolveStaffModules(modules) };
  return [...rows.filter((row) => row.staffId !== id), next];
}

export function attachStaffModules<T extends { id: string }>(
  staff: T[],
  rows: StaffModuleRow[],
) {
  const byId = new Map(rows.map((row) => [row.staffId, row.modules]));
  return staff.map((row) => ({
    ...row,
    modules: byId.get(row.id) ?? [],
  }));
}

export async function listStaffModules(campusId: string) {
  return parseStaffModules(await readSetting(campusId, STAFF_MODULES_KEY));
}

export async function staffModulesFor(campusId: string, staffId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
    select: { id: true },
  });
  if (!staff) throw notFound("staff");
  const row = (await listStaffModules(campusId)).find((item) => item.staffId === staff.id);
  return { staffId: staff.id, modules: row?.modules ?? [] };
}

export async function saveStaffModules(
  campusId: string,
  staffId: string,
  modules: unknown,
) {
  const current = await staffModulesFor(campusId, staffId);
  const next = upsertStaffModules(
    await listStaffModules(campusId),
    current.staffId,
    modules,
  );
  await writeSetting(campusId, STAFF_MODULES_KEY, next);
  return next.find((row) => row.staffId === current.staffId)!;
}
