import { describe, expect, it } from "vitest";
import { dec } from "@/lib/money";
import { DEFAULT_TDS_SLABS } from "@/lib/payroll-statutory";
import { financialYearMonths, incomeTaxStatement } from "./income-tax";

const slabs = DEFAULT_TDS_SLABS.map((s) => ({ minAmount: dec(s.minAmount), maxAmount: s.maxAmount ? dec(s.maxAmount) : null, rate: dec(s.rate) }));

describe("incomeTaxStatement", () => {
  it("caps each declaration at its limit and taxes the rest by slab", () => {
    const out = incomeTaxStatement({
      gross: dec("900000"),
      tdsDeducted: dec("40000"),
      declarations: [{ name: "80C", declared: dec("200000"), limit: dec("150000") }, { name: "80D", declared: dec("0"), limit: null }],
      slabs,
    });
    expect(out.deductions.toString()).toBe("150000");
    expect(out.taxable.toString()).toBe("750000");
    // 2.5L-5L at 5% = 12,500; 5L-7.5L at 20% = 50,000
    expect(out.tax.toString()).toBe("62500");
    expect(out.balance.toString()).toBe("22500");
  });
  it("applies the rebate at or below 5 lakh and never goes below zero taxable", () => {
    expect(incomeTaxStatement({ gross: dec("500000"), tdsDeducted: dec("0"), declarations: [], slabs }).tax.toString()).toBe("0");
    const out = incomeTaxStatement({ gross: dec("100000"), tdsDeducted: dec("1000"), declarations: [{ name: "x", declared: dec("200000"), limit: null }], slabs });
    expect(out.taxable.toString()).toBe("0");
    expect(out.balance.toString()).toBe("-1000");
  });
  it("covers April to March", () => {
    const months = financialYearMonths(2026);
    expect(months[0]).toEqual({ year: 2026, month: 4 });
    expect(months[11]).toEqual({ year: 2027, month: 3 });
    expect(months).toHaveLength(12);
  });
});
