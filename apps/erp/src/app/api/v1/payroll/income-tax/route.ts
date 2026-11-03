import { z } from "zod";
import { prisma } from "@/lib/db";
import { staffInCampus } from "@/lib/campus";
import { validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { decOrNull, financialYearMonths, incomeTaxStatement } from "@/lib/income-tax";
import { ZERO, dec } from "@/lib/money";
import { requireApiPermission } from "@/lib/principal";
import { listRegister } from "@/lib/services/registers-store";
import { registerKind } from "@/lib/services/registers";

const bodySchema = z.object({
  staffId: z.string().min(1),
  fyStart: z.number().int().min(2000).max(2100),
  declarations: z.array(z.object({ elementId: z.string().min(1), amount: z.number().min(0) })).default([]),
});

/** Works out a staff member's yearly tax from their payslips. Nothing is saved. */
export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const body = bodySchema.parse(await readJson(request));
    const staff = await staffInCampus(user.campusId, body.staffId);
    const months = financialYearMonths(body.fyStart);
    const [slips, slabRows, elements] = await Promise.all([
      prisma.payrollSlip.findMany({
        where: { staffId: staff.id, run: { campusId: user.campusId, OR: months.map((m) => ({ year: m.year, month: m.month })) } },
        include: { run: { select: { year: true, month: true } } },
      }),
      prisma.payrollTaxSlab.findMany({ where: { campusId: user.campusId, kind: "TDS" } }),
      listRegister(user.campusId, registerKind("tax-declarations")),
    ]);
    const declarations = body.declarations.map((d) => {
      const element = elements.find((e) => e.id === d.elementId) as Record<string, unknown> | undefined;
      if (!element) throw validationError({ declarations: "an income tax element was not found" });
      return { name: String(element.name ?? "Element"), declared: dec(String(d.amount)), limit: decOrNull(element.maxLimit) };
    });
    const statement = incomeTaxStatement({
      gross: slips.reduce((sum, slip) => sum.add(slip.gross), ZERO),
      tdsDeducted: slips.reduce((sum, slip) => sum.add(slip.tds), ZERO),
      declarations,
      slabs: slabRows.map((r) => ({ minAmount: r.minAmount, maxAmount: r.maxAmount, rate: r.rate ?? ZERO })),
    });
    return ok({
      staff: { id: staff.id, name: [staff.firstName, staff.lastName].filter(Boolean).join(" "), employeeId: staff.employeeId },
      financialYear: body.fyStart + "-" + String(body.fyStart + 1).slice(2),
      months: slips.map((s) => s.run.year + "-" + String(s.run.month).padStart(2, "0")).sort(),
      slabs: slabRows.length,
      ...statement,
      lines: statement.lines.map((l) => ({ ...l, declared: l.declared.toString(), limit: l.limit?.toString() ?? null, allowed: l.allowed.toString() })),
      gross: statement.gross.toString(),
      deductions: statement.deductions.toString(),
      taxable: statement.taxable.toString(),
      tax: statement.tax.toString(),
      tdsDeducted: statement.tdsDeducted.toString(),
      balance: statement.balance.toString(),
    });
  } catch (error) {
    return fail(error);
  }
}
