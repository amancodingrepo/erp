import { describe, expect, it } from "vitest";
import { upsertNamedMaster } from "./academics-masters";
import {
  attachMasterInstallments,
  dropMasterInstallmentsByInstallment,
  dropMasterInstallmentsByMaster,
  parseMasterInstallments,
  resolveFeeInstallmentId,
  upsertMasterInstallment,
} from "./campus-fee-installments";

describe("fee installment types", () => {
  it("resolves a live named installment and maps one name onto a fee master", () => {
    const named = upsertNamedMaster([], { name: "Term 1" });
    expect(resolveFeeInstallmentId(named, named[0]!.id)).toBe(named[0]!.id);
    expect(() => resolveFeeInstallmentId(named, "missing")).toThrow();
    expect(resolveFeeInstallmentId(named, "  ")).toBe("");

    const mapped = upsertMasterInstallment(parseMasterInstallments([]), "m1", named[0]!.id);
    expect(upsertMasterInstallment(mapped, "m1", named[0]!.id)).toHaveLength(1);
    expect(
      attachMasterInstallments([{ id: "m1", group: { name: "Day" } }], mapped, named)[0],
    ).toMatchObject({ installmentId: named[0]!.id, installment: "Term 1" });
    expect(dropMasterInstallmentsByInstallment(mapped, named[0]!.id)).toEqual([]);
    expect(dropMasterInstallmentsByMaster(mapped, "m1")).toEqual([]);
    expect(dropMasterInstallmentsByMaster(mapped, "other")).toEqual(mapped);
  });
});
