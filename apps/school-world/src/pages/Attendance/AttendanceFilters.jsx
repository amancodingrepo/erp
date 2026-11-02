import React from "react";
import { Filter, Check } from "lucide-react";

export default function AttendanceFilters({
  t, activeTab, classFilter, setClassFilter, availableClasses,
  staffFilterMode, setStaffFilterMode, staffFilterValue, setStaffFilterValue, staffFilterOptions
}) {
  return (
    <>
      {activeTab === "class" && (
        <div className="attendance-filter-panel attendance-class-filter-panel">
          <div className="attendance-filter-label"><Filter size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />{t("Filter by class")}</div>
          <div className="attendance-class-chips">
            <button type="button" className={"attendance-class-chip" + (classFilter === "All Classes" ? " is-active" : "")} onClick={() => setClassFilter("All Classes")}>
              <Check size={13} /> <span>{t("All Classes")}</span>
            </button>
            {availableClasses.map(className => (
              <button key={className} type="button" className={"attendance-class-chip" + (classFilter === className ? " is-active" : "")} onClick={() => setClassFilter(className)}>
                {classFilter === className ? <Check size={13} /> : null}<span>{className}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "staff" && (
        <div className="attendance-filter-panel">
          <div className="attendance-filter-line">
            <div className="attendance-filter-controls">
              <label className="attendance-filter-field">
                {t("Attendance Based On")}
                <select className="attendance-filter-select" value={staffFilterMode} onChange={event => { setStaffFilterMode(event.target.value); setStaffFilterValue("All"); }}>
                  <option value="Role">{t("Role")}</option>
                  <option value="Staff Category">{t("Staff Category")}</option>
                </select>
              </label>
              <label className="attendance-filter-field">
                {t(staffFilterMode)}
                <select className="attendance-filter-select" value={staffFilterValue} onChange={event => setStaffFilterValue(event.target.value)}>
                  <option value="All">{t("All")}</option>
                  {staffFilterOptions.map(option => <option value={option} key={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <p className="attendance-save-help">{t("Options are populated from existing staff contact data.")}</p>
          </div>
        </div>
      )}
    </>
  );
}
