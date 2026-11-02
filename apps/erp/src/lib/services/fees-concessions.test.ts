import { describe, expect, it } from "vitest";
import {
  attachConcessions,
  dropConcession,
  firstDiscountIdForStudent,
  parseConcessions,
  upsertConcession,
} from "./fees-concessions";

describe("student concessions", () => {
  it("stores one named discount per student and attaches the live name", () => {
    const discounts = [{ id: "d1", name: "Sibling" }];
    const rows = upsertConcession(
      parseConcessions([]),
      { studentId: "s1", discountId: "d1", note: "second child" },
      discounts,
    );
    expect(attachConcessions(rows, discounts)[0]).toMatchObject({
      discount: "Sibling",
      note: "second child",
    });
    expect(
      upsertConcession(rows, { studentId: "s1", discountId: "d1", note: "updated" }, discounts),
    ).toHaveLength(1);
    expect(() =>
      upsertConcession([], { studentId: "s1", discountId: "missing", note: "" }, discounts),
    ).toThrow();
    expect(() =>
      upsertConcession([], { studentId: " ", discountId: "d1" }, discounts),
    ).toThrow();
    expect(firstDiscountIdForStudent(rows, "s1")).toBe("d1");
    expect(firstDiscountIdForStudent(rows, "s2")).toBeNull();
    expect(dropConcession(rows, rows[0]!.id)).toEqual([]);
    expect(dropConcession(rows, "missing")).toEqual(rows);
  });
});
