"use client";

import type { ReactNode } from "react";
import type { ScreenDef } from "@/lib/catalog/screens";
import AcademicsPage from "@/app/(staff)/staff/academics/page";
import AttendancePage from "@/app/(staff)/staff/attendance/page";
import DashboardPage from "@/app/(staff)/staff/dashboard/page";
import ExamsPage from "@/app/(staff)/staff/exams/page";
import CollectFeesPage from "@/app/(staff)/staff/fees/collect/page";
import CreateStudentPage from "@/app/(staff)/staff/students/create/page";
import StudentsPage from "@/app/(staff)/staff/students/page";

const LIVE: Record<string, () => ReactNode> = {
  "/staff/dashboard": () => <DashboardPage />,
  "/staff/admin/dashboard": () => <DashboardPage />,
  "/staff/student/search": () => <StudentsPage />,
  "/staff/student/create": () => <CreateStudentPage />,
  "/staff/student/disablestudentslist": () => <StudentsPage />,
  "/staff/studentfee": () => <CollectFeesPage />,
  "/staff/stuattendence": () => <AttendancePage />,
  "/staff/stuattendence/attendencereport": () => <AttendancePage />,
  "/staff/examgroup": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-single-subject": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-subjectwise": () => <ExamsPage />,
  "/staff/classes": () => <AcademicsPage />,
  "/staff/sections": () => <AcademicsPage />,
  "/staff/subject": () => <AcademicsPage />,
  "/staff/sessions": () => <AcademicsPage />,
  "/staff/department": () => <AcademicsPage />,
  "/staff/course-master": () => <AcademicsPage />,
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
