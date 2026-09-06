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
  "/staff/stuattendence": () => <AttendancePage />,
  "/staff/stuattendence/attendencereport": () => <AttendancePage />,
  "/staff/examgroup": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-single-subject": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-subjectwise": () => <ExamsPage />,
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
