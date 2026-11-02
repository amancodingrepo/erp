"use client";

import Link from "next/link";
import { MY_BRANCH_COLUMNS } from "@/lib/catalog/branch-admin-nav";
import { useI18n } from "@/lib/i18n/provider";

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

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BranchDesk({
  campusName,
  sessionName,
  stats,
}: {
  campusName?: string;
  sessionName?: string;
  stats: Stats | null;
}) {
  const { t } = useI18n();
  const cards = [
    { label: "Active students", value: stats ? String(stats.students) : "—" },
    { label: "Fees collected", value: stats ? rupees(stats.feeCollected) : "—" },
    { label: "Fees still due", value: stats ? rupees(stats.feeDue) : "—" },
    {
      label: "Today's attendance",
      value: stats?.attendanceToday
        ? `${stats.attendanceToday.percent}% (${stats.attendanceToday.present}/${stats.attendanceToday.marked || 0}${
            stats.attendanceToday.notTaken
              ? `, ${stats.attendanceToday.notTaken} not taken`
              : ""
          })`
        : "—",
    },
  ];

  return (
    <div>
      <section className="em-banner p-7">
        <p className="text-[12.5px] font-medium opacity-90">{t("My Branch")}</p>
        <h1 className="mt-2 max-w-2xl text-[26px] font-semibold leading-snug tracking-tight">
          {campusName || t("Campus")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          {sessionName ? `${t("Academic year")}: ${sessionName}. ` : null}
          {t("Users, academics, and office links in the same three columns as School Diary.")}
        </p>
      </section>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="em-card flex min-h-[112px] flex-col p-4">
            <p className="text-[12.5px] text-[var(--muted)]">{t(card.label)}</p>
            <p className="mt-auto text-[28px] font-extrabold tracking-tight">{card.value}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {MY_BRANCH_COLUMNS.map((column) => (
          <section key={column.title} className="em-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
              {t(column.title)}
            </h2>
            <ul className="mt-3 space-y-1">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-2 py-1.5 text-sm text-[#222] hover:bg-[#f7f7f8]"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
