import { Prisma } from "@prisma/client";

export const ZERO = new Prisma.Decimal(0);

export function dec(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return ZERO;
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function moneyMin(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lte(b) ? a : b;
}
