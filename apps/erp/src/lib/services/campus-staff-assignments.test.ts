import { describe, expect, it } from "vitest";
import {
  attachStaffAssignments,
  parseStaffIdLists,
  resolveLiveIds,
  upsertStaffIdList,
} from "./campus-staff-assignments";

describe("staff assigned classes and subjects", () => {
  it("keeps unique live ids per staff and attaches both lists", () => {
    const classes = ["c1", "c2", "c3"];
    expect(resolveLiveIds(classes, ["c2", "c1", "c2"], "classIds")).toEqual([
      "c2",
      "c1",
    ]);
    expect(resolveLiveIds(classes, [], "classIds")).toEqual([]);
    expect(() => resolveLiveIds(classes, ["missing"], "classIds")).toThrow();

    const rows = upsertStaffIdList(parseStaffIdLists([]), "s1", ["c1"], "classIds");
    expect(rows[0]).toMatchObject({ staffId: "s1", ids: ["c1"] });
    expect(upsertStaffIdList(rows, "s1", ["c3"], "classIds")).toHaveLength(1);

    const subjects = upsertStaffIdList([], "s1", ["sub1"], "subjectIds");
    expect(
      attachStaffAssignments([{ id: "s1" }], rows, subjects)[0],
    ).toMatchObject({
      classIds: ["c1"],
      subjectIds: ["sub1"],
    });
    expect(() => upsertStaffIdList([], " ", ["c1"], "classIds")).toThrow();
  });
});
