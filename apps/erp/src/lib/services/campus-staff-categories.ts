import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import {
  dropNamedMaster,
  getNamedMaster,
  parseNamedMasters,
  upsertNamedMaster,
} from "@/lib/services/academics-masters";

export const STAFF_CATEGORIES_KEY = "hr.staffCategories";
const STAFF_EXTRAS_KEY = "hr.staffExtras";

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

export function resolveStaffCategoryName(
  masters: Array<{ id: string; name: string }>,
  category: unknown,
) {
  const name = trim(category);
  if (!name) return "";
  const found = masters.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (!found) throw validationError({ category: "unknown" });
  return found.name;
}

export async function listStaffCategories(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, STAFF_CATEGORIES_KEY));
}

export async function saveStaffCategory(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listStaffCategories(campusId), input);
  await writeSetting(campusId, STAFF_CATEGORIES_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next[next.length - 1]!
  );
}

export function dropStaffCategoryFromExtras<T extends { category: string }>(
  rows: T[],
  name: string,
) {
  const key = trim(name).toLowerCase();
  if (!key) return rows;
  return rows.map((row) =>
    trim(row.category).toLowerCase() === key ? { ...row, category: "" } : row,
  );
}

export async function getStaffCategory(campusId: string, id: string) {
  return getNamedMaster(await listStaffCategories(campusId), id, "staff category");
}

export async function removeStaffCategory(campusId: string, id: string) {
  const named = await listStaffCategories(campusId);
  const row = getNamedMaster(named, id, "staff category");
  const next = dropNamedMaster(named, id);
  const extrasRaw = await readSetting(campusId, STAFF_EXTRAS_KEY);
  await writeSetting(campusId, STAFF_CATEGORIES_KEY, next);
  if (Array.isArray(extrasRaw)) {
    const extras = extrasRaw.filter((entry) => entry && typeof entry === "object") as Array<{
      category: string;
    }>;
    await writeSetting(
      campusId,
      STAFF_EXTRAS_KEY,
      dropStaffCategoryFromExtras(extras, row.name) as Prisma.InputJsonValue,
    );
  }
  return { id: trim(id), deleted: true };
}
