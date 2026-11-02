import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const FUEL_LOGS_KEY = "transport.fuelLogs";
export const TRANSPORT_SLABS_KEY = "transport.slabs";

export type FuelLog = {
  id: string;
  vehicleId: string;
  litres: number;
  amount: number;
  odometer: number | null;
  at: string;
  note: string;
};

export type TransportSlab = {
  id: string;
  name: string;
  fromKm: number;
  toKm: number | null;
  amount: number;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function plainText(value: unknown) {
  return trim(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function km(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
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

export function parseFuelLogs(value: unknown): FuelLog[] {
  if (!Array.isArray(value)) return [];
  const out: FuelLog[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id) || crypto.randomUUID();
    const vehicleId = trim(rec.vehicleId);
    const litres = money(rec.litres);
    const amount = money(rec.amount) ?? 0;
    if (!vehicleId || litres == null || litres <= 0 || amount < 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const odometer = money(rec.odometer);
    out.push({
      id,
      vehicleId,
      litres,
      amount,
      odometer: odometer != null && odometer >= 0 ? odometer : null,
      at: trim(rec.at) || new Date(0).toISOString(),
      note: plainText(rec.note),
    });
  }
  return out;
}

export function appendFuelLog(
  rows: FuelLog[],
  input: {
    vehicleId: string;
    litres: number | string;
    amount?: number | string;
    odometer?: number | string;
    at?: string;
    note?: string;
  },
) {
  const vehicleId = trim(input.vehicleId);
  const litres = money(input.litres);
  const amount = money(input.amount) ?? 0;
  if (!vehicleId) throw validationError({ vehicleId: "required" });
  if (litres == null || litres <= 0) throw validationError({ litres: "must be positive" });
  if (amount < 0) throw validationError({ amount: "must be zero or more" });
  const odometer = money(input.odometer);
  const entry: FuelLog = {
    id: crypto.randomUUID(),
    vehicleId,
    litres,
    amount,
    odometer: odometer != null && odometer >= 0 ? odometer : null,
    at: trim(input.at) || new Date().toISOString(),
    note: plainText(input.note),
  };
  return [...rows, entry].slice(-400);
}

export function updateFuelLog(
  rows: FuelLog[],
  id: string,
  patch: {
    vehicleId?: string;
    litres?: number | string;
    amount?: number | string;
    odometer?: number | string | null;
    at?: string;
    note?: string;
  },
) {
  const key = trim(id);
  const current = rows.find((row) => row.id === key);
  if (!current) throw notFound("fuel log");
  const next = { ...current };
  if (patch.vehicleId !== undefined) {
    const vehicleId = trim(patch.vehicleId);
    if (!vehicleId) throw validationError({ vehicleId: "required" });
    next.vehicleId = vehicleId;
  }
  if (patch.litres !== undefined) {
    const litres = money(patch.litres);
    if (litres == null || litres <= 0) throw validationError({ litres: "must be positive" });
    next.litres = litres;
  }
  if (patch.amount !== undefined) {
    const amount = money(patch.amount);
    if (amount == null || amount < 0) throw validationError({ amount: "must be zero or more" });
    next.amount = amount;
  }
  if (patch.odometer !== undefined) {
    if (patch.odometer === null || patch.odometer === "") {
      next.odometer = null;
    } else {
      const odometer = money(patch.odometer);
      next.odometer = odometer != null && odometer >= 0 ? odometer : null;
    }
  }
  if (patch.at !== undefined) next.at = trim(patch.at) || current.at;
  if (patch.note !== undefined) next.note = plainText(patch.note);
  return rows.map((row) => (row.id === key ? next : row));
}

export function dropFuelLog(rows: FuelLog[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("fuel log");
  return next;
}

export function parseTransportSlabs(value: unknown): TransportSlab[] {
  if (!Array.isArray(value)) return [];
  const out: TransportSlab[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = trim(rec.name);
    const fromKm = km(rec.fromKm);
    const amount = money(rec.amount);
    const key = name.toLowerCase();
    if (!name || fromKm == null || fromKm < 0 || amount == null || amount < 0 || seen.has(key)) {
      continue;
    }
    const toRaw = rec.toKm == null || rec.toKm === "" ? null : km(rec.toKm);
    if (toRaw != null && toRaw <= fromKm) continue;
    seen.add(key);
    out.push({
      id: trim(rec.id) || crypto.randomUUID(),
      name,
      fromKm,
      toKm: toRaw,
      amount,
    });
  }
  return out.sort((a, b) => a.fromKm - b.fromKm);
}

export function upsertTransportSlab(
  rows: TransportSlab[],
  input: {
    id?: string;
    name: string;
    fromKm: number | string;
    toKm?: number | string | null;
    amount: number | string;
  },
) {
  const name = trim(input.name);
  const fromKm = km(input.fromKm);
  const amount = money(input.amount);
  if (!name) throw validationError({ name: "required" });
  if (fromKm == null || fromKm < 0) throw validationError({ fromKm: "required" });
  if (amount == null || amount < 0) throw validationError({ amount: "required" });
  const toRaw =
    input.toKm == null || input.toKm === "" ? null : km(input.toKm);
  if (toRaw != null && toRaw <= fromKm) {
    throw validationError({ toKm: "must be greater than fromKm" });
  }
  const id =
    trim(input.id) ||
    rows.find((row) => row.name.toLowerCase() === name.toLowerCase())?.id ||
    crypto.randomUUID();
  const next: TransportSlab = { id, name, fromKm, toKm: toRaw, amount };
  return [
    ...rows.filter(
      (row) =>
        row.id !== id && row.name.toLowerCase() !== name.toLowerCase(),
    ),
    next,
  ].sort((a, b) => a.fromKm - b.fromKm);
}

export function patchTransportSlab(
  rows: TransportSlab[],
  id: string,
  patch: {
    name?: string;
    fromKm?: number | string;
    toKm?: number | string | null;
    amount?: number | string;
  },
) {
  const key = trim(id);
  const current = rows.find((row) => row.id === key);
  if (!current) throw notFound("transport slab");
  return upsertTransportSlab(rows, {
    id: current.id,
    name: patch.name ?? current.name,
    fromKm: patch.fromKm ?? current.fromKm,
    toKm: patch.toKm !== undefined ? patch.toKm : current.toKm,
    amount: patch.amount ?? current.amount,
  });
}

export function dropTransportSlab(rows: TransportSlab[], id: string) {
  const key = trim(id);
  if (!key) throw validationError({ id: "required" });
  const next = rows.filter((row) => row.id !== key);
  if (next.length === rows.length) throw notFound("transport slab");
  return next;
}

export function feeForDistance(rows: TransportSlab[], distanceKm: number) {
  const kmValue = km(distanceKm);
  if (kmValue == null || kmValue < 0) return null;
  const match = [...rows]
    .sort((a, b) => a.fromKm - b.fromKm)
    .find(
      (row) =>
        kmValue >= row.fromKm && (row.toKm == null || kmValue <= row.toKm),
    );
  return match ? match.amount : null;
}

export async function listFuelLogs(campusId: string, vehicleId?: string) {
  const rows = parseFuelLogs(await readSetting(campusId, FUEL_LOGS_KEY));
  const scoped = vehicleId
    ? rows.filter((row) => row.vehicleId === vehicleId)
    : rows;
  return scoped.slice().reverse();
}

export async function saveFuelLog(
  campusId: string,
  input: {
    vehicleId: string;
    litres: number | string;
    amount?: number | string;
    odometer?: number | string;
    at?: string;
    note?: string;
  },
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: trim(input.vehicleId), campusId },
    select: { id: true },
  });
  if (!vehicle) throw notFound("vehicle");
  const next = appendFuelLog(
    parseFuelLogs(await readSetting(campusId, FUEL_LOGS_KEY)),
    { ...input, vehicleId: vehicle.id },
  );
  await writeSetting(campusId, FUEL_LOGS_KEY, next);
  return next[next.length - 1]!;
}

export async function getFuelLog(campusId: string, id: string) {
  const row = (await listFuelLogs(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("fuel log");
  return row;
}

export async function patchCampusFuelLog(
  campusId: string,
  id: string,
  input: {
    vehicleId?: string;
    litres?: number | string;
    amount?: number | string;
    odometer?: number | string | null;
    at?: string;
    note?: string;
  },
) {
  const rows = parseFuelLogs(await readSetting(campusId, FUEL_LOGS_KEY));
  const current = rows.find((row) => row.id === trim(id));
  if (!current) throw notFound("fuel log");
  if (input.vehicleId && trim(input.vehicleId) !== current.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: trim(input.vehicleId), campusId },
      select: { id: true },
    });
    if (!vehicle) throw notFound("vehicle");
    input = { ...input, vehicleId: vehicle.id };
  }
  const next = updateFuelLog(rows, id, input);
  await writeSetting(campusId, FUEL_LOGS_KEY, next);
  return next.find((row) => row.id === trim(id))!;
}

export async function removeFuelLog(campusId: string, id: string) {
  const next = dropFuelLog(
    parseFuelLogs(await readSetting(campusId, FUEL_LOGS_KEY)),
    id,
  );
  await writeSetting(campusId, FUEL_LOGS_KEY, next);
  return { id: trim(id), deleted: true };
}

export async function listTransportSlabs(campusId: string) {
  return parseTransportSlabs(await readSetting(campusId, TRANSPORT_SLABS_KEY));
}

export async function saveTransportSlab(
  campusId: string,
  input: {
    id?: string;
    name: string;
    fromKm: number | string;
    toKm?: number | string | null;
    amount: number | string;
  },
) {
  const next = upsertTransportSlab(await listTransportSlabs(campusId), input);
  await writeSetting(campusId, TRANSPORT_SLABS_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next[next.length - 1]!
  );
}

export async function getTransportSlab(campusId: string, id: string) {
  const row = (await listTransportSlabs(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("transport slab");
  return row;
}

export async function patchCampusTransportSlab(
  campusId: string,
  id: string,
  input: {
    name?: string;
    fromKm?: number | string;
    toKm?: number | string | null;
    amount?: number | string;
  },
) {
  const next = patchTransportSlab(await listTransportSlabs(campusId), id, input);
  await writeSetting(campusId, TRANSPORT_SLABS_KEY, next);
  return next.find((row) => row.id === trim(id)) ?? next[next.length - 1]!;
}

export async function removeTransportSlab(campusId: string, id: string) {
  const next = dropTransportSlab(await listTransportSlabs(campusId), id);
  await writeSetting(campusId, TRANSPORT_SLABS_KEY, next);
  return { id: trim(id), deleted: true };
}
