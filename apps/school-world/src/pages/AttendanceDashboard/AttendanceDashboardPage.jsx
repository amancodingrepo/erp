import React from "react";
import StudentSummaryView from "../Students/StudentSummaryView.jsx";

export default function AttendanceDashboardPage({ students = [], t }) {
  return <StudentSummaryView students={students} moduleName="Attendance Dashboard" t={t} />;
}
