import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import {
  listStaffCategories,
  resolveStaffCategoryName,
} from "@/lib/services/campus-staff-categories";

export const STAFF_EXTRAS_KEY = "hr.staffExtras";
export const VEHICLE_COMPLIANCE_KEY = "transport.vehicleCompliance";
export const VEHICLE_EXTRAS_KEY = "transport.vehicleExtras";
export const VEHICLE_PINGS_KEY = "transport.pings";

export type StaffExtra = {
  staffId: string;
  category: string;
  licenseNo: string;
  licenseExpiry: string;
  dob: string;
};

export type VehicleCompliance = {
  vehicleId: string;
  insuranceDue: string;
  fitnessDue: string;
  pucDue: string;
};

export type VehicleExtra = {
  vehicleId: string;
  capacity: number | null;
  trackerId: string;
  cctv: boolean;
  taxDue: string;
  permitDue: string;
  driverId: string;
  caretakerId: string;
  fuelType: string;
};

export type VehiclePing = {
  id: string;
  vehicleId: string;
  tripId: string;
  lat: number;
  lng: number;
  at: string;
};

function dateOrEmpty(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw;
}

export function parseStaffExtras(value: unknown): StaffExtra[] {
  if (!Array.isArray(value)) return [];
  const out: StaffExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const staffId = String(rec.staffId ?? "").trim();
    if (!staffId || seen.has(staffId)) continue;
    seen.add(staffId);
    out.push({
      staffId,
      category: String(rec.category ?? "").trim(),
      licenseNo: String(rec.licenseNo ?? "").trim(),
      licenseExpiry: dateOrEmpty(rec.licenseExpiry),
      dob: dateOrEmpty(rec.dob),
    });
  }
  return out;
}

export function upsertStaffExtra(
  rows: StaffExtra[],
  staffId: string,
  patch: Partial<Omit<StaffExtra, "staffId">>,
) {
  const id = staffId.trim();
  if (!id) throw validationError({ staffId: "required" });
  const previous = rows.find((row) => row.staffId === id);
  const next: StaffExtra = {
    staffId: id,
    category: (patch.category ?? previous?.category ?? "").trim(),
    licenseNo: (patch.licenseNo ?? previous?.licenseNo ?? "").trim(),
    licenseExpiry: (patch.licenseExpiry ?? previous?.licenseExpiry ?? "").trim(),
    dob: (patch.dob ?? previous?.dob ?? "").trim(),
  };
  return [...rows.filter((row) => row.staffId !== id), next];
}

export function attachStaffExtras<T extends { id: string }>(
  staff: T[],
  extras: StaffExtra[],
) {
  const byId = new Map(extras.map((row) => [row.staffId, row]));
  return staff.map((row) => ({
    ...row,
    extra: byId.get(row.id) ?? null,
  }));
}

export function parseVehicleCompliance(value: unknown): VehicleCompliance[] {
  if (!Array.isArray(value)) return [];
  const out: VehicleCompliance[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const vehicleId = String(rec.vehicleId ?? "").trim();
    if (!vehicleId || seen.has(vehicleId)) continue;
    seen.add(vehicleId);
    out.push({
      vehicleId,
      insuranceDue: dateOrEmpty(rec.insuranceDue),
      fitnessDue: dateOrEmpty(rec.fitnessDue),
      pucDue: dateOrEmpty(rec.pucDue),
    });
  }
  return out;
}

export function upsertVehicleCompliance(
  rows: VehicleCompliance[],
  vehicleId: string,
  patch: Partial<Omit<VehicleCompliance, "vehicleId">>,
) {
  const id = vehicleId.trim();
  if (!id) throw validationError({ vehicleId: "required" });
  const previous = rows.find((row) => row.vehicleId === id);
  const next: VehicleCompliance = {
    vehicleId: id,
    insuranceDue: (patch.insuranceDue ?? previous?.insuranceDue ?? "").trim(),
    fitnessDue: (patch.fitnessDue ?? previous?.fitnessDue ?? "").trim(),
    pucDue: (patch.pucDue ?? previous?.pucDue ?? "").trim(),
  };
  return [...rows.filter((row) => row.vehicleId !== id), next];
}

export function attachVehicleCompliance<T extends { id: string }>(
  vehicles: T[],
  rows: VehicleCompliance[],
) {
  const byId = new Map(rows.map((row) => [row.vehicleId, row]));
  return vehicles.map((row) => ({
    ...row,
    compliance: byId.get(row.id) ?? null,
  }));
}

function optionalCapacity(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseVehicleExtras(value: unknown): VehicleExtra[] {
  if (!Array.isArray(value)) return [];
  const out: VehicleExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const vehicleId = String(rec.vehicleId ?? "").trim();
    if (!vehicleId || seen.has(vehicleId)) continue;
    seen.add(vehicleId);
    out.push({
      vehicleId,
      capacity: optionalCapacity(rec.capacity),
      trackerId: String(rec.trackerId ?? "").trim(),
      cctv: rec.cctv === true,
      taxDue: dateOrEmpty(rec.taxDue),
      permitDue: dateOrEmpty(rec.permitDue),
      driverId: String(rec.driverId ?? "").trim(),
      caretakerId: String(rec.caretakerId ?? "").trim(),
      fuelType: String(rec.fuelType ?? "").trim(),
    });
  }
  return out;
}

export function upsertVehicleExtra(
  rows: VehicleExtra[],
  vehicleId: string,
  patch: Partial<Omit<VehicleExtra, "vehicleId">>,
) {
  const id = vehicleId.trim();
  if (!id) throw validationError({ vehicleId: "required" });
  const previous = rows.find((row) => row.vehicleId === id);
  const next: VehicleExtra = {
    vehicleId: id,
    capacity:
      patch.capacity !== undefined ? patch.capacity : (previous?.capacity ?? null),
    trackerId: (patch.trackerId ?? previous?.trackerId ?? "").trim(),
    cctv: patch.cctv ?? previous?.cctv ?? false,
    taxDue: (patch.taxDue ?? previous?.taxDue ?? "").trim(),
    permitDue: (patch.permitDue ?? previous?.permitDue ?? "").trim(),
    driverId: (patch.driverId ?? previous?.driverId ?? "").trim(),
    caretakerId: (patch.caretakerId ?? previous?.caretakerId ?? "").trim(),
    fuelType: (patch.fuelType ?? previous?.fuelType ?? "").trim(),
  };
  return [...rows.filter((row) => row.vehicleId !== id), next];
}

export function dropVehicleRows<T extends { vehicleId: string }>(
  rows: T[],
  vehicleId: string,
) {
  const id = String(vehicleId ?? "").trim();
  return rows.filter((row) => row.vehicleId !== id);
}

export function attachVehicleExtras<T extends { id: string }>(
  vehicles: T[],
  rows: VehicleExtra[],
) {
  const byId = new Map(rows.map((row) => [row.vehicleId, row]));
  return vehicles.map((row) => ({
    ...row,
    extras: byId.get(row.id) ?? null,
  }));
}

export function stopSequence(
  pickups: Array<{ name: string; sortOrder?: number | null }>,
) {
  return [...pickups]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((row) => row.name);
}

function clampCoord(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export function parseVehiclePings(value: unknown): VehiclePing[] {
  if (!Array.isArray(value)) return [];
  const out: VehiclePing[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = String(rec.id ?? "").trim();
    const vehicleId = String(rec.vehicleId ?? "").trim();
    const tripId = String(rec.tripId ?? "").trim();
    const lat = clampCoord(rec.lat, -90, 90);
    const lng = clampCoord(rec.lng, -180, 180);
    const at = String(rec.at ?? "").trim();
    if (!id || !vehicleId || !tripId || lat == null || lng == null || !at || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({ id, vehicleId, tripId, lat, lng, at });
  }
  return out;
}

export function nextTripId(rows: VehiclePing[], vehicleId: string) {
  const prefix = `TRIP-${vehicleId.slice(-4)}-`;
  const max = rows.reduce((n, row) => {
    if (row.vehicleId !== vehicleId) return n;
    const match = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`).exec(
      row.tripId,
    );
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function appendVehiclePing(
  rows: VehiclePing[],
  input: { vehicleId: string; lat: number; lng: number; tripId?: string; at?: string },
) {
  const vehicleId = String(input.vehicleId ?? "").trim();
  const lat = clampCoord(input.lat, -90, 90);
  const lng = clampCoord(input.lng, -180, 180);
  if (!vehicleId) throw validationError({ vehicleId: "required" });
  if (lat == null || lng == null) throw validationError({ lat: "required" });
  const tripId = String(input.tripId ?? "").trim() || nextTripId(rows, vehicleId);
  const ping: VehiclePing = {
    id: crypto.randomUUID(),
    vehicleId,
    tripId,
    lat,
    lng,
    at: String(input.at ?? new Date().toISOString()),
  };
  return { ping, rows: [...rows, ping].slice(-400) };
}

export function lastPingForVehicle(rows: VehiclePing[], vehicleId: string) {
  const id = vehicleId.trim();
  return [...rows].reverse().find((row) => row.vehicleId === id) ?? null;
}

export function tripPlayback(rows: VehiclePing[], tripId: string) {
  const id = tripId.trim();
  return rows
    .filter((row) => row.tripId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function listStaffExtras(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: STAFF_EXTRAS_KEY } },
  });
  return parseStaffExtras(row?.value);
}

export async function saveStaffExtras(campusId: string, rows: StaffExtra[]) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: STAFF_EXTRAS_KEY } },
    update: { value: rows },
    create: { campusId, key: STAFF_EXTRAS_KEY, value: rows },
  });
  return rows;
}

export async function writeStaffExtra(
  campusId: string,
  staffId: string,
  patch: Partial<Omit<StaffExtra, "staffId">>,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
  });
  if (!staff) throw notFound("staff");
  const extraPatch =
    patch.category !== undefined && String(patch.category ?? "").trim()
      ? {
          ...patch,
          category: resolveStaffCategoryName(
            await listStaffCategories(campusId),
            patch.category,
          ),
        }
      : patch;
  const next = upsertStaffExtra(await listStaffExtras(campusId), staffId, extraPatch);
  await saveStaffExtras(campusId, next);
  return next.find((row) => row.staffId === staffId)!;
}

export async function listVehicleCompliance(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: VEHICLE_COMPLIANCE_KEY } },
  });
  return parseVehicleCompliance(row?.value);
}

export async function saveVehicleCompliance(
  campusId: string,
  rows: VehicleCompliance[],
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: VEHICLE_COMPLIANCE_KEY } },
    update: { value: rows },
    create: { campusId, key: VEHICLE_COMPLIANCE_KEY, value: rows },
  });
  return rows;
}

export async function writeVehicleCompliance(
  campusId: string,
  vehicleId: string,
  patch: Partial<Omit<VehicleCompliance, "vehicleId">>,
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, campusId },
  });
  if (!vehicle) throw notFound("vehicle");
  const next = upsertVehicleCompliance(
    await listVehicleCompliance(campusId),
    vehicleId,
    patch,
  );
  await saveVehicleCompliance(campusId, next);
  return next.find((row) => row.vehicleId === vehicleId)!;
}

export async function listVehicleExtras(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: VEHICLE_EXTRAS_KEY } },
  });
  return parseVehicleExtras(row?.value);
}

export async function saveVehicleExtras(campusId: string, rows: VehicleExtra[]) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: VEHICLE_EXTRAS_KEY } },
    update: { value: rows },
    create: { campusId, key: VEHICLE_EXTRAS_KEY, value: rows },
  });
  return rows;
}

async function saveVehiclePings(campusId: string, rows: VehiclePing[]) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: VEHICLE_PINGS_KEY } },
    update: { value: rows as Prisma.InputJsonValue },
    create: { campusId, key: VEHICLE_PINGS_KEY, value: rows as Prisma.InputJsonValue },
  });
  return rows;
}

export async function purgeVehicleSettings(campusId: string, vehicleId: string) {
  const id = vehicleId.trim();
  const [extras, compliance, pings] = await Promise.all([
    listVehicleExtras(campusId),
    listVehicleCompliance(campusId),
    listVehiclePings(campusId),
  ]);
  await Promise.all([
    saveVehicleExtras(campusId, dropVehicleRows(extras, id)),
    saveVehicleCompliance(campusId, dropVehicleRows(compliance, id)),
    saveVehiclePings(campusId, dropVehicleRows(pings, id)),
  ]);
}

export async function writeVehicleExtras(
  campusId: string,
  vehicleId: string,
  patch: Partial<Omit<VehicleExtra, "vehicleId">>,
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, campusId },
  });
  if (!vehicle) throw notFound("vehicle");
  const next = upsertVehicleExtra(await listVehicleExtras(campusId), vehicleId, patch);
  await saveVehicleExtras(campusId, next);
  return next.find((row) => row.vehicleId === vehicleId)!;
}

export async function listVehiclePings(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: VEHICLE_PINGS_KEY } },
  });
  return parseVehiclePings(row?.value);
}

export async function recordVehiclePing(
  campusId: string,
  input: { vehicleId: string; lat: number; lng: number; tripId?: string },
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, campusId },
  });
  if (!vehicle) throw notFound("vehicle");
  const recorded = appendVehiclePing(await listVehiclePings(campusId), {
    vehicleId: vehicle.id,
    lat: input.lat,
    lng: input.lng,
    tripId: input.tripId,
  });
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: VEHICLE_PINGS_KEY } },
    update: { value: recorded.rows as Prisma.InputJsonValue },
    create: {
      campusId,
      key: VEHICLE_PINGS_KEY,
      value: recorded.rows as Prisma.InputJsonValue,
    },
  });
  return recorded.ping;
}

export async function studentTransportTrack(campusId: string, studentId: string) {
  const assignment = await prisma.studentTransport.findFirst({
    where: { studentId, student: { campusId } },
    include: {
      route: { include: { vehicles: true } },
      outRoute: { include: { vehicles: true } },
    },
  });
  if (!assignment) {
    return { last: null, trip: [] as VehiclePing[], vehicles: [] as string[] };
  }
  const vehicles = [
    ...assignment.route.vehicles,
    ...(assignment.outRoute?.vehicles ?? []),
  ];
  const ids = [...new Set(vehicles.map((row) => row.id))];
  const pings = await listVehiclePings(campusId);
  const last =
    ids
      .map((id) => lastPingForVehicle(pings, id))
      .filter((row): row is VehiclePing => Boolean(row))
      .sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  return {
    last,
    trip: last ? tripPlayback(pings, last.tripId) : [],
    vehicles: ids,
  };
}

export async function assignStaffRole(
  campusId: string,
  staffId: string,
  roleId: string,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
  });
  if (!staff) throw notFound("staff");
  if (!staff.userId) throw validationError({ roleId: "staff has no login" });
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      OR: [{ campusId }, { campusId: null }],
    },
  });
  if (!role) throw notFound("role");
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: staff.userId, roleId: role.id } },
    update: {},
    create: { userId: staff.userId, roleId: role.id },
  });
  return { staffId, roleId: role.id, roleName: role.name };
}
