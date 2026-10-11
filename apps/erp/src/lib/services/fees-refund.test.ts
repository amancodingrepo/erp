import { describe, expect, it } from "vitest";
import {
  isContraNote,
  isRefundOf,
  refundableAmount,
  requestedRefund,
} from "./fees-refund";

describe("fee refunds", () => {
  it("keeps reverse contras distinct from refunds and caps the refundable amount", () => {
    expect(isContraNote("contra of RCP-1: mistake")).toBe(true);
    expect(isContraNote("refund of RCP-1: withdrawn")).toBe(false);
    expect(isRefundOf("refund of RCP-1: withdrawn", "RCP-1")).toBe(true);
    expect(isRefundOf("refund of RCP-2: withdrawn", "RCP-1")).toBe(false);
    expect(refundableAmount(100, [40, 10])).toBe(50);
    expect(requestedRefund(undefined, 50)).toBe(50);
    expect(requestedRefund(20, 50)).toBe(20);
    expect(() => refundableAmount(100, [100])).toThrow();
    expect(() => requestedRefund(60, 50)).toThrow();
    expect(() => requestedRefund(0, 50)).toThrow();
  });
});
