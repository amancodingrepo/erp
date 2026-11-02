import { describe, expect, it } from "vitest";
import {
  assertDepositable,
  buildDepositSlip,
  claimedPaymentIds,
  dropDepositSlip,
  parseDepositSlips,
  patchDepositSlip,
} from "./fees-deposit";

describe("deposit slips", () => {
  it("banks cash and cheque receipts once", () => {
    expect(() => assertDepositable("UPI")).toThrow();
    expect(() => assertDepositable("CASH")).not.toThrow();
    const rows = buildDepositSlip(parseDepositSlips([]), {
      depositedAt: "2026-10-05",
      bankName: "SBI",
      accountRef: "1234",
      payments: [
        { id: "p1", method: "CASH", amount: 500, cancelled: false, receiptNo: "R-1" },
        { id: "p2", method: "CHEQUE", amount: 250.5, cancelled: false, receiptNo: "R-2" },
      ],
    });
    expect(rows[0]?.amount).toBe(750.5);
    expect(rows[0]?.slipNo.startsWith("DS-")).toBe(true);
    expect(claimedPaymentIds(rows).has("p1")).toBe(true);
    expect(() =>
      buildDepositSlip(rows, {
        depositedAt: "2026-10-06",
        bankName: "SBI",
        payments: [
          { id: "p1", method: "CASH", amount: 500, cancelled: false, receiptNo: "R-1" },
        ],
      }),
    ).toThrow();
  });

  it("rejects cancelled or empty slips", () => {
    expect(() =>
      buildDepositSlip([], {
        depositedAt: "2026-10-05",
        bankName: "HDFC",
        payments: [
          { id: "p9", method: "CASH", amount: 10, cancelled: true, receiptNo: "R-9" },
        ],
      }),
    ).toThrow();
    expect(() =>
      buildDepositSlip([], {
        depositedAt: "2026-10-05",
        bankName: "HDFC",
        payments: [],
      }),
    ).toThrow();
  });

  it("patches bank details and drops a slip so receipts can be banked again", () => {
    const rows = buildDepositSlip(parseDepositSlips([]), {
      depositedAt: "2026-10-05",
      bankName: "SBI",
      payments: [
        { id: "p1", method: "CASH", amount: 100, cancelled: false, receiptNo: "R-1" },
      ],
    });
    const patched = patchDepositSlip(rows, rows[0]!.id, {
      bankName: "HDFC",
      note: "counter",
    });
    expect(patched[0]).toMatchObject({ bankName: "HDFC", note: "counter", amount: 100 });
    expect(claimedPaymentIds(dropDepositSlip(patched, rows[0]!.id)).has("p1")).toBe(false);
    expect(() => dropDepositSlip(rows, "missing")).toThrow();
  });
});
