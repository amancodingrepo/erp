import React from "react";
import { CalendarDays, CalendarRange, Check, ChevronRight, Columns2, ListChecks, LoaderCircle, PartyPopper, Plus } from "lucide-react";
import { t } from "../../i18n.jsx";
import { todayKey, dateLabel, eventIcon, eventCssType, parseDateKey, includesDate, WEEKDAYS, EVENT_TYPES, typePlural } from "./eventsUtils.js";

export default function EventsCalendarView({ context }) {
  const { loading, monthCells, events, focusDate, setFocusDate, viewMode, setViewMode, openNewEvent, setDetailEventId, includesDate, todayKey, dateLabel, WEEKDAYS, eventIcon, eventCssType, parseDateKey, EVENT_TYPES, typePlural, birthdaysForFocusedDay, eventsForFocusedDay, onNotify } = context;
  const renderCalendar = (compact = false) => (
        <div className={["events-calendar-card", compact ? "events-split-calendar-card" : ""].filter(Boolean).join(" ")}>
          <div className="events-calendar-summary">
            <span><i className="events-summary-dot school"/>{t("School events")}</span>
            <span><i className="events-summary-dot class"/>{t("Class events")}</span>
            <span><i className="events-summary-dot parent"/>{t("Parent events")}</span>
            <span><i className="events-summary-dot staff"/>{t("Staff events")}</span>
            <span><i className="events-summary-dot holiday"/>{t("Holidays")}</span>
          </div>
          <div className="events-weekdays">{WEEKDAYS.map(day => <div key={day}>{t(day)}</div>)}</div>
          <div className="events-month-grid">
            {monthCells.map(cell => {
              const dayEvents = events.filter(event => includesDate(event, cell.key)).sort((a, b) => a.eventType.localeCompare(b.eventType));
              const isToday = cell.key === todayKey();
              const isFocused = cell.key === focusDate;
              return (
                <div
                  key={cell.key}
                  className={["events-calendar-day", !cell.inMonth ? "outside-month" : "", isToday ? "today" : "", isFocused ? "focused" : ""].filter(Boolean).join(" ")}
                >
                  <div className="events-day-head">
                    <button type="button" className="events-day-number" onClick={() => { setFocusDate(cell.key); if (viewMode !== "split") setViewMode("day"); }} aria-label={t("Show events for") + " " + dateLabel(cell.key, { day: "numeric", month: "long", year: "numeric" })}>{cell.date.getDate()}</button>
                    <button type="button" className="events-day-add" onClick={() => openNewEvent(cell.key)} aria-label={t("Add event on") + " " + dateLabel(cell.key)} title={t("Add event on this date")}><Plus size={14}/></button>
                  </div>
                  <div className="events-day-items">
                    {dayEvents.slice(0, 3).map(event => {
                      const Icon = eventIcon(event.eventType);
                      return <button key={event.id} type="button" className={["events-calendar-chip", eventCssType(event.eventType), event.labelColor ? "label-color-" + event.labelColor : "", event.isHoliday ? "holiday-chip" : ""].filter(Boolean).join(" ")} onClick={() => setDetailEventId(event.id)} title={event.description}><Icon size={11}/><span>{event.isHoliday ? "★ " : ""}{event.description}</span></button>;
                    })}
                    {dayEvents.length > 3 && <button type="button" className="events-more-link" onClick={() => { setFocusDate(cell.key); if (viewMode !== "split") setViewMode("day"); }}>+{dayEvents.length - 3} {t("more")}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

  );
  const renderDayAgenda = (splitAgenda = false) => (
        <div className={["events-day-view", splitAgenda ? "events-split-agenda-card" : ""].filter(Boolean).join(" ")}>
          <div className="events-day-view-header">
            <div><span className="events-day-view-label">{t("Daily schedule")}</span><h3>{dateLabel(focusDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3></div>
            <label className="events-date-jump"><CalendarDays size={16}/><input aria-label={t("Choose date")} type="date" value={focusDate} onChange={e => setFocusDate(e.target.value || todayKey())}/></label>
          </div>
          <div className="events-category-list">
            <section className="events-day-category birthdays">
              <header><span className="events-category-symbol"><PartyPopper size={16}/></span><strong>{t("Birthdays")}</strong><span className="events-category-count">{birthdaysForFocusedDay.length}</span></header>
              {birthdaysForFocusedDay.length ? birthdaysForFocusedDay.map(person => <div className="events-day-item birthday-item" key={person.id}><div className="events-event-date-icon"><PartyPopper size={16}/></div><div className="events-day-item-copy"><strong>{person.name}</strong><span>{person.className || t("Student")} · {t("Birthday")}</span></div><button type="button" className="events-small-link" onClick={() => onNotify && onNotify(person.name + "'s birthday is on " + dateLabel(focusDate) + ".")}>{t("Details")}</button></div>) : <div className="events-category-empty">{t("No birthdays today.")}</div>}
            </section>
            {EVENT_TYPES.map(type => {
              const Icon = eventIcon(type);
              const typeEvents = eventsForFocusedDay.filter(event => event.eventType === type);
              const cat = eventCssType(type);
              return <section className={"events-day-category " + cat} key={type}>
                <header><span className="events-category-symbol"><Icon size={16}/></span><strong>{t(typePlural(type))}</strong><span className="events-category-count">{typeEvents.length}</span></header>
                {typeEvents.length ? typeEvents.map(event => <button type="button" className="events-day-item" key={event.id} onClick={() => setDetailEventId(event.id)}>
                  <div className="events-event-date-icon"><Icon size={16}/></div>
                  <div className="events-day-item-copy"><strong>{event.description}{event.isHoliday ? <span className="events-holiday-badge">{t("Holiday")}</span> : null}</strong><span>{dateLabel(event.startDate)}{event.endDate !== event.startDate ? " – " + dateLabel(event.endDate) : ""}</span>{event.eventType === "Class Event" && <small>{(event.classIds || []).join(", ")}</small>}{["Parent Event", "Staff Event"].includes(event.eventType) && <small>{(event.recipientIds || []).length} {t("selected recipients")}</small>}</div>
                  <span className="events-open-detail"><ChevronRight size={17}/></span>
                </button>) : <div className="events-category-empty">{t("No " + type.replace(" Event", "").toLowerCase() + " events today.")}</div>}
              </section>;
            })}
          </div>
        </div>
  );

  return (
    loading ? (
      <div className="events-loading"><LoaderCircle size={22} className="events-spin"/>{t("Loading calendar and saved events…")}</div>
    ) : viewMode === "split" ? (
      <div className="events-split-view">
        <div className="events-split-calendar-column">{renderCalendar(true)}</div>
        <div className="events-split-agenda-column">{renderDayAgenda(true)}</div>
      </div>
    ) : viewMode === "month" ? renderCalendar(false) : renderDayAgenda(false)
  );
}
