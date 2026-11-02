import { PaymentMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assertPartialAmount,
  bulkIdempotencyKey,
  invoiceBalance,
  parseBulkPay,
  parsePaymentMethod,
  parseStudentPay,
} from "./fees-bulk";

describe("fee pay helpers", () => {
  it("maps spec method aliases onto live PaymentMethod", () => {
    expect(parsePaymentMethod("upi")).toBe(PaymentMethod.UPI);
    expect(parsePaymentMethod("qr")).toBe(PaymentMethod.UPI);
    expect(parsePaymentMethod("neft")).toBe(PaymentMethod.BANK_TRANSFER);
    expect(parsePaymentMethod("online")).toBe(PaymentMethod.GATEWAY);
    expect(parsePaymentMethod("debit_card")).toBe(PaymentMethod.CARD);
    expect(parsePaymentMethod("CASH")).toBe(PaymentMethod.CASH);
    expect(() => parsePaymentMethod("bitcoin")).toThrow();
  });

  it("parses nested pay body including line_ids and instrument", () => {
    expect(
      parseStudentPay({
        amount: "250.5",
        method: "cheque",
        line_ids: ["line-1", "line-2"],
        invoice_id: "inv-1",
        remark: "term 1",
        instrument: { cheque_no: "CH-9" },
      }),
    ).toEqual({
      amount: 250.5,
      method: PaymentMethod.CHEQUE,
      lineId: "line-1",
      invoiceId: "inv-1",
      enrollmentId: undefined,
      note: "term 1",
      reference: "CH-9",
      paidAt: undefined,
    });
    expect(() => parseStudentPay({ method: "cash" })).toThrow();
    expect(() => parseStudentPay({ amount: 0, method: "cash" })).toThrow();
  });

  it("treats partial as strictly less than remaining due", () => {
    expect(invoiceBalance("1000", "200", "50")).toBe(750);
    expect(() => assertPartialAmount(750, 750)).toThrow();
    expect(() => assertPartialAmount(10, 0)).toThrow();
    expect(() => assertPartialAmount(100, 750)).not.toThrow();
  });

  it("parses bulk-pay rows and stamps per-row idempotency keys", () => {
    expect(
      parseBulkPay({
        payments: [
          { studentId: "s1", amount: 100, method: "upi" },
          { student_id: "s2", invoiceId: "inv-2", amount: 50, method: "cash" },
        ],
      }),
    ).toHaveLength(2);
    expect(() => parseBulkPay({ payments: [] })).toThrow();
    expect(bulkIdempotencyKey("bulk-1", 0, { studentId: "s1" })).toBe(
      "bulk-1:0:s1:auto",
    );
    expect(() => bulkIdempotencyKey(" ", 0, { studentId: "s1" })).toThrow();
  });
});
