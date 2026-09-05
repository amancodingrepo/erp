import { describe, expect, it } from "vitest";
import {
  filterNav,
  navPermissionFor,
} from "./catalog/nav-permissions";
import { NAV } from "./catalog/nav";
import {
  hasPermission,
  permKey,
  requirePermission,
} from "./permissions";
import type { AuthPrincipal } from "./permissions";

function principal(
  overrides: Partial<AuthPrincipal> = {},
): AuthPrincipal {
  return {
    id: "u1",
    campusId: "c1",
    actorType: "STAFF",
    roles: ["Teacher"],
    permissions: [
      "dashboard.home.view",
      "students.profile.view",
      "attendance.student.view",
      "attendance.student.edit",
      "exams.marks.edit",
    ],
    ...overrides,
  };
}

describe("permKey", () => {
  it("joins module.feature.action", () => {
    expect(permKey("fees", "collect", "collect")).toBe("fees.collect.collect");
  });
});

describe("hasPermission", () => {
  it("returns false when there is no user", () => {
    expect(hasPermission(null, "students.profile.view")).toBe(false);
  });

  it("allows SuperAdmin every permission", () => {
    const admin = principal({
      roles: ["SuperAdmin"],
      permissions: [],
    });
    expect(hasPermission(admin, "fees.collect.collect")).toBe(true);
    expect(hasPermission(admin, "settings.roles.edit")).toBe(true);
  });

  it("denies a Teacher from collecting fees", () => {
    expect(hasPermission(principal(), "fees.collect.collect")).toBe(false);
  });

  it("allows a Teacher to mark attendance", () => {
    expect(hasPermission(principal(), "attendance.student.edit")).toBe(true);
  });

  it("allows an Accountant to collect fees", () => {
    const accountant = principal({
      roles: ["Accountant"],
      permissions: ["fees.collect.collect", "fees.master.edit"],
    });
    expect(hasPermission(accountant, "fees.collect.collect")).toBe(true);
  });
});

describe("requirePermission", () => {
  it("throws 403 when the role lacks the grant", () => {
    expect(() =>
      requirePermission(principal(), "fees", "collect", "collect"),
    ).toThrow();
    try {
      requirePermission(principal(), "fees", "collect", "collect");
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      expect(err.status).toBe(403);
      expect(err.code).toBe("forbidden");
    }
  });

  it("does not throw when the grant is present", () => {
    expect(() =>
      requirePermission(principal(), "attendance", "student", "edit"),
    ).not.toThrow();
  });
});

describe("nav gating", () => {
  it("maps collect fees to fees.collect.view", () => {
    expect(
      navPermissionFor({ href: "/staff/studentfee", module: "fees" }),
    ).toBe("fees.collect.view");
  });

  it("hides fee collect from a Teacher", () => {
    const groups = filterNav(NAV, principal(), {
      hostel: false,
      canteen: false,
      gmeet: false,
      lms: false,
      naac: false,
      copo: false,
      alumni: false,
      booking: false,
      railway: false,
      "live-classes": false,
    });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/staff/studentfee");
    expect(hrefs).not.toContain("/staff/hostel");
    expect(hrefs).toContain("/staff/dashboard");
  });

  it("lets SuperAdmin see enabled modules only", () => {
    const admin = principal({ roles: ["SuperAdmin"], permissions: [] });
    const groups = filterNav(NAV, admin, { hostel: false, fees: true });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/studentfee");
    expect(hrefs).not.toContain("/staff/hostel");
  });
});
