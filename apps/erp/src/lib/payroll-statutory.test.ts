import { describe, expect, it } from "vitest";
import { dec } from "./money";
import {
  esiEmployee,
  pfEmployee,
  ptFromSlabs,
  tdsMonthly,
} from "./payroll-statutory";

describe("Indian payroll statutory", () => {
  it("applies PF ceiling, ESI cutoff, PT slabs, and TDS 87A rebate", () => {
    expect(pfEmployee(dec("20000")).toString()).toBe("1800");
    expect(esiEmployee(dec("20000")).toString()).toBe("150");
    expect(esiEmployee(dec("21000.01")).toString()).toBe("0");
    const pt = [
      { minAmount: dec("0"), maxAmount: dec("18750"), taxAmount: dec("0") },
      { minAmount: dec("18750.01"), maxAmount: dec("22500"), taxAmount: dec("125") },
      { minAmount: dec("22500.01"), maxAmount: null, taxAmount: dec("208") },
    ];
    expect(ptFromSlabs(dec("30000"), pt).toString()).toBe("208");
    const tds = [
      { minAmount: dec("0"), maxAmount: dec("250000"), rate: dec("0") },
      { minAmount: dec("250000"), maxAmount: dec("500000"), rate: dec("0.05") },
      { minAmount: dec("500000"), maxAmount: dec("1000000"), rate: dec("0.20") },
      { minAmount: dec("1000000"), maxAmount: null, rate: dec("0.30") },
    ];
    expect(tdsMonthly(dec("30000"), tds).toString()).toBe("0");
    expect(tdsMonthly(dec("50000"), tds).toString()).toBe("2708.33");
  });
});
