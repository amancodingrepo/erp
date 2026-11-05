import React from "react";
import { GraduationCap, RefreshCw } from "lucide-react";
import { t } from "../../i18n.jsx";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { ROLE_LABELS, displayName } from "../../components/topbar/topbarNavigation.js";
import { formatDate, greeting } from "./dashboardUtils.js";

/** "Good morning, Priya": the signed-in person's first name, else their full name, else their role. */
export function greetingName(user, userRole) {
  const first = String(user?.firstName || "").trim();
  if (first) return first;
  const name = displayName(user);
  if (name && !name.includes("@")) return name;
  return ROLE_LABELS[user?.role || userRole] || "Staff";
}

export default function DashboardHero({ schoolName, userRole, today, refreshing, onRefresh }) {
  const user = useDatabaseSession().user;
  const name = greetingName(user, userRole);
  const role = ROLE_LABELS[user?.role || userRole];
  return (
    <section className="school-dashboard-hero">
      <div className="school-dashboard-hero-copy">
        <span className="school-dashboard-eyebrow"><GraduationCap size={15}/>{t("SCHOOL WORKSPACE")}</span>
        <h2>{t(greeting())}, {name === role ? t(name) : name}</h2>
        <p>{role && name !== role ? <>{t(role)} · </> : null}{t("Here's the latest overview of")} <strong>{schoolName}</strong>. {formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <button type="button" className="school-dashboard-refresh" onClick={onRefresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "school-dashboard-spin" : ""}/>{t(refreshing ? "Refreshing…" : "Refresh data")}</button>
      <div className="school-dashboard-hero-mark"><GraduationCap size={78}/></div>
    </section>
  );
}
