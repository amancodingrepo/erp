import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "../../api.js";
import "./AttendanceModulePage.css";
import AttendanceHeader from "./AttendanceHeader.jsx";
import AttendanceFilters from "./AttendanceFilters.jsx";
import AttendanceSummaryCards from "./AttendanceSummaryCards.jsx";
import AttendanceCardResults from "./AttendanceCardResults.jsx";
import AttendanceCalendar from "./AttendanceCalendar.jsx";
import AttendanceRegister from "./AttendanceRegister.jsx";
import {
  ATTENDANCE_STATUSES, dateKey, parseDateKey, monthCells,
  moveMonth, getName, getMetadataLabel, getStatusCounts, getSummaryCounts
} from "./attendanceUtils.js";
import { academicYearNow, academicYearOptions } from "../../school-options.js";
import { schoolToday } from "../../school-locale.js";

export default function AttendanceModulePage({ students = [], t = value => value, notify = () => {}, onOpenStudent = () => {} }) {
  const [activeTab, setActiveTab] = useState("class");
  const [viewMode, setViewMode] = useState("month");
  const [attendanceDate, setAttendanceDate] = useState(() => schoolToday());
  const [academicYear, setAcademicYear] = useState(() => academicYearNow());
  const [classFilter, setClassFilter] = useState("All Classes");
  const [staffFilterMode, setStaffFilterMode] = useState("Role");
  const [staffFilterValue, setStaffFilterValue] = useState("All");
  const [attendanceState, setAttendanceState] = useState({});
  const [monthSummary, setMonthSummary] = useState({});
  const [moduleData, setModuleData] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSummaryCard, setSelectedSummaryCard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [summaryRefresh, setSummaryRefresh] = useState(0);

  const yearOptions = useMemo(function () {
    const fromStudents = (students || []).map(student => String(student.academicYear || "").trim());
    const options = academicYearOptions(fromStudents);
    return options.length ? options : [academicYearNow()].filter(Boolean);
  }, [students]);

  useEffect(function () {
    if (!yearOptions.length || yearOptions.includes(academicYear)) return;
    const sessionYear = academicYearNow();
    setAcademicYear(yearOptions.includes(sessionYear) ? sessionYear : yearOptions[0]);
  }, [yearOptions, academicYear]);

  const availableClasses = useMemo(function () {
    const relevant = (students || []).filter(student => !student.academicYear || student.academicYear === academicYear);
    return Array.from(new Set(relevant.map(student => String(student.className || "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, academicYear]);

  useEffect(function () {
    let cancelled = false;
    async function loadPeopleAndModuleData() {
      try {
        const result = await apiGet("/people?type=teacher");
        if (!cancelled) setTeachers(Array.isArray(result.people) ? result.people : []);
      } catch (error) {
        if (!cancelled) setLoadError("Teacher directory could not be loaded: " + error.message);
      }
      try {
        const result = await apiGet("/people?type=staff");
        if (!cancelled) setStaff(Array.isArray(result.people) ? result.people : []);
      } catch (error) {
        if (!cancelled) setLoadError("Staff directory could not be loaded: " + error.message);
      }
      try {
        const result = await apiGet("/module-data/attendance");
        if (!cancelled) setModuleData(result && result.data && typeof result.data === "object" ? result.data : {});
      } catch (error) {
        if (!cancelled) setLoadError("Saved teacher/staff attendance could not be loaded: " + error.message);
      }
    }
    loadPeopleAndModuleData();
    return function () { cancelled = true; };
  }, []);

  useEffect(function () {
    let cancelled = false;
    async function loadAttendanceForDate() {
      setLoadError("");
      if (activeTab !== "class") {
        const map = moduleData && moduleData.attendanceStaff && moduleData.attendanceStaff[activeTab];
        const dateRecords = map && map[attendanceDate];
        setAttendanceState(dateRecords && typeof dateRecords === "object" ? dateRecords : {});
        setLoading(false);
        return;
      }
      setLoading(true);
      setAttendanceState({});
      try {
        const result = await apiGet("/attendance?date=" + encodeURIComponent(attendanceDate));
        if (!cancelled) {
          const records = Array.isArray(result.records) ? result.records : [];
          setAttendanceState(Object.fromEntries(records.map(record => [String(record.studentCode), record.status])));
        }
      } catch (error) {
        if (!cancelled) setLoadError("Attendance could not be loaded: " + error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAttendanceForDate();
    return function () { cancelled = true; };
  }, [activeTab, attendanceDate, moduleData]);

  useEffect(function () {
    if (activeTab !== "class") return undefined;
    let cancelled = false;
    const date = parseDateKey(attendanceDate);
    const startDate = dateKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const endDate = dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    const params = new URLSearchParams({ startDate: startDate, endDate: endDate, academicYear: academicYear });
    if (classFilter !== "All Classes") params.set("className", classFilter);
    apiGet("/attendance/summary?" + params.toString()).then(function (result) {
      if (!cancelled) {
        const summaries = {};
        (result.summaries || []).forEach(item => { summaries[String(item.date).slice(0, 10)] = item; });
        setMonthSummary(summaries);
      }
    }).catch(function () {
      if (!cancelled) setMonthSummary({});
    });
    return function () { cancelled = true; };
  }, [attendanceDate, activeTab, academicYear, classFilter, summaryRefresh]);

  const staffFilterOptions = useMemo(function () {
    const options = staff.map(person => getMetadataLabel(person, staffFilterMode));
    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
  }, [staff, staffFilterMode]);

  useEffect(function () {
    if (staffFilterValue !== "All" && !staffFilterOptions.includes(staffFilterValue)) setStaffFilterValue("All");
  }, [staffFilterOptions, staffFilterValue]);

  const activeRoster = useMemo(function () {
    const q = search.trim().toLowerCase();
    if (activeTab === "class") {
      return (students || []).filter(function (student) {
        const yearMatches = !student.academicYear || student.academicYear === academicYear;
        const classMatches = classFilter === "All Classes" || String(student.className || "") === classFilter;
        const active = !student.status || String(student.status).toLowerCase() === "active";
        const matchesText = !q || [student.name, student.id, student.rollNumber, student.enrollmentNumber, student.className]
          .some(value => String(value || "").toLowerCase().includes(q));
        return yearMatches && classMatches && active && matchesText;
      }).sort((a, b) => String(a.className || "").localeCompare(String(b.className || ""), undefined, { numeric: true }) ||
        String(a.rollNumber || "").localeCompare(String(b.rollNumber || ""), undefined, { numeric: true }) ||
        String(a.name || "").localeCompare(String(b.name || "")));
    }
    const people = activeTab === "teacher" ? teachers : staff;
    return people.filter(function (person) {
      const active = !person.status || String(person.status).toLowerCase() === "active";
      const name = getName(person);
      const roleOrCategoryMatches = activeTab !== "staff" || staffFilterValue === "All" ||
        getMetadataLabel(person, staffFilterMode) === staffFilterValue;
      const matchesText = !q || [name, person.externalId, person.email, person.contactNumber, person.rollNumber,
        getMetadataLabel(person, "Role"), getMetadataLabel(person, "Staff Category")]
        .some(value => String(value || "").toLowerCase().includes(q));
      return active && roleOrCategoryMatches && matchesText;
    }).sort((a, b) => getName(a).localeCompare(getName(b)));
  }, [students, activeTab, teachers, staff, academicYear, classFilter, staffFilterMode, staffFilterValue, search]);

  const keySelector = person => String(person.id);
  const rosterCounts = useMemo(() => getStatusCounts(activeRoster, attendanceState, keySelector), [activeRoster, attendanceState, activeTab]);
  const selectedSummaryPeople = useMemo(function () {
    if (!selectedSummaryCard) return [];
    return activeRoster.filter(function (person) {
      const status = attendanceState[String(person.id)];
      if (selectedSummaryCard === "Total") return true;
      if (selectedSummaryCard === "Unmarked") return !ATTENDANCE_STATUSES.includes(status);
      return status === selectedSummaryCard;
    });
  }, [selectedSummaryCard, activeRoster, attendanceState]);
  const focusDate = parseDateKey(attendanceDate);
  const cells = useMemo(() => monthCells(attendanceDate), [attendanceDate]);
  const currentMonthLabel = focusDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function summaryForDate(key) {
    if (activeTab === "class") {
      const item = monthSummary[key];
      return item ? {
        marked: Number(item.marked || 0), present: Number(item.present || 0),
        absent: Number(item.absent || 0), late: Number(item.late || 0), excused: Number(item.excused || 0)
      } : null;
    }
    const dateMap = moduleData && moduleData.attendanceStaff && moduleData.attendanceStaff[activeTab];
    return dateMap && dateMap[key] ? getSummaryCounts(dateMap[key]) : null;
  }

  function chooseTab(tab) {
    setActiveTab(tab);
    setSelectedSummaryCard(null);
    setSearch("");
    setLoadError("");
  }
  function chooseDate(key) {
    setAttendanceDate(key);
  }
  function changeMonth(amount) {
    setAttendanceDate(moveMonth(attendanceDate, amount));
  }
  function setVisibleRowsStatus(status) {
    setAttendanceState(function (previous) {
      const next = { ...previous };
      activeRoster.forEach(person => { next[keySelector(person)] = status; });
      return next;
    });
  }
  function changeStatus(person, status) {
    setAttendanceState(function (previous) { return { ...previous, [keySelector(person)]: status }; });
  }

  async function saveAttendance() {
    const markedRows = activeRoster.filter(person => ATTENDANCE_STATUSES.includes(attendanceState[keySelector(person)]));
    if (!activeRoster.length) {
      notify("There are no active records in this selection to mark.");
      return;
    }
    if (!markedRows.length) {
      notify("Mark attendance for at least one person before saving.");
      return;
    }
    setSaving(true);
    try {
      if (activeTab === "class") {
        const records = markedRows.map(student => ({
          studentCode: String(student.id),
          status: attendanceState[String(student.id)]
        }));
        const result = await apiPost("/attendance/bulk", { date: attendanceDate, records: records });
        notify("Attendance saved for " + result.saved + " students on " + attendanceDate + ".");
        setSummaryRefresh(value => value + 1);
      } else {
        const staffAttendance = { ...((moduleData && moduleData.attendanceStaff) || {}) };
        const typeAttendance = { ...(staffAttendance[activeTab] || {}) };
        const existingDate = { ...(typeAttendance[attendanceDate] || {}) };
        markedRows.forEach(person => { existingDate[String(person.id)] = attendanceState[String(person.id)]; });
        typeAttendance[attendanceDate] = existingDate;
        staffAttendance[activeTab] = typeAttendance;
        const nextData = { ...moduleData, attendanceStaff: staffAttendance };
        await apiPut("/module-data/attendance", { data: nextData });
        setModuleData(nextData);
        notify((activeTab === "teacher" ? "Teacher" : "Staff") + " attendance saved for " + markedRows.length + " people on " + attendanceDate + ".");
      }
    } catch (error) {
      notify("Attendance could not be saved: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const tabLabel = activeTab === "class" ? t("Class Attendance") :
    activeTab === "teacher" ? t("Teacher Attendance") : t("Staff Attendance");
  const countCards = [
    { key: "Total", label: "Total", value: rosterCounts.Total, className: "" },
    { key: "Present", label: "Present", value: rosterCounts.Present, className: "present" },
    { key: "Absent", label: "Absent", value: rosterCounts.Absent, className: "absent" },
    { key: "Late", label: "Late", value: rosterCounts.Late, className: "late" },
    { key: "Excused", label: "Leave", value: rosterCounts.Excused, className: "excused" },
    { key: "Unmarked", label: "Not marked", value: rosterCounts.Unmarked, className: "unmarked" }
  ];

  return (
    <section className="attendance-workspace">
      <AttendanceHeader
        t={t}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        yearOptions={yearOptions}
        activeTab={activeTab}
        chooseTab={chooseTab}
      />
      <AttendanceFilters
        t={t}
        activeTab={activeTab}
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        availableClasses={availableClasses}
        staffFilterMode={staffFilterMode}
        setStaffFilterMode={setStaffFilterMode}
        staffFilterValue={staffFilterValue}
        setStaffFilterValue={setStaffFilterValue}
        staffFilterOptions={staffFilterOptions}
      />
      <AttendanceSummaryCards
        countCards={countCards}
        selectedSummaryCard={selectedSummaryCard}
        setSelectedSummaryCard={setSelectedSummaryCard}
        t={t}
      />
      <AttendanceCardResults
        selectedSummaryCard={selectedSummaryCard}
        selectedSummaryPeople={selectedSummaryPeople}
        activeTab={activeTab}
        attendanceState={attendanceState}
        staffFilterMode={staffFilterMode}
        t={t}
        attendanceDate={attendanceDate}
        onOpenStudent={onOpenStudent}
      />
      <AttendanceCalendar
        t={t}
        currentMonthLabel={currentMonthLabel}
        changeMonth={changeMonth}
        chooseDate={chooseDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        attendanceDate={attendanceDate}
        cells={cells}
        summaryForDate={summaryForDate}
      />
      <AttendanceRegister
        viewMode={viewMode}
        activeTab={activeTab}
        attendanceDate={attendanceDate}
        tabLabel={tabLabel}
        t={t}
        chooseDate={chooseDate}
        attendanceState={attendanceState}
        activeRoster={activeRoster}
        loading={loading}
        loadError={loadError}
        search={search}
        setSearch={setSearch}
        setVisibleRowsStatus={setVisibleRowsStatus}
        changeStatus={changeStatus}
        saveAttendance={saveAttendance}
        saving={saving}
        keySelector={keySelector}
        staffFilterMode={staffFilterMode}
        onOpenStudent={onOpenStudent}
      />
    </section>
  );
}
