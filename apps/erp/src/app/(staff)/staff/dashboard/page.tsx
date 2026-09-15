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
      <h1 className="font-display text-4xl">
        {teacher ? "Teacher home" : "Campus ledger"}
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        {teacher
          ? "Attendance, marks, timetable, and homework for your classes. Office menus stay with admin."
          : `${SCREENS.length} staff screens. Ctrl+K jumps anywhere. Fee totals ignore cancelled receipts.`}
      </p>
      {teacher ? (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/staff/stuattendence">
            Attendance
          </Link>
          <Link className="underline" href="/staff/exam">
            Marks
          </Link>
          <Link className="underline" href="/staff/timetable/mytimetable">
            My timetable
          </Link>
          <Link className="underline" href="/staff/homework">
            Homework
          </Link>
          <Link className="underline" href="/staff/student/search">
            Find a student
          </Link>
        </div>
      ) : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="border border-[var(--rule)] bg-[var(--paper-2)] p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
              {card.label}
            </p>
            <p className="font-display mt-3 text-3xl">{card.value}</p>
          </article>
        ))}
      </div>
      {teacher ? null : (
        <>
          <h2 className="font-display mt-10 text-2xl">Modules</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(([name, meta]) => (
              <Link
                key={name}
                href={meta.href}
                className="flex items-center justify-between border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 text-sm hover:border-[var(--brass)]"
              >
                <span className="capitalize">{name.replaceAll("-", " ")}</span>
                <span className="text-[var(--muted)]">{meta.count}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
