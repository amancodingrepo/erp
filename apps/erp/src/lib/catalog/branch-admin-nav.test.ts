import { describe, expect, it } from "vitest";
import {
  BRANCH_ADMIN_SIDEBAR,
  MY_BRANCH_COLUMNS,
  branchAdminDeskGroups,
  branchAdminSidebarHrefs,
  moreOfficeNavItems,
} from "./branch-admin-nav";

describe("School Diary branch admin desk", () => {
  it("keeps the Branch Admin sidebar order", () => {
    expect(BRANCH_ADMIN_SIDEBAR.map((item) => item.label)).toEqual([
      "Notice Board",
      "Events",
      "Messages",
      "My Branch",
      "Contacts",
      "Fees",
      "Attendance",
      "Attendance Dashboard",
      "Day Care",
      "Search Users",
      "Performance Report",
      "Reports",
      "Admission/Enquiry Form",
      "Transport",
      "Questionnaires",
      "Manage Store",
      "Store Vendor",
    ]);
    expect(BRANCH_ADMIN_SIDEBAR[3]?.href).toBe("/staff/dashboard");
  });

  it("puts My Branch into Users, Academics, and Administrative columns", () => {
    expect(MY_BRANCH_COLUMNS.map((col) => col.title)).toEqual([
      "Users",
      "Academics",
      "Administrative",
    ]);
    const labels = MY_BRANCH_COLUMNS.flatMap((col) => col.links.map((link) => link.label));
    expect(labels).toContain("Admit New Student");
    expect(labels).toContain("Manage Staff");
    expect(labels).toContain("Manage Classes");
    expect(labels).toContain("Manage Fees Types");
    expect(branchAdminSidebarHrefs().has("/staff/dashboard")).toBe(true);
  });

  it("keeps extra catalog screens under More office screens", () => {
    const extra = moreOfficeNavItems([
      {
        label: "Fees Collection",
        items: [
          { label: "Fees", href: "/staff/studentfee", source: "", module: "fees" },
          { label: "Payroll", href: "/staff/payroll", source: "", module: "payroll" },
          { label: "Payroll again", href: "/staff/payroll", source: "", module: "payroll" },
        ],
      },
    ]);
    expect(extra.map((item) => item.href)).toEqual(["/staff/payroll"]);
    const desk = branchAdminDeskGroups([
      {
        label: "Fees Collection",
        items: [{ label: "Payroll", href: "/staff/payroll", source: "", module: "payroll" }],
      },
    ]);
    expect(desk.map((g) => g.label)).toEqual(["Desk", "More office screens"]);
    expect(desk[0]?.items).toHaveLength(17);
  });
});
