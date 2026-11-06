import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS, dateKey, formatDate } from "./attendanceUtils.js";
import { schoolToday } from "../../school-locale.js";

export default function AttendanceCalendar({
  t, currentMonthLabel, changeMonth, chooseDate, viewMode, setViewMode,
  attendanceDate, cells, summaryForDate
}) {
  return (
      <section className="attendance-calendar-panel">
        <div className="attendance-section-header">
          <div>
            <h3>{currentMonthLabel}</h3>
            <p>{t("Select a date to open its attendance register.")}</p>
          </div>
          <div className="attendance-date-actions">
            <button type="button" className="attendance-action-button is-prev" title={t("Previous month")} onClick={() => changeMonth(-1)}><ChevronLeft size={15}/><span>{t("Prev")}</span></button>
            <button type="button" className="attendance-action-button is-today" onClick={() => chooseDate(schoolToday())}>{t("Today")}</button>
            <button type="button" className="attendance-action-button is-next" title={t("Next month")} onClick={() => changeMonth(1)}><span>{t("Next")}</span><ChevronRight size={15}/></button>
            <div className="attendance-view-toggle" aria-label={t("Calendar view")}>
              <button type="button" className={"attendance-view-choice month" + (viewMode === "month" ? " is-active" : "")} aria-pressed={viewMode === "month"} onClick={() => setViewMode("month")}>{t("Month")}</button>
              <button type="button" className={"attendance-view-choice day" + (viewMode === "day" ? " is-active" : "")} aria-pressed={viewMode === "day"} onClick={() => setViewMode("day")}>{t("Day")}</button>
            </div>
          </div>
        </div>
        {viewMode === "month" && (
          <div className="attendance-calendar-wrap">
            <div className="attendance-calendar-summary" aria-label={t("Attendance status legend")}>
              <span><i className="attendance-summary-dot present" />{t("Present")}</span>
              <span><i className="attendance-summary-dot absent" />{t("Absent")}</span>
              <span><i className="attendance-summary-dot other" />{t("Late / Leave")}</span>
              <span><i className="attendance-summary-dot total" />{t("Total marked")}</span>
            </div>
            <div className="attendance-calendar-grid">
              {WEEKDAYS.map(day => <div className="attendance-weekday" key={day}>{t(day)}</div>)}
              {cells.map(cell => {
                const summary = summaryForDate(cell.key);
                const today = cell.key === schoolToday();
                const selected = cell.key === attendanceDate;
                return (
                  <button type="button" key={cell.key} className={"attendance-day-cell" + (!cell.inMonth ? " is-outside" : "") + (selected ? " is-selected" : "") + (today ? " is-today" : "")}
                    onClick={() => chooseDate(cell.key)} aria-label={formatDate(cell.key) + (summary && summary.marked > 0 ? ", " + summary.present + " present, " + summary.absent + " absent, " + summary.marked + " total marked" : "")}>
                    <span className="attendance-day-topline">
                      <span className="attendance-day-number">{cell.date.getDate()}</span>
                      {summary && summary.marked > 0 && (
                        <span className="attendance-total-badge" aria-label={t("Total marked") + ": " + summary.marked}>{summary.marked}</span>
                      )}
                    </span>
                    {summary && summary.marked > 0 ? (
                      <span className="attendance-day-counts">
                        <span className="attendance-count-pill present">P {summary.present}</span>
                        <span className="attendance-count-pill absent">A {summary.absent}</span>
                        {(summary.late > 0 || summary.excused > 0) && <span className="attendance-count-pill other">+ {summary.late + summary.excused}</span>}
                      </span>
                    ) : <span className="attendance-day-empty" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
  );
}
