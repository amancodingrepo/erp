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
  "admission",
  "payroll",
  "mentoring",
  "recruitment",
  "atkt",
  "seating",
  "onlineexam",
  "updater",
  "library",
  "inventory",
  "transport",
  "certificates",
  "front-office",
  "cms",
  "finance",
  "placements",
  "activities",
  "feedback",
  "lesson-plan",
  "assignments",
  "downloads",
  "multi-campus",
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
  "/staff/print-headerfooter": "settings.campus.view",
  "/staff/classes": "academics.class.view",
  "/staff/sections": "academics.class.view",
  "/staff/subject": "academics.class.view",
  "/staff/sessions": "academics.class.view",
  "/staff/department": "academics.class.view",
  "/staff/course-master": "academics.class.view",
  "/staff/timetable/classreport": "academics.class.view",
  "/staff/stdtransfer": "academics.class.view",
  "/staff/holiday/set-working-days": "academics.class.view",
  "/staff/report/studentinformation": "students.profile.view",
  "/staff/financereports/finance": "fees.collect.view",
  "/staff/attendencereports/attendance": "attendance.student.view",
  "/staff/examresult/examinations": "exams.marks.view",
  "/staff/userlog": "settings.users.view",
  "/staff/userlog/payment-log": "fees.collect.view",
  "/staff/audit": "settings.campus.view",
  "/staff/report/human-resource": "hr.staff.view",
  "/staff/module": "settings.modules.view",
  "/staff/onlinestudent": "students.profile.view",
  "/staff/onlineadmission/admissionsetting": "settings.campus.view",
  "/staff/admission/cutofflist": "students.profile.edit",
  "/staff/admission/importapplication": "students.profile.create",
  "/staff/admission/generatemeritlist": "students.profile.edit",
  "/staff/admission/manageadmission": "students.profile.edit",
  "/staff/hostel": "students.profile.view",
  "/staff/hostelroom": "students.profile.view",
  "/staff/hostel/assign-room": "students.profile.edit",
  "/staff/hostel/change-room": "students.profile.edit",
  "/staff/hostel/vacancy-status": "students.profile.view",
  "/staff/route": "students.profile.view",
  "/staff/pickuppoint": "students.profile.view",
  "/staff/vehicle": "students.profile.view",
  "/staff/vehroute": "students.profile.view",
  "/staff/pickuppoint/student-fees": "students.profile.edit",
  "/staff/transport/feemaster": "students.profile.view",
  "/staff/mailsms/email-template": "communicate.notice.edit",
  "/staff/mailsms/sms-template": "communicate.notice.edit",
  "/staff/mailsms/compose": "communicate.notice.edit",
  "/staff/mailsms/compose-sms": "communicate.notice.edit",
  "/staff/mailsms": "communicate.notice.view",
  "/staff/mailsms/schedule": "communicate.notice.view",
  "/staff/feereminder/setting": "fees.collect.view",
  "/staff/studentidcard": "students.profile.view",
  "/staff/generateidcard/search": "students.profile.view",
  "/staff/certificate": "students.profile.view",
  "/staff/generatecertificate": "students.profile.view",
  "/staff/staffidcard": "hr.staff.view",
  "/staff/generatestaffidcard": "hr.staff.view",
  "/staff/certificate-report": "students.profile.view",
  "/staff/enquiry": "students.profile.view",
  "/staff/visitors": "students.profile.view",
  "/staff/visitorspurpose": "students.profile.edit",
  "/staff/book/getall": "students.profile.view",
  "/staff/member": "students.profile.edit",
  "/staff/member/student": "students.profile.edit",
  "/staff/member/teacher": "students.profile.edit",
  "/staff/atkt-form/atkt-form-student": "exams.group.create",
  "/staff/atkt-form/edit-atkt-form-student": "exams.group.create",
  "/staff/atkt-form/admissionsetting": "exams.group.create",
  "/staff/atkt-form/atkt-form-report": "exams.group.view",
  "/staff/examgroup/revaluation-form": "exams.group.create",
  "/staff/revaluation-form/revaluationformsetting": "exams.group.create",
  "/staff/paymentsettings": "settings.campus.view",
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

export const V1_WIRED_HREFS = new Set(Object.keys(NAV_PERMISSIONS));

export function isV1WiredHref(href: string) {
  return V1_WIRED_HREFS.has(href);
}

export function optionalModuleForItem(item: {
  href: string;
  module: string;
}): string | null {
  if (item.href.includes("updater")) return "updater";
  if (item.href.includes("railway")) return "railway";
  if (item.href.includes("atkt") || item.href.includes("revaluation")) return "atkt";
  if (item.href.includes("seating-arrangement")) return "seating";
  if (item.href.includes("onlineexam")) return "onlineexam";
  if (item.href.startsWith("/staff/gmeet") || item.href.includes("/gmeet")) {
    return "gmeet";
  }
  if (item.href.startsWith("/staff/copo") || item.module === "outcomes") {
    return "copo";
  }
  if (item.module === "room-booking") return "booking";
  if (item.href.includes("hr-recruitment")) return "recruitment";
  if ((OPTIONAL_MODULES as readonly string[]).includes(item.module)) {
    return item.module;
  }
  return null;
}

export function isForeverOff(moduleId: string) {
  return moduleId === "updater";
}

export function isModuleEnabled(
  flags: Record<string, boolean>,
  moduleId: string,
): boolean {
  if (isForeverOff(moduleId)) return false;
  if (!(OPTIONAL_MODULES as readonly string[]).includes(moduleId)) return true;
  return flags[moduleId] === true;
}

function itemVisible(
  item: { href: string; module: string },
  user: AuthPrincipal | null | undefined,
  flags: Record<string, boolean>,
): boolean {
  const optional = optionalModuleForItem(item);
  if (optional && !isModuleEnabled(flags, optional)) return false;
  if (!isV1WiredHref(item.href)) {
    if (!optional || !isModuleEnabled(flags, optional)) return false;
  }
  return hasPermission(user, navPermissionFor(item));
}

export function filterNav(
  groups: NavGroup[],
  user: AuthPrincipal | null | undefined,
  flags: Record<string, boolean>,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemVisible(item, user, flags)),
    }))
    .filter((group) => group.items.length > 0);
}

export function screenIsVisible(
  screen: Pick<ScreenDef, "href" | "module">,
  user: AuthPrincipal | null | undefined,
  flags: Record<string, boolean>,
): boolean {
  return itemVisible(screen, user, flags);
}
