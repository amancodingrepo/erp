import React from "react";
import { Panel, Screen } from "../kit.jsx";

// Desk entries whose job is already done by a native School World module that reads and writes the
// same tables (checked in apps/erp/src/app/api: notices -> notice, students -> student,
// fees -> feeInvoiceLine, attendance -> studentAttendance). Each page opens that module.
// (The old screen is not offered as a fallback: the ERP sends X-Frame-Options: DENY, so it cannot be framed.)

function ModuleLink({ title, hint, target, label }) {
  const href = "?" + new URLSearchParams(target).toString();
  return (
    <Screen title={title} hint={hint}>
      <Panel>
        <a className="ck-btn ck-btn-primary" href={href}>{label}</a>
      </Panel>
    </Screen>
  );
}

const link = (props) => function LinkedScreen() { return <ModuleLink {...props} />; };

export const NoticeBoardLink = link({
  title: "Notice board", label: "Open Notice Board", target: { module: "Notice Board" },
  hint: "Notices run in School World's Notice Board module, which shares the same notices. Create, approve and review notices, replies and read receipts there.",
});
export const DashboardLink = link({
  title: "Dashboard", label: "Open Dashboard", target: { module: "Dashboard" },
  hint: "The school overview runs in School World's Dashboard.",
});
export const StudentDetailsLink = link({
  title: "Student details", label: "Open Manage Students", target: { view: "manage" },
  hint: "Find, view and edit students in School World's Manage Students, which uses the same student records.",
});
export const StudentDashboardLink = link({
  title: "Student dashboard", label: "Open Manage Students", target: { view: "manage" },
  hint: "Student lists and details run in School World's Manage Students.",
});
export const StudentAdmissionLink = link({
  title: "Student admission", label: "Add a student", target: { view: "admission" },
  hint: "New students are added with School World's admission form, which saves to the same student records.",
});
export const CollectFeesLink = link({
  title: "Collect fees", label: "Open Fees", target: { module: "Fees" },
  hint: "Fee records and payments run in School World's Fees module, which uses the same fee invoices.",
});
export const FeeSummaryLink = link({
  title: "Fee summary dashboard", label: "Open Fees", target: { module: "Fees" },
  hint: "Fee totals and reports run in School World's Fees module.",
});
export const StudentAttendanceLink = link({
  title: "Student attendance", label: "Open Attendance", target: { module: "Attendance" },
  hint: "Daily attendance is taken in School World's Attendance module, which uses the same attendance records.",
});
export const AttendanceByDateLink = link({
  title: "Attendance by date", label: "Open Attendance", target: { module: "Attendance" },
  hint: "Date-wise attendance runs in School World's Attendance module. For a downloadable report, use Reports, then Attendance.",
});
export const OptionalSubjectsLink = link({
  title: "Optional subjects", label: "Open Performance Report", target: { module: "Performance Report" },
  hint: "Optional subjects are assigned and approved per student in School World's Performance Report, which saves to the same optional-subject records.",
});
export const AdmissionFormLink = link({
  title: "Online admission setting", label: "Open Admission/Enquiry Form", target: { module: "Admission/Enquiry Form" },
  hint: "Which fields the online admission and enquiry forms ask for, and which are required, is set in School World's Admission/Enquiry Form module.",
});
