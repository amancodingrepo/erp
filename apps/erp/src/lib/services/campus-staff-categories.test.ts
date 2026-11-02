import { describe, expect, it } from "vitest";
import { upsertNamedMaster } from "./academics-masters";
import {
  dropStaffCategoryFromExtras,
  resolveStaffCategoryName,
} from "./campus-staff-categories";

describe("staff categories", () => {
  it("keeps one named master per case-insensitive name", () => {
    const rows = upsertNamedMaster([], { name: "PGT" });
    expect(upsertNamedMaster(rows, { name: "pgt" })).toHaveLength(1);
    expect(upsertNamedMaster(rows, { name: "TGT" })).toHaveLength(2);
  });

  it("resolves extras.category to a live master name and rejects unknown", () => {
    const masters = upsertNamedMaster(
      upsertNamedMaster([], { name: "PGT" }),
      { name: "Admin" },
    );
    expect(resolveStaffCategoryName(masters, "pgt")).toBe("PGT");
    expect(resolveStaffCategoryName(masters, "  ")).toBe("");
    expect(() => resolveStaffCategoryName(masters, "Driver")).toThrow();
  });

  it("clears extras that used a dropped category name", () => {
    const extras = [
      { staffId: "s1", category: "PGT" },
      { staffId: "s2", category: "Admin" },
    ];
    expect(dropStaffCategoryFromExtras(extras, "pgt")).toEqual([
      { staffId: "s1", category: "" },
      { staffId: "s2", category: "Admin" },
    ]);
  });
});
