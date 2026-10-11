import { describe, expect, it } from "vitest";
import {
  attachStaffModules,
  parseStaffModules,
  resolveStaffModules,
  upsertStaffModules,
} from "./campus-staff-modules";

describe("staff role modules", () => {
  it("keeps unique known modules per live staff id", () => {
    expect(resolveStaffModules(["Fees", "library", "fees"])).toEqual(["fees", "library"]);
    expect(resolveStaffModules([])).toEqual([]);
    expect(() => resolveStaffModules(["payroll"])).toThrow();

    const rows = upsertStaffModules(parseStaffModules([]), "s1", [
      "academics",
      "transport",
    ]);
    expect(rows[0]).toMatchObject({
      staffId: "s1",
      modules: ["academics", "transport"],
    });
    expect(upsertStaffModules(rows, "s1", ["fees"])).toHaveLength(1);
    expect(
      attachStaffModules([{ id: "s1", firstName: "Asha" }], rows)[0],
    ).toMatchObject({ modules: ["academics", "transport"] });
    expect(() => upsertStaffModules([], " ", ["fees"])).toThrow();
  });
});
