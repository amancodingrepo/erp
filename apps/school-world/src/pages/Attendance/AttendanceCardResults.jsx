import React from "react";
import { X } from "lucide-react";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";
import { formatDate, getName, getMetadataLabel } from "./attendanceUtils.js";

export default function AttendanceCardResults({
  selectedSummaryCard, selectedSummaryPeople, activeTab, attendanceState,
  staffFilterMode, t, attendanceDate, onOpenStudent
}) {
  return (
    <>
      {selectedSummaryCard && (
        <section className="attendance-card-results" aria-live="polite">
          <div className="attendance-card-results-header">
            <div>
              <h3>{t(selectedSummaryCard === "Excused" ? "Leave" : selectedSummaryCard === "Unmarked" ? "Not marked" : selectedSummaryCard)} {t("list")}</h3>
              <p>{formatDate(attendanceDate)} · {selectedSummaryPeople.length} {t("records")}</p>
            </div>
            <button
              type="button"
              className="attendance-card-results-close"
              aria-label={t("Close attendance results")}
              title={t("Close")}
              onClick={() => setSelectedSummaryCard(null)}
            ><X size={16} /></button>
          </div>
          {selectedSummaryPeople.length ? (
            <div className="attendance-card-results-table-wrap">
              <table className="attendance-card-results-table">
                <thead>
                  {activeTab === "class" ? (
                    <tr><th>{t("Class")}</th><th>{t("Scholar Number")}</th><th>{t("Roll Number")}</th><th>{t("Student")}</th><th>{t("Attendance")}</th></tr>
                  ) : (
                    <tr><th>{t("Name")}</th><th>{t("Role / Category")}</th><th>{t("Attendance")}</th></tr>
                  )}
                </thead>
                <tbody>
                  {selectedSummaryPeople.map(person => {
                    const personId = String(person.id);
                    const status = attendanceState[personId] || "";
                    const statusLabel = status === "Excused" ? "Leave" : status || "Not marked";
                    return (
                      <tr key={personId}>
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
                                aria-label={t("Open student record for ") + (person.name || getName(person))}
                              >{person.name || getName(person)}</a>
                              <span className="attendance-person-meta">{person.enrollmentNumber || person.academicYear || ""}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td><span className="attendance-person-name">{getName(person)}</span><span className="attendance-person-meta">{person.externalId || person.email || ""}</span></td>
                            <td>{getMetadataLabel(person, activeTab === "staff" && staffFilterMode === "Staff Category" ? "Staff Category" : "Role")}</td>
                          </>
                        )}
                        <td><span className={"attendance-result-status" + (status ? " status-" + status : " status-Unmarked")}>{t(statusLabel)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="attendance-card-results-empty">{t("No records match this status for the selected date and filters.")}</p>
          )}
        </section>
      )}
    </>
  );
}
