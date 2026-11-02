import React from "react";
import { ArrowUpRight, CalendarDays, CircleDollarSign, ClipboardCheck, Users } from "lucide-react";
import { t } from "../../i18n.jsx";
import { money } from "./dashboardUtils.js";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";

export default function DashboardMetricCards({ metrics, available, onOpenModule, onOpenDuesTillDate }) {
  const openModule = onOpenModule || (() => {});
  return (
    <section className="school-dashboard-metrics" aria-label={t("School overview metrics")}>
      <a href={getNavigationHref({ view: "manage", module: "My Branch" })} className="school-dashboard-metric blue total-students" onClick={event => handleNavigationClick(event, () => openModule("Manage Students"))}><span className="school-dashboard-metric-icon"><Users size={20}/></span><span className="school-dashboard-metric-copy"><small>{t("Total Students")}</small><strong>{metrics.total}</strong><em>{t("Student records")}</em></span><ArrowUpRight size={16} className="school-dashboard-metric-arrow"/></a>
      <a href={getNavigationHref({ module: "Attendance" })} className="school-dashboard-metric green" onClick={event => handleNavigationClick(event, () => openModule("Attendance"))}><span className="school-dashboard-metric-icon"><ClipboardCheck size={20}/></span><span className="school-dashboard-metric-copy"><small>{t("Today's Attendance")}</small><strong>{available.attendance && metrics.attendance.length ? metrics.attendanceRate + "%" : "—"}</strong><em>{!available.attendance ? t("Attendance data unavailable") : metrics.attendance.length ? metrics.present + " " + t("present / late") + " · " + metrics.attendance.length + " " + t("records") : t("No attendance recorded today")}</em></span><ArrowUpRight size={16} className="school-dashboard-metric-arrow"/></a>
      <a href={getNavigationHref({ module: "Fees", dueThroughToday: true })} className="school-dashboard-metric rose" onClick={event => handleNavigationClick(event, () => onOpenDuesTillDate ? onOpenDuesTillDate() : openModule("Fees"))}><span className="school-dashboard-metric-icon"><CircleDollarSign size={20}/></span><span className="school-dashboard-metric-copy"><small>{t("Outstanding Fees")}</small><strong>{available.fees ? money(metrics.feeOutstanding) : "—"}</strong><span className="school-dashboard-metric-paid">{available.fees ? t("Paid fees") + ": " + money(metrics.feePaid) : ""}</span><em>{available.fees ? metrics.unpaidFeeRecords + " " + t("unpaid fee records") : t("Fee data unavailable")}</em></span><ArrowUpRight size={16} className="school-dashboard-metric-arrow"/></a>
      <a href={getNavigationHref({ module: "Events" })} className="school-dashboard-metric amber" onClick={event => handleNavigationClick(event, () => openModule("Events"))}><span className="school-dashboard-metric-icon"><CalendarDays size={20}/></span><span className="school-dashboard-metric-copy"><small>{t("Upcoming Events")}</small><strong>{available.events ? metrics.upcomingEvents.length : "—"}</strong><em>{t("In the preview list")}</em></span><ArrowUpRight size={16} className="school-dashboard-metric-arrow"/></a>
    </section>
  );
}
