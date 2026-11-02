import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const ROUTE_STOPS_KEY = "transport.routeStops";

export type RouteStopWrite = {
  name: string;
  lat: number | null;
  lng: number | null;
  time: string;
};

export type RouteStopExtra = RouteStopWrite & { routeId: string };

export type MappedStop = RouteStopWrite & { id: string; sortOrder: number };

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function parseTime(value: unknown) {
  const raw = trim(value);
  if (!raw) return "";
  if (!/^([01]\d|2[0-3]):[0-5]\d(?:\:[0-5]\d)?$/.test(raw)) {
    throw validationError({ time: "HH:MM" });
  }
  return raw.slice(0, 5);
}

function coord(value: unknown, field: "lat" | "lng") {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw validationError({ [field]: "invalid" });
  const [min, max] = field === "lat" ? ([-90, 90] as const) : ([-180, 180] as const);
  return Math.min(max, Math.max(min, n));
}

function stopList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { stops?: unknown }).stops)) {
    return (value as { stops: unknown[] }).stops;
  }
  throw validationError({ stops: "required" });
}

export function parseStopWrite(value: unknown): RouteStopWrite[] {
  const list = stopList(value);
  const out: RouteStopWrite[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    const rec =
      typeof row === "string"
        ? ({ name: row } as Record<string, unknown>)
        : row && typeof row === "object"
          ? (row as Record<string, unknown>)
          : null;
    if (!rec) throw validationError({ stops: "invalid" });
    const name = trim(rec.name);
    if (!name) throw validationError({ name: "required" });
    const key = name.toLowerCase();
    if (seen.has(key)) throw validationError({ name: "duplicate" });
    seen.add(key);
    out.push({
      name,
      lat: coord(rec.lat, "lat"),
      lng: coord(rec.lng, "lng"),
      time: parseTime(rec.time),
    });
  }
  return out;
}

export function parseRouteStopExtras(value: unknown): RouteStopExtra[] {
  if (!Array.isArray(value)) return [];
  const out: RouteStopExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const routeId = trim(rec.routeId);
    const name = trim(rec.name);
    const key = `${routeId}\0${name.toLowerCase()}`;
    if (!routeId || !name || seen.has(key)) continue;
    let lat: number | null = null;
    let lng: number | null = null;
    let time = "";
    try {
      lat = coord(rec.lat, "lat");
      lng = coord(rec.lng, "lng");
      time = parseTime(rec.time);
    } catch {
      continue;
    }
    if (lat == null && lng == null && !time) continue;
    seen.add(key);
    out.push({ routeId, name, lat, lng, time });
  }
  return out;
}

export function extrasFromStops(routeId: string, stops: RouteStopWrite[]): RouteStopExtra[] {
  const id = trim(routeId);
  return stops
    .filter((stop) => stop.lat != null || stop.lng != null || stop.time)
    .map((stop) => ({ routeId: id, name: stop.name, lat: stop.lat, lng: stop.lng, time: stop.time }));
}

export function replaceRouteStopExtras(
  rows: RouteStopExtra[],
  routeId: string,
  stops: RouteStopWrite[],
) {
  const id = trim(routeId);
  return [...rows.filter((row) => row.routeId !== id), ...extrasFromStops(id, stops)];
}

export function attachStopExtras<T extends { id: string; name: string; sortOrder?: number | null }>(
  pickups: T[],
  extras: RouteStopExtra[],
  routeId: string,
): Array<T & MappedStop> {
  const byName = new Map(
    extras
      .filter((row) => row.routeId === routeId)
      .map((row) => [row.name.toLowerCase(), row] as const),
  );
  return [...pickups]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((row) => {
      const extra = byName.get(row.name.toLowerCase());
      return {
        ...row,
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder ?? 0,
        lat: extra?.lat ?? null,
        lng: extra?.lng ?? null,
        time: extra?.time ?? "",
      };
    });
}

export function pickupReplacePlan(
  existing: Array<{ id: string; name: string; riders?: number }>,
  names: string[],
) {
  const buckets = new Map<string, Array<{ id: string; name: string; riders?: number }>>();
  for (const row of existing) {
    const key = row.name.trim().toLowerCase();
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  const used = new Set<string>();
  const update: Array<{ id: string; sortOrder: number }> = [];
  const create: Array<{ name: string; sortOrder: number }> = [];
  names.forEach((name, sortOrder) => {
    const key = name.trim().toLowerCase();
    const found = buckets.get(key)?.shift();
    if (found) {
      used.add(found.id);
      update.push({ id: found.id, sortOrder });
    } else {
      create.push({ name, sortOrder });
    }
  });
  const remove = existing.filter((row) => !used.has(row.id));
  if (remove.some((row) => (row.riders ?? 0) > 0)) {
    throw validationError({ stops: "in use" });
  }
  return { update, create, deleteIds: remove.map((row) => row.id) };
}

export function parseStudentTransport(value: unknown) {
  if (!value || typeof value !== "object") throw validationError({ routeId: "required" });
  const rec = value as Record<string, unknown>;
  const routeId = trim(rec.routeId ?? rec.in_route ?? rec.inRouteId);
  const pickupPointId = trim(rec.pickupPointId ?? rec.in_stop ?? rec.inStopId);
  const outRouteId = trim(rec.outRouteId ?? rec.out_route ?? rec.outRoute) || undefined;
  const outPickupPointId = trim(rec.outPickupPointId ?? rec.out_stop ?? rec.outStop) || undefined;
  if (!routeId) throw validationError({ routeId: "required" });
  if (!pickupPointId) throw validationError({ pickupPointId: "required" });
  if (Boolean(outRouteId) !== Boolean(outPickupPointId)) {
    throw validationError({ outPickupPointId: "out route and stop required together" });
  }
  return { routeId, pickupPointId, outRouteId, outPickupPointId };
}

async function readSetting(campusId: string, key: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key } },
  });
  return row?.value;
}

async function writeSetting(campusId: string, key: string, value: Prisma.InputJsonValue) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value },
    create: { campusId, key, value },
  });
}

export async function listRouteStopExtras(campusId: string) {
  return parseRouteStopExtras(await readSetting(campusId, ROUTE_STOPS_KEY));
}

export async function purgeRouteStopExtras(campusId: string, routeId: string) {
  const next = replaceRouteStopExtras(await listRouteStopExtras(campusId), routeId, []);
  await writeSetting(campusId, ROUTE_STOPS_KEY, next);
  return next;
}

export async function routeMap(campusId: string, routeId: string) {
  const route = await prisma.transportRoute.findFirst({
    where: { id: routeId, campusId },
    include: { pickups: { orderBy: { sortOrder: "asc" } } },
  });
  if (!route) throw notFound("route");
  const stops = attachStopExtras(route.pickups, await listRouteStopExtras(campusId), route.id);
  return {
    id: route.id,
    name: route.name,
    stops,
    stopMap: stops.map((stop) => stop.name),
  };
}

export async function replaceRouteStops(campusId: string, routeId: string, input: unknown) {
  const stops = parseStopWrite(input);
  const route = await prisma.transportRoute.findFirst({
    where: { id: routeId, campusId },
    include: {
      pickups: {
        include: { _count: { select: { riders: true, outRiders: true } } },
      },
    },
  });
  if (!route) throw notFound("route");
  const plan = pickupReplacePlan(
    route.pickups.map((row) => ({
      id: row.id,
      name: row.name,
      riders: row._count.riders + row._count.outRiders,
    })),
    stops.map((stop) => stop.name),
  );
  await prisma.$transaction(async (tx) => {
    for (const row of plan.update) {
      await tx.pickupPoint.update({
        where: { id: row.id },
        data: { sortOrder: row.sortOrder },
      });
    }
    if (plan.create.length) {
      await tx.pickupPoint.createMany({
        data: plan.create.map((row) => ({
          routeId: route.id,
          name: row.name,
          sortOrder: row.sortOrder,
        })),
      });
    }
    if (plan.deleteIds.length) {
      await tx.pickupPoint.deleteMany({ where: { id: { in: plan.deleteIds } } });
    }
  });
  const next = replaceRouteStopExtras(await listRouteStopExtras(campusId), route.id, stops);
  await writeSetting(campusId, ROUTE_STOPS_KEY, next);
  return routeMap(campusId, route.id);
}
