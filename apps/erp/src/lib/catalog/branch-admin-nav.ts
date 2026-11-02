import type { NavGroup, NavItem } from "./nav";

/** School Diary Branch Admin sidebar (independent rebuild; same order and jobs). */
export const BRANCH_ADMIN_SIDEBAR: NavItem[] = [
  { label: "Notice Board", href: "/staff/notification", source: "/NoticeBoard", module: "communicate" },
  { label: "Events", href: "/staff/events", source: "/events/Monthly", module: "communicate" },
  { label: "Messages", href: "/staff/messages", source: "/messages", module: "communicate" },
  { label: "My Branch", href: "/staff/dashboard", source: "/Admin/ManageBranch", module: "dashboard" },
  { label: "Contacts", href: "/staff/contacts", source: "/Contacts", module: "students" },
  { label: "Fees", href: "/staff/studentfee", source: "/Admin/FeeType", module: "fees" },
  { label: "Attendance", href: "/staff/stuattendence", source: "/attendance", module: "attendance" },
  {
    label: "Attendance Dashboard",
    href: "/staff/attendance-dashboard",
    source: "/ng/orgadmin-dash",
    module: "attendance",
  },
  { label: "Day Care", href: "/staff/daycare", source: "/DayCare", module: "students" },
  { label: "Search Users", href: "/staff/search-users", source: "/SearchUsers", module: "students" },
  {
    label: "Performance Report",
    href: "/staff/student-performance",
    source: "/PerformanceReports",
    module: "exams",
  },
  { label: "Reports", href: "/staff/report/studentinformation", source: "/Reports/Reports", module: "students" },
  {
    label: "Admission/Enquiry Form",
    href: "/staff/admission-forms",
    source: "/AdmissionForm",
    module: "admission",
  },
  { label: "Transport", href: "/staff/route", source: "/Transport/Dashboard", module: "students" },
  { label: "Questionnaires", href: "/staff/questionnaires", source: "/Questionnaires", module: "communicate" },
  { label: "Manage Store", href: "/staff/item", source: "/Store", module: "inventory" },
  { label: "Store Vendor", href: "/staff/itemsupplier", source: "/StoreVendor", module: "inventory" },
];

export const MY_BRANCH_COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Users",
    links: [
      { label: "Manage Parents and Children", href: "/staff/student/search" },
      { label: "Admit New Student", href: "/staff/student/create" },
      { label: "Birthdays", href: "/staff/birthdays" },
      { label: "Manage Staff", href: "/staff/staff" },
      { label: "Manage Bus Drivers", href: "/staff/driver" },
      { label: "Manage Staff Category", href: "/staff/staff-categories" },
    ],
  },
  {
    title: "Academics",
    links: [
      { label: "Manage Classes", href: "/staff/classes" },
      { label: "Manage Subject Categories", href: "/staff/subject-categories" },
      { label: "Manage Subject Types", href: "/staff/subject-types" },
      { label: "Manage Subjects", href: "/staff/subject" },
      { label: "Manage Marks Percentage for Leave Type", href: "/staff/leave-marks-percent" },
      { label: "Manage Academic Year", href: "/staff/sessions" },
      { label: "Change Class", href: "/staff/stdtransfer" },
      { label: "Promote Class", href: "/staff/stdtransfer" },
      { label: "Promote to Alumni", href: "/staff/stdtransfer" },
      { label: "Manage Performance Report Templates", href: "/staff/performance-templates" },
      { label: "Manage House", href: "/staff/schoolhouse" },
      { label: "Change House", href: "/staff/change-house" },
      { label: "Manage Class Eligibility Criteria", href: "/staff/eligibility" },
      { label: "Update Roll Numbers", href: "/staff/student/generaterollnumber" },
    ],
  },
  {
    title: "Administrative",
    links: [
      { label: "Messages", href: "/staff/messages" },
      { label: "One Way Communication", href: "/staff/one-way" },
      { label: "Manage Routes", href: "/staff/route" },
      { label: "Manage Fees Types", href: "/staff/feetype" },
      { label: "Manage Discount Types", href: "/staff/feediscount" },
      { label: "Manage Fees Templates", href: "/staff/feemaster" },
      { label: "Manage External Links", href: "/staff/links" },
      { label: "Bulk Fees Upload", href: "/staff/fees-upload" },
      { label: "Upload student and parent photos in bulk", href: "/staff/bulk-photos" },
      { label: "Manage Attendance Mode Types", href: "/staff/attendance-modes" },
      { label: "Manage Principal Details", href: "/staff/principals" },
      { label: "Manage Fee Installment Types", href: "/staff/fees-installment" },
      { label: "Manage Book Centers", href: "/staff/library/centers" },
    ],
  },
];

export function branchAdminSidebarHrefs() {
  return new Set(BRANCH_ADMIN_SIDEBAR.map((item) => item.href));
}

export function branchAdminNavGroups(): NavGroup[] {
  return [{ label: "Desk", items: BRANCH_ADMIN_SIDEBAR }];
}

/** Catalog screens that stay reachable under More office screens. Unique by href. */
export function moreOfficeNavItems(groups: NavGroup[]): NavItem[] {
  const sidebar = branchAdminSidebarHrefs();
  const seen = new Set<string>();
  const extra: NavItem[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (sidebar.has(item.href) || seen.has(item.href)) continue;
      seen.add(item.href);
      extra.push(item);
    }
  }
  return extra;
}

export function branchAdminDeskGroups(catalogGroups: NavGroup[]): NavGroup[] {
  const more = moreOfficeNavItems(catalogGroups);
  const groups: NavGroup[] = branchAdminNavGroups();
  if (more.length) {
    groups.push({ label: "More office screens", items: more });
  }
  return groups;
}
