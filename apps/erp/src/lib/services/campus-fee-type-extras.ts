import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const FEE_TYPE_EXTRAS_KEY = "fees.typeExtras";

export type FeeTypeExtra = {
  feeTypeId: string;
  isRefundable: boolean;
  cgst: boolean;
  sgst: boolean;
  igst: boolean;
  visible: boolean;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function flag(value: unknown, fallback: boolean) {
  if (value === undefined) return fallback;
  return Boolean(value);
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

export function parseFeeTypeExtras(value: unknown): FeeTypeExtra[] {
  if (!Array.isArray(value)) return [];
  const out: FeeTypeExtra[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const feeTypeId = trim(rec.feeTypeId);
    if (!feeTypeId || seen.has(feeTypeId)) continue;
    seen.add(feeTypeId);
    out.push({
      feeTypeId,
      isRefundable: Boolean(rec.isRefundable),
      cgst: Boolean(rec.cgst),
      sgst: Boolean(rec.sgst),
      igst: Boolean(rec.igst),
      visible: rec.visible === undefined ? true : Boolean(rec.visible),
    });
  }
  return out;
}

export function upsertFeeTypeExtra(
  rows: FeeTypeExtra[],
  feeTypeId: string,
  patch: Partial<Omit<FeeTypeExtra, "feeTypeId">>,
) {
  const id = trim(feeTypeId);
  if (!id) throw validationError({ feeTypeId: "required" });
  const previous = rows.find((row) => row.feeTypeId === id);
  const next: FeeTypeExtra = {
    feeTypeId: id,
    isRefundable: flag(patch.isRefundable, previous?.isRefundable ?? false),
    cgst: flag(patch.cgst, previous?.cgst ?? false),
    sgst: flag(patch.sgst, previous?.sgst ?? false),
    igst: flag(patch.igst, previous?.igst ?? false),
    visible: flag(patch.visible, previous?.visible ?? true),
  };
  return [...rows.filter((row) => row.feeTypeId !== id), next];
}

export function dropFeeTypeExtra(rows: FeeTypeExtra[], feeTypeId: string) {
  const id = trim(feeTypeId);
  if (!id) throw validationError({ feeTypeId: "required" });
  return rows.filter((row) => row.feeTypeId !== id);
}

export function attachFeeTypeExtras<T extends { id: string }>(
  types: T[],
  extras: FeeTypeExtra[],
) {
  const byId = new Map(extras.map((row) => [row.feeTypeId, row]));
  return types.map((row) => {
    const extra = byId.get(row.id);
    return {
      ...row,
      isRefundable: extra?.isRefundable ?? false,
      cgst: extra?.cgst ?? false,
      sgst: extra?.sgst ?? false,
      igst: extra?.igst ?? false,
      visible: extra?.visible ?? true,
    };
  });
}

export async function listFeeTypeExtras(campusId: string) {
  return parseFeeTypeExtras(await readSetting(campusId, FEE_TYPE_EXTRAS_KEY));
}

export async function saveFeeTypeExtra(
  campusId: string,
  feeTypeId: string,
  patch: Partial<Omit<FeeTypeExtra, "feeTypeId">>,
) {
  const type = await prisma.feeType.findFirst({
    where: { id: feeTypeId, campusId },
    select: { id: true },
  });
  if (!type) throw notFound("fee type");
  const next = upsertFeeTypeExtra(await listFeeTypeExtras(campusId), type.id, patch);
  await writeSetting(campusId, FEE_TYPE_EXTRAS_KEY, next);
  return next.find((row) => row.feeTypeId === type.id)!;
}

export async function purgeFeeTypeExtra(campusId: string, feeTypeId: string) {
  const next = dropFeeTypeExtra(await listFeeTypeExtras(campusId), feeTypeId);
  await writeSetting(campusId, FEE_TYPE_EXTRAS_KEY, next);
  return next;
}
