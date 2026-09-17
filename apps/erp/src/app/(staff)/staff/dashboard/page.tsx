"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isTeacherDesk } from "@/lib/catalog/nav-permissions";
import { SCREENS } from "@/lib/catalog/screens";
import type { AuthPrincipal } from "@/lib/permissions";

type Stats = {
  students: number;
  feeCollected: number;
  feeDue: number;
  attendanceToday: { present: number; marked: number; percent: number };
};

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((json) => setRoles((json.user as AuthPrincipal | undefined)?.roles ?? []))
      .catch(() => setRoles([]));
  }, []);

  const teacher = isTeacherDesk({
    id: "",
    campusId: "",
    actorType: "STAFF",
    roles,
    permissions: [],
  });

  const cards = teacher
    ? [
        { label: "Active students", value: stats ? String(stats.students) : "—" },
        {
          label: "Today's attendance",
          value: stats
            ? `${stats.attendanceToday.percent}% (${stats.attendanceToday.present}/${stats.attendanceToday.marked || 0})`
            : "—",
        },
      ]
    : [
        { label: "Active students", value: stats ? String(stats.students) : "—" },
        { label: "Fees collected", value: stats ? rupees(stats.feeCollected) : "—" },
        { label: "Fees still due", value: stats ? rupees(stats.feeDue) : "—" },
        {
          label: "Today's attendance",
          value: stats
            ? `${stats.attendanceToday.percent}% (${stats.attendanceToday.present}/${stats.attendanceToday.marked || 0})`
            : "—",
        },
      ];

  const modules = useMemo(() => {
    const map = new Map<string, { href: string; count: number }>();
    for (const s of SCREENS) {
      const cur = map.get(s.module);
      if (!cur) map.set(s.module, { href: s.href, count: 1 });
      else cur.count += 1;
    }
    return [...map.entries()];
  }, []);

  return (
    <div>
      <section className="em-banner p-7">
        <p className="text-[12.5px] font-medium opacity-90">
          {teacher ? "Teacher desk" : "Campus operations"}
        </p>
        <h1 className="mt-2 max-w-xl text-[26px] font-semibold leading-snug tracking-tight">
          {teacher ? "Your classes, attendance, and marks" : "Welcome back to the campus desk"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          {teacher
            ? "Office menus stay with admin. Use the shortcuts below."
            : `${SCREENS.length} staff screens. Ctrl+K jumps anywhere. Fee totals ignore cancelled receipts.`}
        </p>
        {teacher ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["/staff/stuattendence", "Attendance"],
              ["/staff/exam", "Marks"],
              ["/staff/timetable/mytimetable", "Timetable"],
              ["/staff/homework", "Homework"],
              ["/staff/student/search", "Find a student"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#1f2937]"
              >
                {label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="em-card flex min-h-[132px] flex-col p-4">
            <p className="text-[12.5px] text-[var(--muted)]">{card.label}</p>
            <p className="mt-auto text-[28px] font-extrabold tracking-tight">{card.value}</p>
          </article>
        ))}
      </div>
      {teacher ? null : (
        <>
          <h2 className="mt-8 text-lg font-bold">Modules</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(([name, meta]) => (
              <Link
                key={name}
                href={meta.href}
                className="em-card flex items-center justify-between px-4 py-3.5 text-sm hover:bg-[#fafafa]"
              >
                <span className="capitalize font-medium">{name.replaceAll("-", " ")}</span>
                <span className="rounded-full bg-[#e9f7ef] px-2 py-0.5 text-xs font-semibold text-[var(--green)]">
                  {meta.count}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
