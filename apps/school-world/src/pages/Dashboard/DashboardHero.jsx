import React from "react";
import { GraduationCap, RefreshCw } from "lucide-react";
import { t } from "../../i18n.jsx";
import { formatDate, greeting } from "./dashboardUtils.js";

export default function DashboardHero({ schoolName, userRole, today, refreshing, onRefresh }) {
  return (
    <section className="school-dashboard-hero">
      <div className="school-dashboard-hero-copy">
        <span className="school-dashboard-eyebrow"><GraduationCap size={15}/>{t("SCHOOL WORKSPACE")}</span>
        <h2>{t(greeting())}, {userRole === "school_admin" ? t("School Admin") : userRole === "principal" ? t("Principal") : t("School Team")}</h2>
        <p>{t("Here's the latest overview of")} <strong>{schoolName}</strong>. {formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <button type="button" className="school-dashboard-refresh" onClick={onRefresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "school-dashboard-spin" : ""}/>{t(refreshing ? "Refreshing…" : "Refresh data")}</button>
      <div className="school-dashboard-hero-mark"><GraduationCap size={78}/></div>
    </section>
  );
}
