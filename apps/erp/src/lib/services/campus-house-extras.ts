import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, prismaErrorCode, validationError } from "@/lib/errors";

export const HOUSE_EXTRAS_KEY = "campus.houseExtras";

export type HouseExtra = {
  houseId: string;
  color: string;
  description: string;
};

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

export function sanitizeHouseColor(value: unknown, fallback = "") {
  const raw = trim(value);
  if (!raw) return fallback;
  const short = /^#([0-9a-fA-F]{3})$/.exec(raw);
  if (short) {
    const [a, b, c] = short[1]!;
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  throw validationError({ color: "hex" });
}

export function parseHouseExtras(value: unknown): HouseExtra[] {
  if (!Array.isArray(value)) return [];
  const out: HouseExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const houseId = trim(rec.houseId);
    if (!houseId || seen.has(houseId)) continue;
    seen.add(houseId);
    let color = "";
    try {
      color = sanitizeHouseColor(rec.color, "");
    } catch {
      color = "";
    }
    out.push({
      houseId,
      color,
      description: trim(rec.description),
    });
  }
  return out;
}

export function upsertHouseExtra(
  rows: HouseExtra[],
  houseId: string,
  patch: Partial<Omit<HouseExtra, "houseId">>,
) {
  const id = trim(houseId);
  if (!id) throw validationError({ houseId: "required" });
  const previous = rows.find((row) => row.houseId === id);
  const next: HouseExtra = {
    houseId: id,
    color:
      patch.color !== undefined
        ? sanitizeHouseColor(patch.color, "")
        : (previous?.color ?? ""),
    description:
      patch.description !== undefined
        ? trim(patch.description)
        : (previous?.description ?? ""),
  };
  return [...rows.filter((row) => row.houseId !== id), next];
}

export function dropHouseExtra(rows: HouseExtra[], houseId: string) {
  const key = trim(houseId);
  if (!key) return rows;
  return rows.filter((row) => row.houseId !== key);
}

export function houseDeleteBlocked(studentCount: number) {
  return studentCount > 0;
}

export function housePatchName(existingName: string, name?: string) {
  if (name === undefined) return existingName;
  const next = trim(name);
  if (!next) throw validationError({ name: "required" });
  return next;
}

export function attachHouseExtras<T extends { id: string }>(
  houses: T[],
  extras: HouseExtra[],
) {
  const byId = new Map(extras.map((row) => [row.houseId, row]));
  return houses.map((row) => {
    const extra = byId.get(row.id);
    return {
      ...row,
      color: extra?.color ?? "",
      description: extra?.description ?? "",
    };
  });
}

export async function listHouseExtras(campusId: string) {
  return parseHouseExtras(await readSetting(campusId, HOUSE_EXTRAS_KEY));
}

export async function saveHouseExtra(
  campusId: string,
  houseId: string,
  patch: Partial<Omit<HouseExtra, "houseId">>,
) {
  const house = await prisma.house.findFirst({
    where: { id: houseId, campusId },
    select: { id: true },
  });
  if (!house) throw notFound("house");
  const next = upsertHouseExtra(await listHouseExtras(campusId), house.id, patch);
  await writeSetting(campusId, HOUSE_EXTRAS_KEY, next);
  return next.find((row) => row.houseId === house.id)!;
}

export async function getHouse(campusId: string, id: string) {
  const row = await prisma.house.findFirst({
    where: { id: trim(id), campusId },
  });
  if (!row) throw notFound("house");
  return row;
}

export async function patchHouse(
  campusId: string,
  id: string,
  patch: { name?: string; color?: string; description?: string },
) {
  const existing = await getHouse(campusId, id);
  let house = existing;
  if (patch.name !== undefined) {
    const name = housePatchName(existing.name, patch.name);
    try {
      house = await prisma.house.update({
        where: { id: existing.id },
        data: { name },
      });
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") throw conflict("duplicate name");
      throw error;
    }
  }
  if (patch.color !== undefined || patch.description !== undefined) {
    await saveHouseExtra(campusId, house.id, {
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
    });
  }
  const extras = await listHouseExtras(campusId);
  return attachHouseExtras([house], extras)[0]!;
}

export async function removeHouse(campusId: string, id: string) {
  const existing = await getHouse(campusId, id);
  const students = await prisma.student.count({
    where: { houseId: existing.id, campusId },
  });
  if (houseDeleteBlocked(students)) throw conflict("house is in use");
  const extras = dropHouseExtra(await listHouseExtras(campusId), existing.id);
  await prisma.house.delete({ where: { id: existing.id } });
  await writeSetting(campusId, HOUSE_EXTRAS_KEY, extras);
  return { id: existing.id, deleted: true };
}
