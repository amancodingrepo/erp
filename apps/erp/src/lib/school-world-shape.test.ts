import { describe, expect, it } from "vitest";
import type { AuthPrincipal } from "./permissions";
import { assertCampusStaff, ownStudentsFilter, schoolWorldRole } from "./school-world-shape";
import { assertSchoolCannotGrantPlatform } from "./superadmin-guard";

const base = { id: "u1", campusId: "c1", roles: [] as string[], permissions: [] };

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

function principal(roles: string[]): AuthPrincipal {
  return {
    id: "user",
    campusId: "campus",
    actorType: "STAFF",
    roles,
    permissions: [],
  };
}

describe("school world platform role", () => {
  it("maps PlatformAdmin to super_admin and leaves campus SuperAdmin as the school admin", () => {
    expect(schoolWorldRole(principal(["PlatformAdmin", "SuperAdmin"]))).toBe("super_admin");
    expect(schoolWorldRole(principal(["SuperAdmin"]))).toBe("school_admin");
    expect(schoolWorldRole(principal(["Principal"]))).toBe("principal");
  });

  it("rejects a school role granting PlatformAdmin", () => {
    expect(() => assertSchoolCannotGrantPlatform(["SuperAdmin"], ["PlatformAdmin"])).toThrow(
      "only a platform admin can grant platform access",
    );
    expect(() => assertSchoolCannotGrantPlatform(["PlatformAdmin"], ["PlatformAdmin"])).not.toThrow();
    expect(() => assertSchoolCannotGrantPlatform(["Principal"], ["Teacher"])).not.toThrow();
  });
});
