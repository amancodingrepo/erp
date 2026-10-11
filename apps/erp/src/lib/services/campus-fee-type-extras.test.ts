import { describe, expect, it } from "vitest";
import {
  attachFeeTypeExtras,
  dropFeeTypeExtra,
  parseFeeTypeExtras,
  upsertFeeTypeExtra,
} from "./campus-fee-type-extras";

describe("fee type extras", () => {
  it("stores refundable and GST flags on a live fee type", () => {
    const rows = upsertFeeTypeExtra(parseFeeTypeExtras([]), "t1", {
      isRefundable: true,
      cgst: true,
      sgst: true,
    });
    expect(rows[0]).toMatchObject({
      feeTypeId: "t1",
      isRefundable: true,
      cgst: true,
      sgst: true,
      igst: false,
      visible: true,
    });
    expect(upsertFeeTypeExtra(rows, "t1", { igst: true })).toHaveLength(1);
    expect(attachFeeTypeExtras([{ id: "t1", name: "Tuition" }], rows)[0]).toMatchObject({
      isRefundable: true,
      cgst: true,
      visible: true,
    });
    expect(() => upsertFeeTypeExtra([], " ", { cgst: true })).toThrow();
    expect(dropFeeTypeExtra(rows, "t1")).toEqual([]);
  });
});
