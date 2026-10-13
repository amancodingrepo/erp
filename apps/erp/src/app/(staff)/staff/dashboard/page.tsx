"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BranchDesk from "@/components/modules/branch-desk";
import { isTeacherDesk } from "@/lib/catalog/nav-permissions";
import { useI18n } from "@/lib/i18n/provider";
import type { AuthPrincipal } from "@/lib/permissions";

type Stats = {
  students: number;
  feeCollected: number;
  feeDue: number;
  attendanceToday: {
    present: number;
    marked: number;
    percent: number;
    notTaken?: number;
  };
};

type Me = {
  user: AuthPrincipal;
  campus: { name: string; session: { name: string } | null };
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json?.user) setMe(json as Me);
      })
      .catch(() => setMe(null));
  }, []);

  const teacher = isTeacherDesk(me?.user);

  if (!teacher) {
    return (
      <BranchDesk
        campusName={me?.campus.name}
        sessionName={me?.campus.session?.name ?? undefined}
        stats={stats}
      />
    );
  }

  return (
    <div>
      <section className="em-banner p-7">
        <p className="text-[12.5px] font-medium opacity-90">{t("Teacher desk")}</p>
        <h1 className="mt-2 max-w-xl text-[26px] font-semibold leading-snug tracking-tight">
          {t("Your classes, attendance, and marks")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          {t("Office menus stay with admin. Use the shortcuts below.")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["/staff/stuattendence", "Attendance"],
            ["/staff/exam", "Marks"],
            ["/staff/timetable/mytimetable", "Timetable"],
            ["/staff/homework", "Homework"],
            ["/staff/messages", "Requests"],
            ["/staff/student/search", "Find a student"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#1f2937]"
            >
              {t(label)}
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <article className="em-card flex min-h-[132px] flex-col p-4">
          <p className="text-[12.5px] text-[var(--muted)]">{t("Active students")}</p>
          <p className="mt-auto text-[28px] font-extrabold tracking-tight">
            {stats ? String(stats.students) : "—"}
          </p>
        </article>
        <article className="em-card flex min-h-[132px] flex-col p-4">
          <p className="text-[12.5px] text-[var(--muted)]">{t("Today's attendance")}</p>
          <p className="mt-auto text-[28px] font-extrabold tracking-tight">
            {stats
              ? `${stats.attendanceToday.percent}% (${stats.attendanceToday.present}/${stats.attendanceToday.marked || 0}${
                  stats.attendanceToday.notTaken
                    ? `, ${stats.attendanceToday.notTaken} not taken`
                    : ""
                })`
              : "—"}
          </p>
        </article>
      </div>
    </div>
  );
}
