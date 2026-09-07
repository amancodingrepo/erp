import { PayElementKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { ZERO, dec } from "@/lib/money";
import {
  DEFAULT_PAY_ELEMENTS,
  DEFAULT_PT_SLABS,
  DEFAULT_TDS_SLABS,
  esiEmployee,
  moneyRound,
  pfEmployee,
  ptFromSlabs,
  tdsMonthly,
  type AmountSlab,
  type RateSlab,
} from "@/lib/payroll-statutory";

export async function ensurePayrollDefaults(campusId: string) {
  for (const row of DEFAULT_PAY_ELEMENTS) {
    await prisma.payElement.upsert({
      where: { campusId_code: { campusId, code: row.code } },
      update: { name: row.name, kind: row.kind, isStatutory: row.isStatutory },
      create: {
        campusId,
        name: row.name,
        code: row.code,
        kind: row.kind,
        isStatutory: row.isStatutory,
      },
    });
  }
  const existing = await prisma.payrollTaxSlab.count({ where: { campusId } });
  if (existing === 0) {
    await prisma.payrollTaxSlab.createMany({
      data: [
        ...DEFAULT_PT_SLABS.map((s) => ({
          campusId,
          kind: s.kind,
          minAmount: dec(s.minAmount),
          maxAmount: s.maxAmount ? dec(s.maxAmount) : null,
          taxAmount: dec(s.taxAmount),
        })),
        ...DEFAULT_TDS_SLABS.map((s) => ({
          campusId,
          kind: s.kind,
          minAmount: dec(s.minAmount),
          maxAmount: s.maxAmount ? dec(s.maxAmount) : null,
          rate: dec(s.rate),
        })),
      ],
    });
  }
}

export async function listPayElements(campusId: string) {
  await ensurePayrollDefaults(campusId);
  return prisma.payElement.findMany({
    where: { campusId },
    orderBy: { code: "asc" },
  });
}

export async function createPayElement(
  campusId: string,
  input: { name: string; code: string; kind: PayElementKind },
) {
  await ensurePayrollDefaults(campusId);
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) throw validationError({ code: "required" });
  const existing = await prisma.payElement.findUnique({
    where: { campusId_code: { campusId, code } },
  });
  if (existing) throw conflict("code already exists");
  return prisma.payElement.create({
    data: { campusId, name, code, kind: input.kind },
  });
}

export async function attachPayElement(
  campusId: string,
  input: { staffId: string; elementId: string; amount: number | string },
) {
  const staff = await prisma.staff.findFirst({
    where: { id: input.staffId, campusId },
  });
  if (!staff) throw notFound("staff");
  const element = await prisma.payElement.findFirst({
    where: { id: input.elementId, campusId },
  });
  if (!element) throw notFound("pay element");
  if (element.isStatutory) {
    throw validationError({ elementId: "statutory heads are computed" });
  }
  const amount = dec(input.amount);
  if (amount.lt(0)) throw validationError({ amount: "must be >= 0" });
  return prisma.staffPayStructure.upsert({
    where: {
      staffId_elementId: { staffId: staff.id, elementId: element.id },
    },
    update: { amount },
    create: { staffId: staff.id, elementId: element.id, amount },
  });
}

export async function listStaffPayStructure(campusId: string) {
  return prisma.staffPayStructure.findMany({
    where: { staff: { campusId } },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      element: true,
    },
    orderBy: { staffId: "asc" },
  });
}

export async function listTaxSlabs(campusId: string, kind?: string) {
  await ensurePayrollDefaults(campusId);
  return prisma.payrollTaxSlab.findMany({
    where: { campusId, ...(kind ? { kind } : {}) },
    orderBy: { minAmount: "asc" },
  });
}

export async function createTaxSlab(
  campusId: string,
  input: {
    kind: "PT" | "TDS";
    minAmount: number | string;
    maxAmount?: number | string | null;
    rate?: number | string;
    taxAmount?: number | string;
  },
) {
  if (input.kind !== "PT" && input.kind !== "TDS") {
    throw validationError({ kind: "PT or TDS" });
  }
  return prisma.payrollTaxSlab.create({
    data: {
      campusId,
      kind: input.kind,
      minAmount: dec(input.minAmount),
      maxAmount:
        input.maxAmount === undefined || input.maxAmount === null || input.maxAmount === ""
          ? null
          : dec(input.maxAmount),
      rate: input.rate === undefined ? null : dec(input.rate),
      taxAmount: input.taxAmount === undefined ? null : dec(input.taxAmount),
    },
  });
}

function asAmountSlabs(rows: Array<{ minAmount: Prisma.Decimal; maxAmount: Prisma.Decimal | null; taxAmount: Prisma.Decimal | null }>): AmountSlab[] {
  return rows.map((r) => ({
    minAmount: r.minAmount,
    maxAmount: r.maxAmount,
    taxAmount: r.taxAmount ?? ZERO,
  }));
}

function asRateSlabs(rows: Array<{ minAmount: Prisma.Decimal; maxAmount: Prisma.Decimal | null; rate: Prisma.Decimal | null }>): RateSlab[] {
  return rows.map((r) => ({
    minAmount: r.minAmount,
    maxAmount: r.maxAmount,
    rate: r.rate ?? ZERO,
  }));
}

export async function generatePayrollRun(
  campusId: string,
  input: { year: number; month: number },
) {
  if (input.month < 1 || input.month > 12) {
    throw validationError({ month: "1-12" });
  }
  await ensurePayrollDefaults(campusId);
  const existing = await prisma.payrollRun.findUnique({
    where: {
      campusId_year_month: { campusId, year: input.year, month: input.month },
    },
  });
  if (existing) throw conflict("payroll already generated for this month");
  const [structures, ptRows, tdsRows] = await Promise.all([
    prisma.staffPayStructure.findMany({
      where: { staff: { campusId, isActive: true } },
      include: { element: true, staff: true },
    }),
    prisma.payrollTaxSlab.findMany({ where: { campusId, kind: "PT" } }),
    prisma.payrollTaxSlab.findMany({ where: { campusId, kind: "TDS" } }),
  ]);
  const ptSlabs = asAmountSlabs(ptRows);
  const tdsSlabs = asRateSlabs(tdsRows);
  const byStaff = new Map<string, typeof structures>();
  for (const row of structures) {
    const list = byStaff.get(row.staffId) ?? [];
    list.push(row);
    byStaff.set(row.staffId, list);
  }
  const slips: Prisma.PayrollSlipCreateWithoutRunInput[] = [];
  for (const [staffId, rows] of byStaff) {
    const earnings = rows.filter((r) => r.element.kind === PayElementKind.EARNING);
    if (!earnings.length) continue;
    let gross = ZERO;
    let pfWages = ZERO;
    const lines: Array<{ code: string; amount: string }> = [];
    for (const row of earnings) {
      gross = gross.add(row.amount);
      if (row.element.code === "BASIC" || row.element.code === "DA") {
        pfWages = pfWages.add(row.amount);
      }
      lines.push({ code: row.element.code, amount: row.amount.toString() });
    }
    const pf = pfEmployee(pfWages);
    const esi = esiEmployee(gross);
    const pt = ptFromSlabs(gross, ptSlabs);
    const tds = tdsMonthly(gross, tdsSlabs);
    const net = moneyRound(gross.sub(pf).sub(esi).sub(pt).sub(tds));
    if (net.lt(0)) {
      throw validationError({ net: `negative net for staff ${staffId}` });
    }
    slips.push({
      staff: { connect: { id: staffId } },
      gross,
      pf,
      esi,
      pt,
      tds,
      net,
      lines,
    });
  }
  return prisma.payrollRun.create({
    data: {
      campusId,
      year: input.year,
      month: input.month,
      slips: { create: slips },
    },
    include: {
      slips: { include: { staff: { select: { employeeId: true, firstName: true, lastName: true } } } },
    },
  });
}

export async function listPayrollRuns(campusId: string) {
  return prisma.payrollRun.findMany({
    where: { campusId },
    include: { slips: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}
