import React from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";
import { formatDate, parseLocalDate } from "./dashboardUtils.js";

export default function DashboardUpcomingEventsCard({ loading, available, metrics, onOpenModule }) {
  return (
    <section className="school-dashboard-panel">
      <header className="school-dashboard-panel-header"><div><span className="school-dashboard-panel-icon violet"><CalendarDays size={17}/></span><div><h3>{t("Upcoming Events")}</h3><p>{t("From the saved school calendar.")}</p></div></div><a href={getNavigationHref({ module: "Events" })} className="school-dashboard-header-link" onClick={event => handleNavigationClick(event, () => onOpenModule?.("Events"))}>{t("View calendar")}<ArrowUpRight size={13}/></a></header>
      {loading ? <div className="school-dashboard-empty">{t("Loading events…")}</div> : !available.events || !metrics.upcomingEvents.length ? <div className="school-dashboard-empty"><CalendarDays size={21}/><strong>{t(available.events ? "No upcoming events found." : "Events could not be loaded.")}</strong><span>{t("Create or review events in the Events module.")}</span></div> : <div className="school-dashboard-event-list">
        {metrics.upcomingEvents.slice(0, 4).map((event, index) => <a href={getNavigationHref({ module: "Events" })} key={event.id || event.description + "-" + index} className="school-dashboard-event" onClick={eventClick => handleNavigationClick(eventClick, () => onOpenModule?.("Events"))}><span className={"school-dashboard-event-date e" + (index % 4)}><strong>{(parseLocalDate(event.startDate) || new Date()).getDate()}</strong><small>{formatDate(event.startDate, { month: "short" })}</small></span><span className="school-dashboard-event-copy"><strong>{event.description}</strong><small>{t(String(event.eventType || "School Event"))} · {formatDate(event.startDate, { weekday: "short", day: "numeric", month: "short" })}{event.isHoliday ? " · " + t("Holiday") : ""}</small></span><ArrowUpRight size={14}/></a>)}
      </div>}
    </section>
  );
}
