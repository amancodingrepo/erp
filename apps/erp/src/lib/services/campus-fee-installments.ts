import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import {
  dropNamedMaster,
  parseNamedMasters,
  upsertNamedMaster,
} from "@/lib/services/academics-masters";

export const FEE_INSTALLMENTS_KEY = "fees.installments";
export const MASTER_INSTALLMENTS_KEY = "fees.masterInstallments";

export type MasterInstallment = { masterId: string; installmentId: string };

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

export function resolveFeeInstallmentId(
  masters: Array<{ id: string; name: string }>,
  installmentId: unknown,
) {
  const id = trim(installmentId);
  if (!id) return "";
  const found = masters.find((row) => row.id === id);
  if (!found) throw validationError({ installmentId: "unknown" });
  return found.id;
}

export function parseMasterInstallments(value: unknown): MasterInstallment[] {
  if (!Array.isArray(value)) return [];
  const out: MasterInstallment[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const masterId = trim(rec.masterId);
    const installmentId = trim(rec.installmentId);
    if (!masterId || !installmentId || seen.has(masterId)) continue;
    seen.add(masterId);
    out.push({ masterId, installmentId });
  }
  return out;
}

export function upsertMasterInstallment(
  rows: MasterInstallment[],
  masterId: string,
  installmentId: string,
) {
  const id = trim(masterId);
  const installment = trim(installmentId);
  if (!id) throw validationError({ masterId: "required" });
  if (!installment) return rows.filter((row) => row.masterId !== id);
  return [...rows.filter((row) => row.masterId !== id), { masterId: id, installmentId: installment }];
}

export function dropMasterInstallmentsByInstallment(
  rows: MasterInstallment[],
  installmentId: string,
) {
  const key = trim(installmentId);
  if (!key) return rows;
  return rows.filter((row) => row.installmentId !== key);
}

export function dropMasterInstallmentsByMaster(
  rows: MasterInstallment[],
  masterId: string,
) {
  const key = trim(masterId);
  if (!key) return rows;
  return rows.filter((row) => row.masterId !== key);
}

export function attachMasterInstallments<T extends { id: string }>(
  masters: T[],
  mappings: MasterInstallment[],
  named: Array<{ id: string; name: string }>,
) {
  const byMaster = new Map(mappings.map((row) => [row.masterId, row.installmentId]));
  const names = new Map(named.map((row) => [row.id, row.name]));
  return masters.map((row) => {
    const installmentId = byMaster.get(row.id) ?? null;
    return {
      ...row,
      installmentId,
      installment: installmentId ? names.get(installmentId) ?? null : null,
    };
  });
}

export async function listFeeInstallments(campusId: string) {
  return parseNamedMasters(await readSetting(campusId, FEE_INSTALLMENTS_KEY));
}

export async function saveFeeInstallment(
  campusId: string,
  input: { id?: string; name: string },
) {
  const next = upsertNamedMaster(await listFeeInstallments(campusId), input);
  await writeSetting(campusId, FEE_INSTALLMENTS_KEY, next);
  return (
    next.find((row) => row.name.toLowerCase() === trim(input.name).toLowerCase()) ??
    next[next.length - 1]!
  );
}

export async function getFeeInstallment(campusId: string, id: string) {
  const row = (await listFeeInstallments(campusId)).find((entry) => entry.id === trim(id));
  if (!row) throw notFound("fee installment");
  return row;
}

export async function removeFeeInstallment(campusId: string, id: string) {
  const named = await listFeeInstallments(campusId);
  const next = dropNamedMaster(named, id);
  const mappings = dropMasterInstallmentsByInstallment(
    await listMasterInstallments(campusId),
    id,
  );
  await writeSetting(campusId, FEE_INSTALLMENTS_KEY, next);
  await saveMasterInstallments(campusId, mappings);
  return { id: trim(id), deleted: true };
}

export async function listMasterInstallments(campusId: string) {
  return parseMasterInstallments(await readSetting(campusId, MASTER_INSTALLMENTS_KEY));
}

export async function saveMasterInstallments(
  campusId: string,
  rows: MasterInstallment[],
) {
  await writeSetting(campusId, MASTER_INSTALLMENTS_KEY, rows);
  return rows;
}

export async function attachFeeMasterInstallments<T extends { id: string }>(
  campusId: string,
  masters: T[],
) {
  const [named, mappings] = await Promise.all([
    listFeeInstallments(campusId),
    listMasterInstallments(campusId),
  ]);
  return attachMasterInstallments(masters, mappings, named);
}
