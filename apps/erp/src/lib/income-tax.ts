import { Prisma } from "@prisma/client";
import { ZERO, dec } from "@/lib/money";
import { type RateSlab, moneyRound, tdsAnnual } from "@/lib/payroll-statutory";

export type Declaration = { name: string; declared: Prisma.Decimal; limit: Prisma.Decimal | null };

/**
 * Yearly income tax for one staff member, with the same slabs and rebate the payroll run uses
 * for monthly TDS (tdsAnnual). Each declared deduction is capped at its element's yearly limit.
 */
export function incomeTaxStatement(input: { gross: Prisma.Decimal; tdsDeducted: Prisma.Decimal; declarations: Declaration[]; slabs: RateSlab[] }) {
  const lines = input.declarations.map((d) => {
    const declared = d.declared.lt(0) ? ZERO : d.declared;
    const allowed = d.limit && declared.gt(d.limit) ? d.limit : declared;
    return { name: d.name, declared: moneyRound(declared), limit: d.limit, allowed: moneyRound(allowed) };
  });
  const deductions = lines.reduce((sum, line) => sum.add(line.allowed), ZERO);
  const taxableRaw = input.gross.sub(deductions);
  const taxable = moneyRound(taxableRaw.lt(0) ? ZERO : taxableRaw);
  const tax = tdsAnnual(taxable, input.slabs);
  return {
    gross: moneyRound(input.gross),
    lines,
    deductions: moneyRound(deductions),
    taxable,
    tax,
    tdsDeducted: moneyRound(input.tdsDeducted),
    balance: moneyRound(tax.sub(input.tdsDeducted)),
  };
}

/** Indian financial year starting 1 April of `startYear`: the payroll months it covers. */
export function financialYearMonths(startYear: number) {
  return [
    ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => ({ year: startYear, month })),
    ...[1, 2, 3].map((month) => ({ year: startYear + 1, month })),
  ];
}

export const decOrNull = (value: unknown) => (value === null || value === undefined || value === "" ? null : dec(value as string));
