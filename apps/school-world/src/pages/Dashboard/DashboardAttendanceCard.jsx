import React from "react";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";
import { formatDate } from "./dashboardUtils.js";

export default function DashboardAttendanceCard({ loading, available, metrics, today, onOpenModule }) {
  return (
    <section className="school-dashboard-panel">
      <header className="school-dashboard-panel-header"><div><span className="school-dashboard-panel-icon teal"><ClipboardCheck size={17}/></span><div><h3>{t("Today's Attendance")}</h3><p>{formatDate(today, { weekday: "long", day: "numeric", month: "short" })}</p></div></div><a href={getNavigationHref({ module: "Attendance" })} className="school-dashboard-header-link" onClick={event => handleNavigationClick(event, () => onOpenModule?.("Attendance"))}>{t("Open attendance")}<ArrowUpRight size={13}/></a></header>
      {loading ? <div className="school-dashboard-empty">{t("Loading attendance…")}</div> : !available.attendance || !metrics.attendance.length ? <div className="school-dashboard-empty"><ClipboardCheck size={21}/><strong>{t(available.attendance ? "No attendance entries returned for today." : "Attendance is unavailable.")}</strong><span>{t("Open the Attendance module to review the source records.")}</span></div> : <div className="school-dashboard-attendance"><div className="school-dashboard-attendance-rate"><strong>{metrics.attendanceRate}%</strong><span>{t("Present / Late")}</span><div><i style={{width: metrics.attendanceRate + "%"}}/></div></div><div className="school-dashboard-attendance-split"><span><i className="present-dot"/><small>{t("Present / Late")}</small><strong>{metrics.present}</strong></span><span><i className="absent-dot"/><small>{t("Absent")}</small><strong>{metrics.absent}</strong></span><span><i className="recorded-dot"/><small>{t("Recorded")}</small><strong>{metrics.attendance.length}</strong></span></div></div>}
    </section>
  );
}
