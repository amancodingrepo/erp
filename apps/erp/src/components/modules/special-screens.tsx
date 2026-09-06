"use client";

import type { ReactNode } from "react";
import type { ScreenDef } from "@/lib/catalog/screens";
import AcademicsHub from "@/components/modules/academics-hub";
import AttendancePage from "@/app/(staff)/staff/attendance/page";
import DashboardPage from "@/app/(staff)/staff/dashboard/page";
import ExamsPage from "@/app/(staff)/staff/exams/page";
import CollectFeesPage from "@/app/(staff)/staff/fees/collect/page";
import RolesPage from "@/app/(staff)/staff/roles/page";
import CreateStudentPage from "@/app/(staff)/staff/students/create/page";
import StudentsPage from "@/app/(staff)/staff/students/page";
import UsersPage from "@/app/(staff)/staff/users/page";
import StudentsOps from "@/components/modules/students-ops";
import FeesOps from "@/components/modules/fees-ops";
import AttendanceOps from "@/components/modules/attendance-ops";
import ExamsOps from "@/components/modules/exams-ops";
import CampusOps from "@/components/modules/campus-ops";
import ReportView from "@/components/modules/report-view";

const LIVE: Record<string, () => ReactNode> = {
  "/staff/dashboard": () => <DashboardPage />,
  "/staff/admin/dashboard": () => <DashboardPage />,
  "/staff/student/search": () => <StudentsPage />,
  "/staff/student/create": () => <CreateStudentPage />,
  "/staff/student/disablestudentslist": () => (
    <StudentsPage defaultStatus="DISABLED" />
  ),
  "/staff/student/generaterollnumber": () => <StudentsOps mode="rolls" />,
  "/staff/student/student-bulk-upload": () => <StudentsOps mode="import" />,
  "/staff/category": () => <StudentsOps mode="categories" />,
  "/staff/disable-reason": () => <StudentsOps mode="disableReasons" />,
  "/staff/studentfee": () => <CollectFeesPage />,
  "/staff/studentfee/feesearch": () => <FeesOps mode="due" />,
  "/staff/studentfee/feereceipt": () => <FeesOps mode="receipts" />,
  "/staff/feetype": () => <FeesOps mode="types" />,
  "/staff/feegroup": () => <FeesOps mode="groups" />,
  "/staff/feemaster": () => <FeesOps mode="masters" />,
  "/staff/feemastercoursewise": () => <FeesOps mode="assign" />,
  "/staff/feediscount": () => <FeesOps mode="discounts" />,
  "/staff/fine-rules": () => <FeesOps mode="fines" />,
  "/staff/stuattendence": () => <AttendancePage />,
  "/staff/stuattendence/attendencereport": () => <AttendancePage />,
  "/staff/approve-leave": () => <AttendanceOps mode="approve" />,
  "/staff/staffattendance": () => <AttendanceOps mode="staff" />,
  "/staff/leavetypes": () => <AttendanceOps mode="leaves" />,
  "/staff/leaverequest": () => <AttendanceOps mode="approve" />,
  "/staff/staff/leaverequest": () => <AttendanceOps mode="approve" />,
  "/staff/examgroup": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-single-subject": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-subjectwise": () => <ExamsPage />,
  "/staff/examresult": () => <ExamsOps mode="results" />,
  "/staff/examresult/exam-result-block-unblock": () => <ExamsOps mode="block" />,
  "/staff/examresult/marksheet": () => <ExamsOps mode="results" />,
  "/staff/grade": () => <ExamsOps mode="grades" />,
  "/staff/classes": () => <AcademicsHub tab="classes" />,
  "/staff/sections": () => <AcademicsHub tab="sections" />,
  "/staff/subject": () => <AcademicsHub tab="subjects" />,
  "/staff/sessions": () => <AcademicsHub tab="sessions" />,
  "/staff/department": () => <AcademicsHub tab="department" />,
  "/staff/course-master": () => <AcademicsHub tab="programs" />,
  "/staff/timetable/classreport": () => <AcademicsHub tab="timetable" />,
  "/staff/stdtransfer": () => <AcademicsHub tab="promotion" />,
  "/staff/holiday/set-working-days": () => <AcademicsHub tab="workingDays" />,
  "/staff/users": () => <UsersPage />,
  "/staff/roles": () => <RolesPage />,
  "/staff/staff": () => <CampusOps mode="staff" />,
  "/staff/designation": () => <CampusOps mode="designations" />,
  "/staff/notification": () => <CampusOps mode="notices" />,
  "/staff/schsettings": () => <CampusOps mode="settings" />,
  "/staff/print-headerfooter": () => <CampusOps mode="letterhead" />,
  "/staff/module": () => <CampusOps mode="modules" />,
  "/staff/report/studentinformation": () => <ReportView reportKey="students" />,
  "/staff/financereports/finance": () => <ReportView reportKey="daily-collection" />,
  "/staff/attendencereports/attendance": () => (
    <ReportView reportKey="attendance-percent" />
  ),
  "/staff/examresult/examinations": () => <ReportView reportKey="exam-results" />,
  "/staff/userlog": () => <ReportView reportKey="user-log" />,
  "/staff/userlog/payment-log": () => <ReportView reportKey="payment-log" />,
  "/staff/audit": () => <ReportView reportKey="audit" />,
  "/staff/report/human-resource": () => <ReportView reportKey="staff" />,
};

export function SpecialScreen({
  href,
  screen,
}: {
  href: string;
  screen: ScreenDef;
}) {
  const render = LIVE[href] ?? LIVE[screen.href];
  if (!render) return null;
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        {screen.module} · live
      </p>
      {render()}
    </div>
  );
}
