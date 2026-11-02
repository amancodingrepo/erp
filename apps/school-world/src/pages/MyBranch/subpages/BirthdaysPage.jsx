import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, Cake, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Download, Gift, Heart, List, Mail, MessageCircle,
  Printer, RefreshCw, Search, Sparkles, UserRound, Users, X
} from "lucide-react";
import { apiGet } from "../../../api.js";
import "./BirthdaysPage.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseBirthDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { year: value.getFullYear(), month: value.getMonth(), day: value.getDate() };
  }
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return { year, month, day };
    }
    return null;
  }
  match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) {
    const day = Number(match[1]), month = Number(match[2]) - 1, year = Number(match[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return { year, month, day };
    }
  }
  return null;
}
function localDayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
function birthdayInfo(record, today) {
  const birth = parseBirthDate(record.dob);
  if (!birth) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), birth.month, birth.day);
  if (next < start) next = new Date(today.getFullYear() + 1, birth.month, birth.day);
  const daysAway = localDayNumber(next) - localDayNumber(start);
  return {
    ...record,
    birth,
    nextDate: next,
    daysAway,
    turningAge: birth.year > 0 ? next.getFullYear() - birth.year : null,
    monthLabel: MONTHS[birth.month]
  };
}
function formatDate(date, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", options);
}
function formatDateOfBirth(birth) {
  if (!birth) return "Date of birth not recorded";
  return new Date(2000, birth.month, birth.day).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) +
    (birth.year ? " " + birth.year : "");
}
function initials(name) {
  return String(name || "Birthday").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "BD";
}
function mapStudent(student) {
  return {
    id: "student-" + String(student.id ?? student.studentId ?? student.studentCode ?? student.name),
    name: String(student.name || student.fullName || "Unnamed student"),
    kind: "Student",
    dob: student.dob || student.dateOfBirth || student.date_of_birth || "",
    className: [student.className || student.class, student.section ? "Section " + student.section : ""].filter(Boolean).join(" · "),
    phone: student.phone || student.contactNumber || "",
    email: student.email || "",
    photo: student.photoDataUrl || student.photo || "",
    reference: student.studentId || student.studentCode || student.id || "",
    status: student.status || "Active"
  };
}
function mapPerson(person, fallbackKind) {
  const details = person.metadata?.staffDetails && typeof person.metadata.staffDetails === "object"
    ? person.metadata.staffDetails
    : {};
  const kind = person.personType === "teacher" ? "Teacher" : (fallbackKind || "Staff");
  return {
    id: kind.toLowerCase() + "-" + String(person.id),
    name: String(person.fullName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ") || "Unnamed staff"),
    kind,
    dob: person.dateOfBirth || person.dob || details.dateOfBirth || "",
    className: details.designation || kind,
    phone: person.contactNumber || details.phone || "",
    email: person.email || details.email || "",
    photo: details.photoDataUrl || person.photoDataUrl || "",
    reference: person.externalId || details.employeeCode || "",
    status: person.status || "Active"
  };
}
function birthdayWish(record) {
  return "Happy Birthday, " + record.name + "! 🎂 Wishing you a wonderful day filled with happiness, good health and success. Best wishes from the school family!";
}
function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}
function downloadCsv(records) {
  const header = ["Name", "Category", "Date of Birth", "Birthday Date", "Age on Birthday", "Class / Designation", "Phone", "Email", "ID"];
  const rows = records.map(record => [
    record.name,
    record.kind,
    record.birth ? formatDateOfBirth(record.birth) : "",
    record.nextDate ? formatDate(record.nextDate) : "",
    record.turningAge ?? "",
    record.className,
    record.phone,
    record.email,
    record.reference
  ]);
  const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "school-world-birthdays.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function sourceLabel(kind) {
  return kind === "Student" ? "Student" : kind === "Teacher" ? "Teacher" : "Staff";
}

export default function BirthdaysPage({ onBack, notify, t, students = [] }) {
  const text = typeof t === "function" ? t : value => value;
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [period, setPeriod] = useState("next30");
  const [monthFilter, setMonthFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [showMissingDates, setShowMissingDates] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  async function loadBirthdays(showLoading = true) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    setFeedback("");
    const results = await Promise.allSettled([
      apiGet("/students"),
      apiGet("/people?type=teacher"),
      apiGet("/people?type=staff")
    ]);
    const studentsResult = results[0];
    const teachersResult = results[1];
    const staffResult = results[2];

    const studentRows = studentsResult.status === "fulfilled" && Array.isArray(studentsResult.value?.students)
      ? studentsResult.value.students
      : (Array.isArray(students) ? students : []);
    const teacherRows = teachersResult.status === "fulfilled" && Array.isArray(teachersResult.value?.people)
      ? teachersResult.value.people.map(person => mapPerson(person, "Teacher"))
      : [];
    const staffRows = staffResult.status === "fulfilled" && Array.isArray(staffResult.value?.people)
      ? staffResult.value.people.map(person => mapPerson(person, "Staff"))
      : [];

    setDirectory([
      ...studentRows.map(mapStudent),
      ...teacherRows,
      ...staffRows
    ]);
    const allFailed = results.every((result, index) =>
      result.status === "rejected" && !(index === 0 && Array.isArray(students) && students.length)
    );
    if (allFailed) setError("Birthday records could not be loaded. Please check your connection and try refreshing.");
    else if (results.some(result => result.status === "rejected")) {
      setError("Some records could not be loaded. The available student and staff records are still shown.");
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        apiGet("/students"),
        apiGet("/people?type=teacher"),
        apiGet("/people?type=staff")
      ]);
      if (!active) return;
      const studentRows = results[0].status === "fulfilled" && Array.isArray(results[0].value?.students)
        ? results[0].value.students
        : (Array.isArray(students) ? students : []);
      const teacherRows = results[1].status === "fulfilled" && Array.isArray(results[1].value?.people)
        ? results[1].value.people.map(person => mapPerson(person, "Teacher"))
        : [];
      const staffRows = results[2].status === "fulfilled" && Array.isArray(results[2].value?.people)
        ? results[2].value.people.map(person => mapPerson(person, "Staff"))
        : [];
      setDirectory([...studentRows.map(mapStudent), ...teacherRows, ...staffRows]);
      if (results.every((result, index) => result.status === "rejected" && !(index === 0 && Array.isArray(students) && students.length))) {
        setError("Birthday records could not be loaded. Please check your connection and try refreshing.");
      } else if (results.some(result => result.status === "rejected")) {
        setError("Some records could not be loaded. The available student and staff records are still shown.");
      }
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, []);

  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  const allBirthdays = useMemo(() => directory
    .map(record => birthdayInfo(record, today))
    .filter(Boolean)
    .sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name)), [directory, todayKey]);
  const missingDates = useMemo(() => directory.filter(record => !parseBirthDate(record.dob))
    .sort((a, b) => a.name.localeCompare(b.name)), [directory]);

  const counts = useMemo(() => ({
    today: allBirthdays.filter(item => item.daysAway === 0).length,
    next7: allBirthdays.filter(item => item.daysAway <= 7).length,
    thisMonth: allBirthdays.filter(item => item.birth.month === today.getMonth()).length,
    missing: missingDates.length
  }), [allBirthdays, missingDates, todayKey]);

  const categoryRecords = showMissingDates ? missingDates : allBirthdays;
  const matchedRecords = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return categoryRecords.filter(record => {
      if (category !== "All" && record.kind !== category) return false;
      if (monthFilter !== "all" && parseBirthDate(record.dob)?.month !== Number(monthFilter)) return false;
      if (searchText && ![
        record.name, record.kind, record.className, record.phone, record.email, record.reference
      ].some(value => String(value || "").toLowerCase().includes(searchText))) return false;
      if (showMissingDates) return true;
      if (selectedCalendarDate) {
        const [year, month, day] = selectedCalendarDate.split("-").map(Number);
        return record.birth.month === month - 1 && record.birth.day === day;
      }
      if (period === "today") return record.daysAway === 0;
      if (period === "next7") return record.daysAway <= 7;
      if (period === "next30") return record.daysAway <= 30;
      if (period === "thisMonth") return record.birth.month === today.getMonth();
      return true;
    });
  }, [categoryRecords, category, monthFilter, query, showMissingDates, selectedCalendarDate, period, todayKey]);

  function selectPeriod(nextPeriod) {
    setPeriod(nextPeriod);
    setShowMissingDates(false);
    setSelectedCalendarDate("");
  }
  async function copyWish(record) {
    const message = birthdayWish(record);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(record.id);
      setFeedback("Birthday wish copied for " + record.name + ".");
      notify?.("Birthday wish copied.");
    } catch {
      setError("Your browser blocked clipboard access. You can select and copy the birthday wish from the WhatsApp message.");
    }
  }
  function handleExport() {
    downloadCsv(matchedRecords);
    setFeedback((showMissingDates ? "Records missing date of birth" : "Birthday list") + " downloaded as CSV.");
    notify?.("CSV downloaded.");
  }

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarFirstDay = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const calendarDays = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarBirthdayCount = day => allBirthdays.filter(item => item.birth.month === calendarMonthIndex && item.birth.day === day).length;
  const selectedDateLabel = selectedCalendarDate
    ? formatDate(new Date(...selectedCalendarDate.split("-").map((value, index) => index === 1 ? Number(value) - 1 : Number(value))), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <section className="birthdays-page">
      <button type="button" className="birthdays-back" onClick={onBack}>
        <ArrowLeft size={15} /> {text("Back to My Branch")}
      </button>

      <header className="birthdays-heading">
        <div>
          <span className="birthdays-eyebrow"><Sparkles size={13} /> {text("SCHOOL COMMUNITY")}</span>
          <h2>{text("Birthdays")}</h2>
          <p>{text("Celebrate students and staff with one clear view of every upcoming birthday.")}</p>
          <div className="birthdays-today-line"><CalendarDays size={15} /> {formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div className="birthdays-header-actions">
          <button type="button" className="birthdays-button birthdays-button-quiet" onClick={() => window.print()}><Printer size={15} /> {text("Print")}</button>
          <button type="button" className="birthdays-button birthdays-button-quiet" onClick={handleExport} disabled={loading || matchedRecords.length === 0}><Download size={15} /> {text("Export CSV")}</button>
          <button type="button" className="birthdays-button birthdays-button-primary" onClick={() => loadBirthdays(false)} disabled={loading || refreshing}>
            <RefreshCw size={15} className={refreshing ? "birthdays-spin" : ""} /> {text(refreshing ? "Refreshing…" : "Refresh")}
          </button>
        </div>
      </header>

      {error && <div className={"birthdays-alert" + (directory.length ? " birthdays-alert-warning" : "")} role="alert"><AlertCircle size={17} /><span>{text(error)}</span><button type="button" onClick={() => setError("")} aria-label={text("Dismiss")}><X size={15} /></button></div>}
      {feedback && !error && <div className="birthdays-feedback" role="status"><CheckCircle2 size={16} /> {text(feedback)}</div>}

      <div className="birthdays-metrics">
        <button type="button" className={"birthdays-metric birthdays-metric-today" + (period === "today" && !showMissingDates ? " selected" : "")} onClick={() => selectPeriod("today")}>
          <span className="birthdays-metric-icon"><Cake size={20} /></span>
          <span className="birthdays-metric-copy"><small>{text("Today")}</small><strong>{counts.today}</strong><em>{text("Birthday celebrations")}</em></span>
          <span className="birthdays-metric-corner">🎂</span>
        </button>
        <button type="button" className={"birthdays-metric birthdays-metric-upcoming" + (period === "next7" && !showMissingDates ? " selected" : "")} onClick={() => selectPeriod("next7")}>
          <span className="birthdays-metric-icon"><Clock3 size={20} /></span>
          <span className="birthdays-metric-copy"><small>{text("Next 7 Days")}</small><strong>{counts.next7}</strong><em>{text("Coming up soon")}</em></span>
          <span className="birthdays-metric-corner"><Gift size={22} /></span>
        </button>
        <button type="button" className={"birthdays-metric birthdays-metric-month" + (period === "thisMonth" && !showMissingDates ? " selected" : "")} onClick={() => selectPeriod("thisMonth")}>
          <span className="birthdays-metric-icon"><CalendarDays size={20} /></span>
          <span className="birthdays-metric-copy"><small>{text("This Month")}</small><strong>{counts.thisMonth}</strong><em>{text("All birthdays this month")}</em></span>
          <span className="birthdays-metric-corner"><Heart size={22} /></span>
        </button>
        <button type="button" className={"birthdays-metric birthdays-metric-missing" + (showMissingDates ? " selected" : "")} onClick={() => { setShowMissingDates(true); setSelectedCalendarDate(""); }}>
          <span className="birthdays-metric-icon"><Users size={20} /></span>
          <span className="birthdays-metric-copy"><small>{text("Missing Birth Dates")}</small><strong>{counts.missing}</strong><em>{text("Records to complete")}</em></span>
          <span className="birthdays-metric-corner"><AlertCircle size={21} /></span>
        </button>
      </div>

      <section className="birthdays-control-panel">
        <div className="birthdays-filters-top">
          <label className="birthdays-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Search name, class, phone or email…")} aria-label={text("Search birthday records")} /><kbd>⌕</kbd></label>
          <label className="birthdays-month-filter"><span>{text("Birthday month")}</span><select value={monthFilter} onChange={event => setMonthFilter(event.target.value)}><option value="all">{text("All months")}</option>{MONTHS.map((month, index) => <option key={month} value={index}>{text(month)}</option>)}</select></label>
          <div className="birthdays-view-toggle" aria-label={text("Birthday view")}>
            <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => { setViewMode("list"); setSelectedCalendarDate(""); }}><List size={15} /> {text("List")}</button>
            <button type="button" className={viewMode === "calendar" ? "active" : ""} onClick={() => { setViewMode("calendar"); setShowMissingDates(false); }}><CalendarDays size={15} /> {text("Calendar")}</button>
          </div>
        </div>
        <div className="birthdays-filter-bottom">
          <div className="birthdays-category-tabs" role="group" aria-label={text("Filter people")}>
            {["All", "Student", "Teacher", "Staff"].map(option => <button type="button" key={option} className={category === option ? "active" : ""} onClick={() => setCategory(option)}>{text(option === "All" ? "Everyone" : option === "Student" ? "Students" : option === "Teacher" ? "Teachers" : "Staff")}</button>)}
          </div>
          {!showMissingDates && <div className="birthdays-period-tabs" role="group" aria-label={text("Birthday period")}>
            {[["next30", "Next 30 Days"], ["all", "All Upcoming"]].map(([value, label]) => <button type="button" key={value} className={period === value && !selectedCalendarDate ? "active" : ""} onClick={() => selectPeriod(value)}>{text(label)}</button>)}
          </div>}
          {showMissingDates && <button type="button" className="birthdays-button birthdays-button-quiet birthdays-clear-missing" onClick={() => setShowMissingDates(false)}><X size={14} /> {text("Close missing dates")}</button>}
        </div>
      </section>

      {viewMode === "calendar" && !showMissingDates && (
        <section className="birthdays-calendar-panel">
          <header className="birthdays-calendar-heading">
            <div><span className="birthdays-section-kicker">{text("BIRTHDAY CALENDAR")}</span><h3>{text(MONTHS[calendarMonthIndex])} {calendarYear}</h3><p>{text("Select a date to see everyone celebrating that day.")}</p></div>
            <div className="birthdays-calendar-nav">
              <button type="button" onClick={() => { setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1)); setSelectedCalendarDate(""); }} aria-label={text("Previous month")}><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => { const now = new Date(); setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedCalendarDate(""); }}><CalendarDays size={14} /> {text("Today")}</button>
              <button type="button" onClick={() => { setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1)); setSelectedCalendarDate(""); }} aria-label={text("Next month")}><ChevronRight size={18} /></button>
            </div>
          </header>
          <div className="birthdays-calendar-grid">
            {WEEKDAYS.map(day => <div className="birthdays-weekday" key={day}>{text(day)}</div>)}
            {Array.from({ length: calendarFirstDay }, (_, index) => <div className="birthdays-calendar-empty" key={"empty-" + index} />)}
            {Array.from({ length: calendarDays }, (_, index) => {
              const day = index + 1;
              const count = calendarBirthdayCount(day);
              const dateKey = [calendarYear, String(calendarMonthIndex + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
              const isToday = dateKey === todayKey;
              return <button type="button" key={dateKey} className={"birthdays-calendar-day" + (count ? " has-birthday" : "") + (isToday ? " is-today" : "") + (selectedCalendarDate === dateKey ? " selected" : "")} onClick={() => { setSelectedCalendarDate(selectedCalendarDate === dateKey ? "" : dateKey); setShowMissingDates(false); }}>
                <span>{day}</span>{count > 0 && <em>{count} {count === 1 ? text("birthday") : text("birthdays")}</em>}
              </button>;
            })}
          </div>
          <div className="birthdays-calendar-legend"><span><i className="birthday-dot" /> {text("Birthday on this date")}</span><span><i className="birthday-dot today-dot" /> {text("Today")}</span></div>
        </section>
      )}

      <section className="birthdays-results-panel">
        <header className="birthdays-results-heading">
          <div>
            <span className="birthdays-section-kicker">{text(showMissingDates ? "PROFILE COMPLETION" : "CELEBRATIONS")}</span>
            <h3>{text(showMissingDates ? "Records Missing Date of Birth" : selectedCalendarDate ? "Birthdays on " + selectedDateLabel : period === "today" ? "Birthdays Today" : period === "next7" ? "Coming Up in 7 Days" : period === "thisMonth" ? "Birthdays This Month" : period === "all" ? "All Upcoming Birthdays" : "Upcoming Birthdays")}</h3>
            <p>{text(showMissingDates ? "These profiles need a date of birth before birthdays can be scheduled." : "Sorted by the next birthday date, with age and quick greeting actions.")}</p>
          </div>
          <span className="birthdays-result-count">{matchedRecords.length} {text(matchedRecords.length === 1 ? "record" : "records")}</span>
        </header>

        {loading ? (
          <div className="birthdays-empty"><span className="birthdays-empty-icon"><RefreshCw size={23} className="birthdays-spin" /></span><strong>{text("Loading birthday records…")}</strong><p>{text("Collecting birth dates from student and staff profiles.")}</p></div>
        ) : matchedRecords.length === 0 ? (
          <div className="birthdays-empty"><span className="birthdays-empty-icon">{showMissingDates ? <CheckCircle2 size={25} /> : <Cake size={25} />}</span><strong>{text(showMissingDates ? "All profiles have a date of birth" : "No birthdays match these filters")}</strong><p>{text(showMissingDates ? "Great work—there are no missing birth dates in the records available to this page." : "Try a different period, month, or search term to find more birthdays.")}</p><button type="button" className="birthdays-button birthdays-button-quiet" onClick={() => { setQuery(""); setMonthFilter("all"); setCategory("All"); setSelectedCalendarDate(""); setShowMissingDates(false); setPeriod("all"); }}>{text("Clear filters")}</button></div>
        ) : showMissingDates ? (
          <div className="birthdays-missing-list">
            {matchedRecords.map(record => <article className="birthdays-missing-record" key={record.id}>
              <span className="birthdays-avatar">{record.photo ? <img src={record.photo} alt="" /> : initials(record.name)}</span>
              <div><strong>{record.name}</strong><small>{text(record.kind)}{record.className ? " · " + record.className : ""}</small></div>
              <span className="birthdays-missing-badge">{text("Date not entered")}</span>
            </article>)}
          </div>
        ) : (
          <div className="birthdays-list">
            {matchedRecords.map(record => {
              const isPastThisMonth = period === "thisMonth" && record.birth.month === today.getMonth() && record.birth.day < today.getDate() && !selectedCalendarDate;
              const displayDate = isPastThisMonth ? new Date(today.getFullYear(), record.birth.month, record.birth.day) : record.nextDate;
              const displayAge = record.birth.year ? displayDate.getFullYear() - record.birth.year : null;
              const isToday = !isPastThisMonth && record.daysAway === 0;
              const dateLabel = isPastThisMonth
                ? text("Passed") + " · " + formatDate(displayDate, { day: "numeric", month: "short" })
                : isToday ? text("Today") : record.daysAway === 1 ? text("Tomorrow") : text("In") + " " + record.daysAway + " " + text("days");
              const phoneDigits = String(record.phone || "").replace(/\D/g, "");
              const wish = birthdayWish(record);
              return <article className={"birthdays-person-card" + (isToday ? " is-today" : "")} key={record.id}>
                <div className={"birthdays-date-tile" + (isToday ? " today" : "")}>
                  <span>{MONTHS[displayDate.getMonth()].slice(0, 3)}</span><strong>{displayDate.getDate()}</strong><small>{displayDate.getFullYear()}</small>
                </div>
                <span className="birthdays-avatar">{record.photo ? <img src={record.photo} alt={record.name} /> : initials(record.name)}</span>
                <div className="birthdays-person-info">
                  <div className="birthdays-person-name-row"><h4>{record.name}</h4>{isToday && <span className="birthdays-today-pill"><Sparkles size={11} /> {text("Today!")}</span>}</div>
                  <div className="birthdays-person-meta"><span>{text(sourceLabel(record.kind))}</span>{record.className && <><i>·</i><span>{record.className}</span></>}{record.reference && <><i>·</i><span>{text("ID")} {record.reference}</span></>}</div>
                  <div className="birthdays-person-details">
                    <span><Cake size={13} /> {formatDateOfBirth(record.birth)}</span>
                    {displayAge !== null && displayAge >= 0 && <span><Gift size={13} /> {text("Turning")} {displayAge}</span>}
                    {record.phone && <span><MessageCircle size={13} /> {record.phone}</span>}
                    {record.email && <span><Mail size={13} /> {record.email}</span>}
                  </div>
                </div>
                <div className="birthdays-card-actions">
                  <span className={"birthdays-countdown" + (isToday ? " today" : "")}>{dateLabel}</span>
                  <button type="button" className="birthdays-action-button" onClick={() => void copyWish(record)} title={text("Copy birthday wish")}><Heart size={14} /> {copiedId === record.id ? text("Copied") : text("Birthday Wish")}</button>
                  {phoneDigits.length >= 7 && <a className="birthdays-action-button birthdays-whatsapp" href={"https://wa.me/" + phoneDigits + "?text=" + encodeURIComponent(wish)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> {text("WhatsApp")}</a>}
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
      <footer className="birthdays-page-footer"><span><ShieldCheckIcon /> {text("Birthdays are calculated from existing profile dates of birth.")}</span><span>{text("No profile data is changed from this page.")}</span></footer>
    </section>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={14} aria-hidden="true" />;
}
