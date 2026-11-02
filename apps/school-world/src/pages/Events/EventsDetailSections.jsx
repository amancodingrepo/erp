import React from "react";
import { CalendarCheck2, CalendarDays, ChevronRight, Clock3, ListChecks, LoaderCircle, PartyPopper, TrendingUp } from "lucide-react";
import { t } from "../../i18n.jsx";
import { dateLabel, parseDateKey, eventCssType, eventIcon, normalizeDate, classLabel } from "./eventsUtils.js";

export default function EventsDetailSections({ context }) {
  const { loading, events, sortedEvents, setDetailEventId, recentActivity, eventIcon, normalizeDate, upcomingCount, allUpcomingEvents, openNewEvent, today, categoryTotal, categoryStats, upcomingHolidays, holidayEvents, birthdaysThisMonth, birthdaysForMonth, classLabel } = context;
  return (
    <div className="events-detail-grid" aria-label={t("Event details")}>
        <section className="events-command-card events-detail-card events-all-detail" id="events-detail-all" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><CalendarDays size={16}/></span><h3>{t("All Events")}</h3></div><span className="events-command-count">{events.length}</span></header>
          {loading ? <div className="events-command-empty"><LoaderCircle size={20} className="events-spin"/><strong>{t("Loading saved events…")}</strong></div> :
            sortedEvents.length ? <div className="events-command-upcoming-list events-detail-event-grid">
              {sortedEvents.map(event => <button type="button" className="events-command-upcoming-item" key={event.id} onClick={() => setDetailEventId(event.id)}>
                <span className={"events-upcoming-date " + eventCssType(event.eventType)}><strong>{(parseDateKey(event.startDate) || new Date()).getDate()}</strong><small>{dateLabel(event.startDate, {month:"short"}).replace(".", "")}</small></span>
                <span className="events-upcoming-copy"><strong>{event.description}</strong><span><i className={"events-upcoming-dot " + eventCssType(event.eventType)}/>{t(event.eventType)}{event.isHoliday ? " · " + t("Holiday") : ""}</span><small>{dateLabel(event.startDate, {weekday:"short",day:"numeric",month:"short",year:"numeric"})}{event.endDate !== event.startDate ? " – " + dateLabel(event.endDate) : ""}</small></span>
                <ChevronRight size={15} className="events-upcoming-arrow"/>
              </button>)}
            </div> : <div className="events-command-empty"><CalendarCheck2 size={21}/><strong>{t("No events saved yet")}</strong><span>{t("Use Add New Event above to create your first event.")}</span></div>}
        </section>

        <section className="events-command-card events-detail-card events-activity-card" id="events-detail-activity" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><ListChecks size={16}/></span><h3>{t("Activity")}</h3></div><span className="events-command-eyebrow">{t("LATEST")}</span></header>
          {loading ? <div className="events-command-empty"><LoaderCircle size={20} className="events-spin"/>{t("Loading activity…")}</div> : recentActivity.length ? <div className="events-activity-list">
            {recentActivity.map(event => {
              const Icon = eventIcon(event.eventType);
              return <button type="button" className="events-activity-item" key={event.id} onClick={() => setDetailEventId(event.id)}>
                <span className={"events-activity-icon " + eventCssType(event.eventType)}><Icon size={15}/></span>
                <span><strong>{event.description}</strong><small>{t(event.eventType)} · {dateLabel(normalizeDate(event.updatedAt || event.createdAt, event.startDate))}</small></span>
                <ChevronRight size={14}/>
              </button>;
            })}
          </div> : <div className="events-activity-empty">{t("Newly created or updated events will appear here.")}</div>}
        </section>

        <section className="events-command-card events-detail-card events-upcoming-card" id="events-detail-upcoming" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><Clock3 size={16}/></span><h3>{t("Upcoming Events")}</h3></div><span className="events-command-count">{upcomingCount}</span></header>
          {loading ? <div className="events-command-empty"><LoaderCircle size={20} className="events-spin"/>{t("Loading upcoming events…")}</div> :
            allUpcomingEvents.length ? <div className="events-command-upcoming-list">
              {allUpcomingEvents.map(event => <button type="button" className="events-command-upcoming-item" key={event.id} onClick={() => setDetailEventId(event.id)}>
                <span className={"events-upcoming-date " + eventCssType(event.eventType)}><strong>{(parseDateKey(event.startDate) || new Date()).getDate()}</strong><small>{dateLabel(event.startDate, {month:"short"}).replace(".", "")}</small></span>
                <span className="events-upcoming-copy"><strong>{event.description}</strong><span><i className={"events-upcoming-dot " + eventCssType(event.eventType)}/>{t(event.eventType)}{event.isHoliday ? " · " + t("Holiday") : ""}</span><small>{dateLabel(event.startDate, {weekday:"short",day:"numeric",month:"short",year:"numeric"})}{event.endDate !== event.startDate ? " – " + dateLabel(event.endDate) : ""}</small></span>
                <ChevronRight size={15} className="events-upcoming-arrow"/>
              </button>)}
            </div> : <div className="events-command-empty"><CalendarCheck2 size={21}/><strong>{t("Nothing upcoming yet")}</strong><span>{t("Create an event to populate your schedule.")}</span><button type="button" onClick={() => openNewEvent(today)}>{t("Add your first event")}</button></div>}
        </section>

        <section className="events-command-card events-detail-card events-breakdown-card" id="events-detail-breakdown" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><TrendingUp size={16}/></span><h3>{t("Event Breakdown")}</h3></div><span className="events-command-count">{categoryTotal}</span></header>
          <div className="events-breakdown-list">
            {categoryStats.map(item => {
              const Icon = eventIcon(item.type);
              const pct = categoryTotal ? Math.round(item.count / categoryTotal * 100) : 0;
              return <div className={"events-breakdown-item " + item.colorClass} key={item.type}>
                <div className="events-breakdown-label"><span><Icon size={14}/>{t(item.type)}</span><strong>{item.count}</strong></div>
                <div className="events-breakdown-track"><span style={{width: pct + "%"}}/></div>
              </div>;
            })}
          </div>
          <div className="events-breakdown-foot"><span>{t("School holidays included in event records")}</span><strong>{upcomingHolidays}</strong></div>
        </section>

        <section className="events-command-card events-detail-card" id="events-detail-holidays" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><PartyPopper size={16}/></span><h3>{t("School Holidays")}</h3></div><span className="events-command-count">{upcomingHolidays}</span></header>
          {loading ? <div className="events-command-empty"><LoaderCircle size={20} className="events-spin"/>{t("Loading school holidays…")}</div> :
            holidayEvents.length ? <div className="events-command-upcoming-list">
              {holidayEvents.map(event => <button type="button" className="events-command-upcoming-item" key={event.id} onClick={() => setDetailEventId(event.id)}>
                <span className="events-upcoming-date holiday"><strong>{(parseDateKey(event.startDate) || new Date()).getDate()}</strong><small>{dateLabel(event.startDate, {month:"short"}).replace(".", "")}</small></span>
                <span className="events-upcoming-copy"><strong>{event.description}</strong><span><i className="events-upcoming-dot holiday-dot"/>{t("School Holiday")}</span><small>{dateLabel(event.startDate, {weekday:"short",day:"numeric",month:"short",year:"numeric"})}{event.endDate !== event.startDate ? " – " + dateLabel(event.endDate) : ""}</small></span>
                <ChevronRight size={15} className="events-upcoming-arrow"/>
              </button>)}
            </div> : <div className="events-command-empty"><PartyPopper size={21}/><strong>{t("No upcoming school holidays")}</strong><span>{t("Events marked as holidays will appear here.")}</span></div>}
        </section>

        <section className="events-command-card events-detail-card" id="events-detail-birthdays" tabIndex="-1">
          <header><div><span className="events-command-section-icon"><PartyPopper size={16}/></span><h3>{t("Birthdays This Month")}</h3></div><span className="events-command-count">{birthdaysThisMonth}</span></header>
          {birthdaysForMonth.length ? <div className="events-command-upcoming-list">
            {birthdaysForMonth.map(({ student, dob }, index) => {
              const name = String(student.name || student.fullName || "Student");
              return <div className="events-command-upcoming-item events-birthday-item" key={student.id || student.studentId || name + "-" + index}>
                <span className="events-upcoming-date birthdays"><strong>{dob.getDate()}</strong><small>{dateLabel(dob, {month:"short"}).replace(".", "")}</small></span>
                <span className="events-upcoming-copy"><strong>{name}</strong><span><i className="events-upcoming-dot birthday-dot"/>{classLabel(student) || t("Student")}</span><small>{t("Birthday")} · {dateLabel(dob, {weekday:"short",day:"numeric",month:"short"})}</small></span>
              </div>;
            })}
          </div> : <div className="events-command-empty"><PartyPopper size={21}/><strong>{t("No birthdays this month")}</strong><span>{t("Student birthdays are calculated from saved date-of-birth fields.")}</span></div>}
        </section>

      </div>
  );
}
