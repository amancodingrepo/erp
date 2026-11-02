import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api.js";
import { useSchoolName } from "../../school-config.js";
import { dateKey, nextBirthday } from "./dashboardUtils.js";
import DashboardHero from "./DashboardHero.jsx";
import DashboardWarning from "./DashboardWarning.jsx";
import DashboardMetricCards from "./DashboardMetricCards.jsx";
import DashboardQuickActions from "./DashboardQuickActions.jsx";
import DashboardAttendanceCard from "./DashboardAttendanceCard.jsx";
import DashboardClassOverviewCard from "./DashboardClassOverviewCard.jsx";
import DashboardUpcomingEventsCard from "./DashboardUpcomingEventsCard.jsx";
import DashboardBirthdaysCard from "./DashboardBirthdaysCard.jsx";
import SchoolAIAssistantCard from "./SchoolAIAssistantCard.jsx";
import DashboardDataNote from "./DashboardDataNote.jsx";

export default function SchoolDashboard({
  students = [],
  userRole = "staff",
  onSelectModule,
  onOpenBranchLinkedModule,
  onOpenDuesTillDate,
  onNotify
}) {
  const schoolName = useSchoolName();
  const [liveData, setLiveData] = useState({ events: [], fees: [], attendance: [] });
  const [available, setAvailable] = useState({ events: false, fees: false, attendance: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const today = dateKey(new Date());

  async function loadDashboard(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    const nextWarnings = [];
    const results = await Promise.allSettled([
      apiGet("/module-data/events"),
      apiGet("/fees"),
      apiGet("/attendance?date=" + encodeURIComponent(today))
    ]);
    const data = { events: [], fees: [], attendance: [] };
    const state = { events: false, fees: false, attendance: false };
    if (results[0].status === "fulfilled") {
      const payload = results[0].value && results[0].value.data || {};
      data.events = Array.isArray(payload.events) ? payload.events : [];
      state.events = true;
    } else nextWarnings.push("Events summary is temporarily unavailable.");
    if (results[1].status === "fulfilled") {
      data.fees = Array.isArray(results[1].value && results[1].value.fees) ? results[1].value.fees : [];
      state.fees = true;
    } else nextWarnings.push("Fee summary is temporarily unavailable.");
    if (results[2].status === "fulfilled") {
      data.attendance = Array.isArray(results[2].value && results[2].value.records) ? results[2].value.records : [];
      state.attendance = true;
    } else nextWarnings.push("Today's attendance summary is temporarily unavailable.");
    setLiveData(data);
    setAvailable(state);
    setWarnings(nextWarnings);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      setLoading(true);
      const nextWarnings = [];
      const results = await Promise.allSettled([
        apiGet("/module-data/events"),
        apiGet("/fees"),
        apiGet("/attendance?date=" + encodeURIComponent(today))
      ]);
      if (cancelled) return;
      const data = { events: [], fees: [], attendance: [] };
      const state = { events: false, fees: false, attendance: false };
      if (results[0].status === "fulfilled") {
        const payload = results[0].value && results[0].value.data || {};
        data.events = Array.isArray(payload.events) ? payload.events : [];
        state.events = true;
      } else nextWarnings.push("Events summary is temporarily unavailable.");
      if (results[1].status === "fulfilled") {
        data.fees = Array.isArray(results[1].value && results[1].value.fees) ? results[1].value.fees : [];
        state.fees = true;
      } else nextWarnings.push("Fee summary is temporarily unavailable.");
      if (results[2].status === "fulfilled") {
        data.attendance = Array.isArray(results[2].value && results[2].value.records) ? results[2].value.records : [];
        state.attendance = true;
      } else nextWarnings.push("Today's attendance summary is temporarily unavailable.");
      setLiveData(data);
      setAvailable(state);
      setWarnings(nextWarnings);
      setLoading(false);
    }
    initialLoad();
    return () => { cancelled = true; };
  }, [today]);

  const metrics = useMemo(() => {
    const total = students.length;
    const active = students.filter(student => String(student.status || "Active").toLowerCase() === "active").length;
    const inactive = students.filter(student => String(student.status || "").toLowerCase() === "inactive").length;
    const defaulters = students.filter(student => Boolean(student.defaulter)).length;
    const classMap = new Map();
    students.forEach(student => {
      const name = String(student.className || student.class || "Unassigned").trim() || "Unassigned";
      const current = classMap.get(name) || { name, total: 0, active: 0 };
      current.total += 1;
      if (String(student.status || "Active").toLowerCase() === "active") current.active += 1;
      classMap.set(name, current);
    });
    const classes = Array.from(classMap.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const feesDueThroughToday = liveData.fees.filter(fee => {
      const dueDate = String(fee.dueDate || "").slice(0, 10);
      const balance = Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0));
      return dueDate && dueDate <= today && balance > 0;
    });
    const feeOutstanding = feesDueThroughToday.reduce((sum, fee) => sum + Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0)), 0);
    const feePaid = liveData.fees.reduce((sum, fee) => sum + Math.max(0, Number(fee.amountPaid || 0)), 0);
    const unpaidFeeRecords = feesDueThroughToday.length;
    const attendance = liveData.attendance;
    const present = attendance.filter(record => /present|late/i.test(String(record.status || ""))).length;
    const absent = attendance.filter(record => /absent/i.test(String(record.status || ""))).length;
    const attendanceRate = attendance.length ? Math.round(present / attendance.length * 100) : null;
    const upcomingEvents = liveData.events
      .filter(event => String(event.endDate || event.startDate || event.date || "") >= today)
      .map(event => ({
        ...event,
        startDate: String(event.startDate || event.eventDate || event.date || today).slice(0, 10),
        endDate: String(event.endDate || event.startDate || event.eventDate || event.date || today).slice(0, 10),
        description: String(event.description || event.title || event.name || "School event")
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const birthdays = students.map(student => nextBirthday(student, new Date()))
      .filter(item => item && item.days >= 0 && item.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
    const missingContacts = students.filter(student => !String(student.phone || student.parentPhone || "").trim()).length;
    return { total, active, inactive, defaulters, classes, feeOutstanding, feePaid, unpaidFeeRecords, attendance, present, absent, attendanceRate, upcomingEvents, birthdays, missingContacts };
  }, [students, liveData, today]);

  function openModule(module) {
    if (module === "Manage Students") onOpenBranchLinkedModule?.("Manage Students");
    else onSelectModule?.(module);
  }

  return (
    <div className="school-dashboard">
      <DashboardHero schoolName={schoolName} userRole={userRole} today={today} refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
      <DashboardWarning warnings={warnings} />
      <DashboardMetricCards metrics={metrics} available={available} onOpenModule={openModule} onOpenDuesTillDate={onOpenDuesTillDate} />
      <DashboardQuickActions onOpenModule={openModule} />
      <div className="school-dashboard-main-grid">
        <div className="school-dashboard-column">
          <DashboardAttendanceCard loading={loading} available={available} metrics={metrics} today={today} onOpenModule={openModule} />
          <DashboardClassOverviewCard metrics={metrics} onOpenModule={openModule} />
        </div>
        <div className="school-dashboard-column">
          <DashboardUpcomingEventsCard loading={loading} available={available} metrics={metrics} onOpenModule={openModule} />
          <DashboardBirthdaysCard metrics={metrics} />
          <SchoolAIAssistantCard metrics={metrics} available={available} schoolName={schoolName} onOpenModule={openModule} onNotify={onNotify} />
        </div>
      </div>
      <DashboardDataNote refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
    </div>
  );
}
