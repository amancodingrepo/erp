import { Prisma } from "@prisma/client";
import { ZERO, dec, moneyMin } from "@/lib/money";

export const PF_RATE = dec("0.12");
export const PF_CEILING = dec("15000");
export const ESI_RATE = dec("0.0075");
export const ESI_CEILING = dec("21000");
export const TDS_REBATE_LIMIT = dec("500000");

export const DEFAULT_PAY_ELEMENTS = [
  { code: "BASIC", name: "Basic", kind: "EARNING" as const, isStatutory: false },
  { code: "DA", name: "Dearness allowance", kind: "EARNING" as const, isStatutory: false },
  { code: "HRA", name: "House rent allowance", kind: "EARNING" as const, isStatutory: false },
  { code: "PF", name: "Provident fund", kind: "DEDUCTION" as const, isStatutory: true },
  { code: "ESI", name: "ESI", kind: "DEDUCTION" as const, isStatutory: true },
  { code: "PT", name: "Professional tax", kind: "DEDUCTION" as const, isStatutory: true },
  { code: "TDS", name: "TDS", kind: "DEDUCTION" as const, isStatutory: true },
];

export const DEFAULT_PT_SLABS = [
  { kind: "PT", minAmount: "0", maxAmount: "18750", taxAmount: "0" },
  { kind: "PT", minAmount: "18750.01", maxAmount: "22500", taxAmount: "125" },
  { kind: "PT", minAmount: "22500.01", maxAmount: null, taxAmount: "208" },
];

export const DEFAULT_TDS_SLABS = [
  { kind: "TDS", minAmount: "0", maxAmount: "250000", rate: "0" },
  { kind: "TDS", minAmount: "250000", maxAmount: "500000", rate: "0.05" },
  { kind: "TDS", minAmount: "500000", maxAmount: "1000000", rate: "0.20" },
  { kind: "TDS", minAmount: "1000000", maxAmount: null, rate: "0.30" },
];

export function moneyRound(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2);
}

export function pfEmployee(pfWages: Prisma.Decimal) {
  if (pfWages.lte(0)) return ZERO;
  return moneyRound(moneyMin(pfWages, PF_CEILING).mul(PF_RATE));
}

export function esiEmployee(gross: Prisma.Decimal) {
  if (gross.lte(0) || gross.gt(ESI_CEILING)) return ZERO;
  return moneyRound(gross.mul(ESI_RATE));
}

export type AmountSlab = {
  minAmount: Prisma.Decimal;
  maxAmount: Prisma.Decimal | null;
  taxAmount: Prisma.Decimal;
};

export function ptFromSlabs(gross: Prisma.Decimal, slabs: AmountSlab[]) {
  const hit = slabs.find(
    (s) =>
      gross.gte(s.minAmount) && (s.maxAmount === null || gross.lte(s.maxAmount)),
  );
  return hit ? moneyRound(hit.taxAmount) : ZERO;
}

export type RateSlab = {
  minAmount: Prisma.Decimal;
  maxAmount: Prisma.Decimal | null;
  rate: Prisma.Decimal;
};

export function tdsAnnual(income: Prisma.Decimal, slabs: RateSlab[]) {
  if (income.lte(0) || income.lte(TDS_REBATE_LIMIT)) return ZERO;
  let tax = ZERO;
  const sorted = [...slabs].sort((a, b) => a.minAmount.cmp(b.minAmount));
  for (const slab of sorted) {
    if (income.lte(slab.minAmount)) continue;
    const cap =
      slab.maxAmount && slab.maxAmount.lt(income) ? slab.maxAmount : income;
    const band = cap.sub(slab.minAmount);
    if (band.lte(0)) continue;
    tax = tax.add(band.mul(slab.rate));
  }
  return moneyRound(tax);
}

export function tdsMonthly(monthlyGross: Prisma.Decimal, slabs: RateSlab[]) {
  return moneyRound(tdsAnnual(monthlyGross.mul(12), slabs).div(12));
}
