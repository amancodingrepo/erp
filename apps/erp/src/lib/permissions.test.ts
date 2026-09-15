import { describe, expect, it } from "vitest";
import {
  filterNav,
  isForeverOff,
  isModuleEnabled,
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

  it("allows PlatformAdmin every permission", () => {
    const admin = principal({
      roles: ["PlatformAdmin"],
      permissions: [],
    });
    expect(hasPermission(admin, "tenants.campus.create")).toBe(true);
  });

  it("denies a Teacher from collecting fees", () => {
    expect(hasPermission(principal(), "fees.collect.collect")).toBe(false);
  });

  it("limits Teacher nav to classwork screens", () => {
    const teacher = principal({
      roles: ["Teacher"],
      permissions: [
        "dashboard.home.view",
        "students.profile.view",
        "attendance.student.view",
        "attendance.student.edit",
        "exams.group.view",
        "exams.marks.view",
        "exams.marks.edit",
        "academics.class.view",
        "communicate.notice.view",
      ],
    });
    const hrefs = filterNav(NAV, teacher, {
      "lesson-plan": true,
      assignments: true,
      gmeet: true,
    }).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/dashboard");
    expect(hrefs).toContain("/staff/stuattendence");
    expect(hrefs).toContain("/staff/homework");
    expect(hrefs).toContain("/staff/student/search");
    expect(hrefs).not.toContain("/staff/student/create");
    expect(hrefs).not.toContain("/staff/student/bulkdelete");
    expect(hrefs).not.toContain("/staff/studentfee");
    expect(hrefs).not.toContain("/staff/onlinestudent");
    expect(hrefs).not.toContain("/staff/users");
    expect(hrefs).not.toContain("/staff/canteen/menu-list");
    expect(hrefs).not.toContain("/staff/examgroup");
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

  it("hides unwired screens when optional modules are off", () => {
    const admin = principal({ roles: ["SuperAdmin"], permissions: [] });
    const groups = filterNav(NAV, admin, {});
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/dashboard");
    expect(hrefs).toContain("/staff/student/search");
    expect(hrefs).toContain("/staff/studentfee");
    expect(hrefs).toContain("/staff/module");
    expect(hrefs).toContain("/staff/student/bulkdelete");
    expect(hrefs).not.toContain("/staff/hostel");
    expect(hrefs).not.toContain("/staff/atkt-form/atkt-form-student");
    expect(hrefs).not.toContain("/staff/seating-arrangement");
    expect(hrefs).not.toContain("/staff/onlineexam");
    expect(hrefs).not.toContain("/staff/admission/generatemeritlist");
    expect(hrefs).not.toContain("/staff/updater");
    expect(hrefs).not.toContain("/staff/staffpayroll/staff-payroll");
    expect(hrefs).not.toContain("/staff/railway-concession");
    expect(hrefs).not.toContain("/staff/canteen/menu-list");
  });

  it("shows remaining modules when enabled", () => {
    const admin = principal({ roles: ["SuperAdmin"], permissions: [] });
    const groups = filterNav(NAV, admin, {
      canteen: true,
      lms: true,
      railway: true,
      onlineexam: true,
      recruitment: true,
      inventory: true,
      alumni: true,
      cms: true,
      finance: true,
      placements: true,
      activities: true,
      "lesson-plan": true,
      assignments: true,
      downloads: true,
      booking: true,
      mentoring: true,
    });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/canteen/menu-list");
    expect(hrefs).toContain("/staff/onlinecourse/course");
    expect(hrefs).toContain("/staff/railway-concession");
    expect(hrefs).toContain("/staff/onlineexam");
    expect(hrefs).toContain("/staff/hr-recruitment");
    expect(hrefs).toContain("/staff/item");
    expect(hrefs).not.toContain("/staff/updater");
  });

  it("shows online application inbox when admission is enabled", () => {
    const admin = principal({ roles: ["SuperAdmin"], permissions: [] });
    const groups = filterNav(NAV, admin, { admission: true });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/onlinestudent");
    expect(hrefs).toContain("/staff/onlineadmission/admissionsetting");
  });

  it("lets SuperAdmin demo an enabled optional module as empty-state nav", () => {
    const admin = principal({ roles: ["SuperAdmin"], permissions: [] });
    const groups = filterNav(NAV, admin, { hostel: true });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/staff/hostel");
    expect(hrefs).not.toContain("/staff/updater");
  });

  it("shows Multi Branch only to PlatformAdmin when the module is on", () => {
    const superOnly = principal({ roles: ["SuperAdmin"], permissions: [] });
    const platform = principal({
      roles: ["PlatformAdmin"],
      permissions: [],
    });
    const flags = { "multi-campus": true };
    const superHrefs = filterNav(NAV, superOnly, flags).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    const platformHrefs = filterNav(NAV, platform, flags).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    expect(superHrefs).not.toContain("/staff/multibranch/branch/overview");
    expect(platformHrefs).toContain("/staff/multibranch/branch/overview");
  });

  it("treats optional modules as off unless explicitly enabled", () => {
    expect(isModuleEnabled({}, "hostel")).toBe(false);
    expect(isModuleEnabled({ hostel: true }, "hostel")).toBe(true);
    expect(isForeverOff("updater")).toBe(true);
    expect(isModuleEnabled({ updater: true }, "updater")).toBe(false);
  });
});
