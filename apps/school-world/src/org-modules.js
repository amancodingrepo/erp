/** Staff labels that disappear when the organisation turns that module off. */
export const NAV_MODULE = {
  Fees: "fees",
  "Fee Masters": "fees",
  "Collect Fee": "fees",
  Attendance: "attendance",
  "Attendance Dashboard": "attendance",
  Exams: "exams",
  "Performance Report": "exams",
  Departments: "academics",
  Programs: "academics",
  Sessions: "academics",
  Timetable: "academics",
  "Staff Directory": "hr",
  "Notice Board": "communicate",
  Events: "communicate",
  Messages: "communicate",
  Questionnaires: "communicate",
  Transport: "transport",
  "Manage Store": "store",
  "Store Vendor": "store",
  "My Branch": "students",
  Contacts: "students",
  "Day Care": "students",
  "Search Users": "students",
  Reports: "students",
  "Admission/Enquiry Form": "students",
};

/** Campus desk groups that follow the same organisation switches. */
export const DESK_GROUP_MODULE = {
  "Fees Collection": "fees",
  Payroll: "fees",
  Attendance: "attendance",
  Academics: "academics",
  Examinations: "exams",
  "Human Resource": "hr",
  Communicate: "communicate",
  Transport: "transport",
};

export const ORG_MODULE_ROWS = [
  ["students", "Students"],
  ["fees", "Fees"],
  ["attendance", "Attendance"],
  ["academics", "Academics"],
  ["exams", "Exams"],
  ["hr", "Staff"],
  ["communicate", "Messages"],
  ["transport", "Transport"],
  ["store", "Store"],
];

export function moduleAllowed(moduleId, modules, role) {
  if (role === "super_admin") return true;
  if (!moduleId || !modules || modules[moduleId] === undefined) return true;
  return modules[moduleId] !== false;
}

export function navLabelVisible(label, modules, role) {
  return moduleAllowed(NAV_MODULE[label], modules, role);
}

export function deskGroupVisible(label, modules, role) {
  return moduleAllowed(DESK_GROUP_MODULE[label], modules, role);
}
