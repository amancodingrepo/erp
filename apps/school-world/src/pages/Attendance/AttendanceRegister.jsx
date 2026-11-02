import React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { ATTENDANCE_STATUSES, dateKey, formatDate, moveDay, getName, getMetadataLabel } from "./attendanceUtils.js";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";

export default function AttendanceRegister({
  viewMode, activeTab, attendanceDate, tabLabel, t, chooseDate,
  attendanceState, activeRoster, loading, loadError, search, setSearch,
  setVisibleRowsStatus, changeStatus, saveAttendance, saving, keySelector,
  staffFilterMode, onOpenStudent
}) {
  return (
    <>
      {viewMode === "day" && (
      <section className="attendance-register-panel">
        <div className="attendance-section-header">
          <div>
            <h3>{t("Daily Attendance Register")}</h3>
            <p>{formatDate(attendanceDate)} · {tabLabel}</p>
          </div>
          <div className="attendance-date-actions">
            <button type="button" className="attendance-action-button is-prev" onClick={() => chooseDate(moveDay(attendanceDate, -1))}><ChevronLeft size={14}/>{t("Previous date")}</button>
            <button type="button" className="attendance-action-button is-today" onClick={() => chooseDate(dateKey(new Date()))}>{t("Today")}</button>
            <button type="button" className="attendance-action-button is-next" onClick={() => chooseDate(moveDay(attendanceDate, 1))}>{t("Next date")}<ChevronRight size={14}/></button>
          </div>
        </div>

        <div className="attendance-roster-heading">
          <div>
            <h4>{activeTab === "class" ? t("Student list") : activeTab === "teacher" ? t("Teacher list") : t("Staff list")}</h4>
            <p>{t("Choose a status for each person, then save the marked records.")}</p>
          </div>
          <div className="attendance-section-actions">
            <label className="attendance-search">
              <input aria-label={t("Search attendance list")} type="search" placeholder={t("Search by name, ID or class")} value={search} onChange={event => setSearch(event.target.value)}/>
            </label>
            <button type="button" className="attendance-action-button" onClick={() => setVisibleRowsStatus("Present")} disabled={!activeRoster.length}><CheckCircle2 size={15}/>{t("Mark all Present")}</button>
            <button type="button" className="attendance-action-button" onClick={() => setVisibleRowsStatus("Absent")} disabled={!activeRoster.length}><X size={15}/>{t("Mark all Absent")}</button>
          </div>
        </div>

        {loadError && <p className="attendance-inline-error">{loadError}</p>}
        {loading ? <div className="attendance-loading">{t("Loading attendance records…")}</div> : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                {activeTab === "class" ? (
                  <tr><th>{t("Class")}</th><th>{t("Scholar Number")}</th><th>{t("Roll Number")}</th><th>{t("Student")}</th><th>{t("Attendance")}</th></tr>
                ) : (
                  <tr><th>{t("Name")}</th><th>{t("Role / Category")}</th><th>{t("Attendance")}</th><th>{t("Time")}</th></tr>
                )}
              </thead>
              <tbody>
                {!activeRoster.length ? (
                  <tr><td className="attendance-row-empty" colSpan={activeTab === "class" ? 5 : 4}>
                    <strong>{activeTab === "class" ? t("No active students found") : activeTab === "teacher" ? t("No teachers found") : t("No staff found")}</strong>
                    {activeTab === "class" ? t("Try another academic year or class filter.") : t("Add people in Contacts before marking attendance.")}
                  </td></tr>
                ) : activeRoster.map(person => {
                  const id = keySelector(person);
                  const status = attendanceState[id] || "";
                  const name = activeTab === "class" ? person.name : getName(person);
                  return (
                    <tr key={id}>
                      {activeTab === "class" ? (
                        <>
                          <td>{person.className || "—"}{person.section ? <span className="attendance-person-meta">{t("Section")} {person.section}</span> : null}</td>
                          <td>{person.studentId || person.id || "—"}</td>
                          <td>{person.rollNumber || "—"}</td>
                          <td>
                            <a
                              className="attendance-student-link"
                              href={getNavigationHref({ view: "edit", studentId: person.id, parent: "Attendance" })}
                              onClick={event => handleNavigationClick(event, () => onOpenStudent(person, "Student Details"))}
                              aria-label={t("Open student record for ") + name}
                            >{name}</a>
                            <span className="attendance-person-meta">{person.enrollmentNumber || person.academicYear || ""}</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="attendance-person-name">{name}</span><span className="attendance-person-meta">{person.externalId || person.email || ""}</span></td>
                          <td>{getMetadataLabel(person, staffFilterMode === "Staff Category" && activeTab === "staff" ? "Staff Category" : "Role")}</td>
                          <td>
                            <select aria-label={t("Attendance for ") + name} className={"attendance-status-select" + (status ? " status-" + status : "")} value={status}
                              onChange={event => changeStatus(person, event.target.value)}>
                              <option value="" disabled>{t("Not marked")}</option>
                              {ATTENDANCE_STATUSES.map(value => <option key={value} value={value}>{t(value === "Excused" ? "Leave" : value)}</option>)}
                            </select>
                          </td>
                          <td><Clock3 size={13} style={{ marginRight: 5, color: "#91a0b1", verticalAlign: "middle" }}/><span className="attendance-person-meta" style={{ display: "inline" }}>{t("N/A")}</span></td>
                        </>
                      )}
                      {activeTab === "class" && (
                        <td>
                          <select aria-label={t("Attendance for ") + name} className={"attendance-status-select" + (status ? " status-" + status : "")} value={status}
                            onChange={event => changeStatus(person, event.target.value)}>
                            <option value="" disabled>{t("Not marked")}</option>
                            {ATTENDANCE_STATUSES.map(value => <option key={value} value={value}>{t(value === "Excused" ? "Leave" : value)}</option>)}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="attendance-save-bar">
          <span className="attendance-save-help">{t("Only rows with a selected attendance status will be saved.")}</span>
          <button type="button" className="attendance-action-button is-primary" onClick={saveAttendance} disabled={saving || loading || !activeRoster.length}>
            <CheckCircle2 size={16}/>{saving ? t("Saving…") : t("Save Attendance")}
          </button>
        </div>
      </section>
      )}
    </>
  );
}
