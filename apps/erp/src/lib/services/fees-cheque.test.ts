import { describe, expect, it } from "vitest";
import {
  assertChequePayment,
  parseChequeBounces,
  recordChequeBounce,
} from "./fees-cheque";

describe("cheque bounce", () => {
  it("records one bounce per live cheque payment id", () => {
    expect(() => assertChequePayment("CASH")).toThrow();
    expect(() => assertChequePayment("CHEQUE")).not.toThrow();
    const rows = recordChequeBounce(parseChequeBounces([]), {
      paymentId: "p1",
      receiptNo: "R-1",
      reason: "NSF",
    });
    expect(rows[0]?.reason).toBe("NSF");
    expect(
      recordChequeBounce(rows, {
        paymentId: "p1",
        receiptNo: "R-1",
        reason: "account closed",
      }),
    ).toHaveLength(1);
  });
});
