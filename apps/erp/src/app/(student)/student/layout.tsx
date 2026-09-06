import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";

const LINKS = [
  { href: "/student/dashboard", label: "Home" },
  { href: "/student/profile", label: "Profile" },
  { href: "/student/fees", label: "Fees" },
  { href: "/student/attendance", label: "Attendance" },
  { href: "/student/timetable", label: "Timetable" },
  { href: "/student/notices", label: "Notices" },
  { href: "/student/exams", label: "Exams" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell title="Student desk" home="/student/dashboard" links={LINKS}>
      {children}
    </PortalShell>
  );
}
