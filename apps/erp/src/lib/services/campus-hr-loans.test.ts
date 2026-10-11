import { describe, expect, it } from "vitest";
import {
  attachStaffLoans,
  parseStaffLoan,
  repayStaffLoan,
  upsertStaffLoan,
} from "./campus-hr-loans";

describe("staff loans", () => {
  it("records a loan on live staff and reduces balance on repay", () => {
    const loan = parseStaffLoan({
      staffId: "st1",
      amount: "5000",
      issuedOn: "2026-04-01",
      dueOn: "2026-10-01",
      note: "advance",
    });
    expect(loan).toMatchObject({
      staffId: "st1",
      amount: 5000,
      balance: 5000,
      issuedOn: "2026-04-01",
    });
    const rows = upsertStaffLoan([], loan);
    expect(repayStaffLoan(rows, rows[0]!.id, 1200)[0]?.balance).toBe(3800);
    expect(
      attachStaffLoans([{ id: "st1" }], rows)[0].loans,
    ).toHaveLength(1);
    expect(() => parseStaffLoan({ staffId: "st1", amount: 0 })).toThrow();
    expect(() => repayStaffLoan(rows, rows[0]!.id, 99999)).toThrow();
  });
});
