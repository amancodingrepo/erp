import React from "react";
import { ClipboardCheck, GraduationCap, UserCheck, Users } from "lucide-react";

export default function AttendanceHeader({ t, academicYear, setAcademicYear, yearOptions, activeTab, chooseTab }) {
  return (
    <>
      <div className="attendance-toolbar">
        <div>
          <div className="attendance-eyebrow"><ClipboardCheck size={15} /> {t("Attendance management")}</div>
          <h2>{t("Daily Attendance")}</h2>
          <p>{t("Record and review attendance by date for classes, teachers and staff.")}</p>
        </div>
        <label className="attendance-year-control">
          {t("Academic Year")}
          <select value={academicYear} onChange={event => { setAcademicYear(event.target.value); setClassFilter("All Classes"); }}>
            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>

      <div className="attendance-tabs" role="tablist" aria-label={t("Attendance type")}>
        <button type="button" role="tab" aria-selected={activeTab === "class"} className={"attendance-tab" + (activeTab === "class" ? " is-active" : "")} onClick={() => chooseTab("class")}>
          <GraduationCap size={17} /> {t("Class Attendance")}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "teacher"} className={"attendance-tab" + (activeTab === "teacher" ? " is-active" : "")} onClick={() => chooseTab("teacher")}>
          <UserCheck size={17} /> {t("Teacher Attendance")}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "staff"} className={"attendance-tab" + (activeTab === "staff" ? " is-active" : "")} onClick={() => chooseTab("staff")}>
          <Users size={17} /> {t("Staff Attendance")}
        </button>
      </div>
    </>
  );
}
