import type { NavGroup, NavItem } from "./nav";
import type { ScreenDef } from "./screens";
import { hasPermission, type AuthPrincipal } from "../permissions";

export const OPTIONAL_MODULES = [
  "hostel",
  "canteen",
  "gmeet",
  "lms",
  "naac",
  "copo",
  "alumni",
  "booking",
  "railway",
  "live-classes",
] as const;

export type OptionalModuleId = (typeof OPTIONAL_MODULES)[number];

/** Explicit href → permission. Default is `{module}.profile.view`. */
export const NAV_PERMISSIONS: Record<string, string> = {
  "/staff/dashboard": "dashboard.home.view",
  "/staff/admin/dashboard": "dashboard.home.view",
  "/staff/student/search": "students.profile.view",
  "/staff/student/create": "students.profile.create",
  "/staff/student/disablestudentslist": "students.profile.view",
  "/staff/student/generaterollnumber": "students.profile.edit",
  "/staff/student/student-bulk-upload": "students.profile.create",
  "/staff/category": "students.profile.view",
  "/staff/disable-reason": "students.profile.view",
  "/staff/studentfee": "fees.collect.view",
  "/staff/studentfee/feesearch": "fees.collect.view",
  "/staff/studentfee/feereceipt": "fees.collect.view",
  "/staff/feetype": "fees.master.view",
  "/staff/feegroup": "fees.master.view",
  "/staff/feemaster": "fees.master.view",
  "/staff/feemastercoursewise": "fees.master.edit",
  "/staff/feediscount": "fees.master.view",
  "/staff/fine-rules": "fees.master.view",
  "/staff/stuattendence": "attendance.student.view",
  "/staff/stuattendence/attendencereport": "attendance.student.view",
  "/staff/approve-leave": "attendance.leave.approve",
  "/staff/staffattendance": "hr.staff.view",
  "/staff/leavetypes": "attendance.leave.approve",
  "/staff/leaverequest": "attendance.leave.approve",
  "/staff/staff/leaverequest": "attendance.leave.approve",
  "/staff/examgroup": "exams.group.view",
  "/staff/examgroup/mark-entry-single-subject": "exams.marks.view",
  "/staff/examgroup/mark-entry-subjectwise": "exams.marks.view",
  "/staff/examresult": "exams.marks.view",
  "/staff/examresult/exam-result-block-unblock": "exams.results.approve",
  "/staff/examresult/marksheet": "exams.marks.view",
  "/staff/grade": "exams.group.view",
  "/staff/roles": "settings.roles.view",
  "/staff/users": "settings.users.view",
  "/staff/staff": "hr.staff.view",
  "/staff/designation": "hr.staff.view",
  "/staff/notification": "communicate.notice.view",
  "/staff/schsettings": "settings.campus.view",
  "/staff/module": "settings.modules.view",
  "/staff/admin/backup": "settings.backup.edit",
};

const VIEW_BY_MODULE: Record<string, string> = {
  dashboard: "dashboard.home.view",
  students: "students.profile.view",
  fees: "fees.collect.view",
  attendance: "attendance.student.view",
  academics: "academics.class.view",
  exams: "exams.group.view",
  hr: "hr.staff.view",
  communicate: "communicate.notice.view",
  settings: "settings.campus.view",
  system: "settings.campus.view",
};

export function navPermissionFor(item: Pick<NavItem, "href" | "module">): string {
  if (NAV_PERMISSIONS[item.href]) return NAV_PERMISSIONS[item.href];
  if (VIEW_BY_MODULE[item.module]) return VIEW_BY_MODULE[item.module];
  return `${item.module}.profile.view`;
}

export function optionalModuleForItem(item: {
  href: string;
  module: string;
}): string | null {
  if (item.href.includes("railway")) return "railway";
  if (item.href.startsWith("/staff/gmeet") || item.href.includes("/gmeet")) {
    return "gmeet";
  }
  if (item.href.startsWith("/staff/copo") || item.module === "outcomes") {
    return "copo";
  }
  if (item.module === "room-booking") return "booking";
  if ((OPTIONAL_MODULES as readonly string[]).includes(item.module)) {
    return item.module;
  }
  return null;
}

export function isModuleEnabled(
  flags: Record<string, boolean>,
  moduleId: string,
): boolean {
  if (!(moduleId in flags)) return true;
  return flags[moduleId] !== false;
}

export function filterNav(
  groups: NavGroup[],
  user: AuthPrincipal | null | undefined,
  flags: Record<string, boolean>,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const optional = optionalModuleForItem(item);
        if (optional && !isModuleEnabled(flags, optional)) return false;
        return hasPermission(user, navPermissionFor(item));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function screenIsVisible(
  screen: Pick<ScreenDef, "href" | "module">,
  user: AuthPrincipal | null | undefined,
  flags: Record<string, boolean>,
): boolean {
  const optional = optionalModuleForItem(screen);
  if (optional && !isModuleEnabled(flags, optional)) return false;
  return hasPermission(user, navPermissionFor(screen));
}
