import { describe, expect, it } from "vitest";
import { assertCampusStaff, ownStudentsFilter } from "./school-world-shape";

const base = { id: "u1", campusId: "c1", roles: [], permissions: [] };

describe("ownStudentsFilter", () => {
  it("lets staff see the whole campus", () => {
    expect(ownStudentsFilter({ ...base, actorType: "STAFF" })).toEqual({});
  });
  it("limits a student to themselves, even without a linked record", () => {
    expect(ownStudentsFilter({ ...base, actorType: "STUDENT", studentId: "s1" })).toEqual({ id: "s1" });
    expect(ownStudentsFilter({ ...base, actorType: "STUDENT", studentId: null })).toEqual({ id: "__none__" });
  });
  it("limits a parent to their linked children", () => {
    expect(ownStudentsFilter({ ...base, actorType: "GUARDIAN", childIds: ["a", "b"] })).toEqual({ id: { in: ["a", "b"] } });
    expect(ownStudentsFilter({ ...base, actorType: "GUARDIAN" })).toEqual({ id: { in: [] } });
  });
  it("gives applicants nothing and keeps them out of staff actions", () => {
    expect(ownStudentsFilter({ ...base, actorType: "APPLICANT" })).toEqual({ id: "__none__" });
    expect(() => assertCampusStaff({ ...base, actorType: "GUARDIAN" })).toThrow();
  });
});
