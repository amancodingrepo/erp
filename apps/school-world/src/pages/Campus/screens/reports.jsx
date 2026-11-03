import React, { useEffect, useMemo, useState } from "react";
import {
  Button, DataTable, Field, Form, Notice, Panel, Row, Screen,
  apiCall, plural, rowsOf, useLoad
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/report-view.tsx, using the same /v1/reports/{key} endpoint.
// Each screen offers only the reports that belong to it, and only the filters each report reads
// (see runReport in apps/erp/src/lib/reports/index.ts); the old screen showed every filter on every report.

const REPORTS = {
  students: { label: "Student information", filters: ["class", "section"] },
  strength: { label: "Class strength", filters: ["class", "section"] },
  "disabled-students": { label: "Disabled students", filters: [] },
  "daily-collection": { label: "Daily fee collection", filters: ["from", "to"] },
  "head-collection": { label: "Collection by fee head", filters: ["feeGroup"] },
  dues: { label: "Fee dues", filters: ["class", "section", "feeGroup"] },
  "attendance-percent": { label: "Attendance percentage", filters: ["class", "section", "from", "to"], sectionOnly: true },
  "daily-attendance": { label: "Daily attendance", filters: ["class", "section", "from", "to"] },
  "attendance-register": { label: "Monthly attendance register", filters: ["class", "section", "from", "to"], sectionOnly: true },
  "exam-results": { label: "Exam results", filters: [] },
  "result-summary": { label: "Result summary", filters: [] },
  "exam-absent": { label: "Absent in exams", filters: [] },
  "consolidated-performance": { label: "Consolidated performance", filters: [] },
  staff: { label: "Staff directory", filters: [] },
  payroll: { label: "Staff payroll", filters: [] },
  "library-issues": { label: "Library issues", filters: [] },
  visitors: { label: "Visitor book", filters: [] },
  "payment-log": { label: "Payment log", filters: ["from", "to"] },
  "user-log": { label: "User log", filters: [] },
  audit: { label: "Audit trail", filters: [] },
  "admission-tests": { label: "Admission tests", filters: [] },
  "admission-summary": { label: "Admission summary", filters: ["from", "to"] },
  "transport-students": { label: "Student transport", filters: ["class", "section"] },
  "hostel-students": { label: "Student hostel", filters: ["class", "section"] },
  "student-log": { label: "Student log update", filters: ["from", "to"] },
  backlog: { label: "Backlog", filters: ["class", "section"] },
};

function heading(key) {
  const words = String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : key;
}

function cell(value) {
  if (value == null || value === "") return "-";
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? new Date(text).toLocaleString() : text;
}

function ReportScreen({ title, hint, keys }) {
  const [key, setKey] = useState(keys[0]);
  const meta = REPORTS[key];
  const uses = (name) => meta.filters.includes(name);
  const needsMasters = keys.some((k) => REPORTS[k].filters.some((f) => f === "class" || f === "section" || f === "feeGroup"));
  const { data: masters } = useLoad(needsMasters ? ["/v1/classes", "/v1/fee-groups"] : []);
  const classes = rowsOf(masters["/v1/classes"]);
  const feeGroups = rowsOf(masters["/v1/fee-groups"]);
  const [filters, setFilters] = useState({ classId: "", sectionId: "", feeGroupId: "", from: "", to: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const sections = classes.find((row) => row.id === filters.classId)?.sections || [];

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (uses("class") && filters.classId && !meta.sectionOnly) params.set("classId", filters.classId);
    if (uses("section") && filters.sectionId) params.set("sectionId", filters.sectionId);
    if (uses("feeGroup") && filters.feeGroupId) params.set("feeGroupId", filters.feeGroupId);
    if (uses("from") && filters.from) params.set("from", filters.from);
    if (uses("to") && filters.to) params.set("to", filters.to);
    return params.toString();
  }, [key, filters]);

  async function run() {
    if (filters.from && filters.to && filters.to < filters.from) { setError("The end date is before the start date."); return; }
    setLoading(true);
    setError("");
    try {
      setResult(await apiCall("GET", "/v1/reports/" + key + (query ? "?" + query : "")));
    } catch (reason) {
      setResult(null);
      setError(reason.message || "Could not run this report.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { setResult(null); setQ(""); run(); }, [key]);

  const set = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value, ...(name === "classId" ? { sectionId: "" } : {}) }));
  const term = q.trim().toLowerCase();
  const rows = result?.rows || [];
  const shown = term ? rows.filter((row) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(term))) : rows;
  const download = (format) => "/api/v1/reports/" + key + "?" + (query ? query + "&" : "") + "format=" + format;

  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error }} />
      <Panel
        actions={result && (
          <Row>
            <a className="ck-btn ck-btn-ghost" href={download("csv")}>CSV</a>
            <a className="ck-btn ck-btn-ghost" href={download("xlsx")}>Excel</a>
            <a className="ck-btn ck-btn-ghost" href={download("pdf")} target="_blank" rel="noreferrer">PDF</a>
          </Row>
        )}
      >
        <Form onSubmit={(event) => { event.preventDefault(); run(); }}>
          {keys.length > 1 && (
            <Field label="Report">
              <select value={key} onChange={(event) => setKey(event.target.value)}>
                {keys.map((k) => <option key={k} value={k}>{REPORTS[k].label}</option>)}
              </select>
            </Field>
          )}
          {uses("class") && (
            <Field label="Class">
              <select value={filters.classId} onChange={set("classId")}>
                <option value="">{meta.sectionOnly ? "Pick a class" : "All classes"}</option>
                {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
          )}
          {uses("section") && (
            <Field label="Section">
              <select value={filters.sectionId} onChange={set("sectionId")} disabled={!filters.classId}>
                <option value="">All sections</option>
                {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
          )}
          {uses("feeGroup") && (
            <Field label="Fee group">
              <select value={filters.feeGroupId} onChange={set("feeGroupId")}>
                <option value="">All fee groups</option>
                {feeGroups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
          )}
          {uses("from") && <Field label="From"><input type="date" value={filters.from} onChange={set("from")} /></Field>}
          {uses("to") && <Field label="To"><input type="date" value={filters.to} onChange={set("to")} /></Field>}
          <Button type="submit" disabled={loading}>{loading ? "Running…" : "Run report"}</Button>
        </Form>
        {meta.sectionOnly && !filters.sectionId && <p style={{ margin: "8px 0 0" }}>This report is worked out per section. Pick a class and section, or leave them blank for every section.</p>}
      </Panel>
      {result && (
        <Panel title={(result.title || meta.label) + " · " + plural(rows.length, "row")}>
          {rows.length > 10 && (
            <Form onSubmit={(event) => event.preventDefault()}>
              <Field label="Search these rows" wide><input value={q} onChange={(event) => setQ(event.target.value)} /></Field>
            </Form>
          )}
          <DataTable
            rows={shown}
            rowKey={(row, index) => index}
            empty={term ? "No row matches." : "No rows for these filters."}
            columns={(result.columns || []).map((column) => ({ key: column, label: heading(column), render: (row) => cell(row[column]) }))}
          />
        </Panel>
      )}
      {!result && loading && <p>Running report…</p>}
    </Screen>
  );
}

export function StudentReports() {
  return <ReportScreen title="Student information report" hint="Students by class and section, class strength, and disabled students." keys={["students", "strength", "disabled-students"]} />;
}
export function FinanceReports() {
  return <ReportScreen title="Finance reports" hint="Fee collected by day or by fee head, and fees still due." keys={["daily-collection", "head-collection", "dues"]} />;
}
export function AttendanceReports() {
  return <ReportScreen title="Attendance reports" hint="Attendance percentage, day by day, or as a monthly register." keys={["attendance-percent", "daily-attendance", "attendance-register"]} />;
}
export function ExamReports() {
  return <ReportScreen title="Examination reports" hint="Marks, result summaries, absentees and consolidated performance." keys={["exam-results", "result-summary", "exam-absent", "consolidated-performance"]} />;
}
export function HrReport() {
  return <ReportScreen title="Human resource report" hint="Every staff member with department, designation and contact details." keys={["staff"]} />;
}
export function PayrollReport() {
  return <ReportScreen title="Staff payroll report" hint="Generated payslips with gross pay, deductions and net pay." keys={["payroll"]} />;
}
export function LibraryReport() {
  return <ReportScreen title="Library report" hint="Every book issue, when it was due and returned, and any fine." keys={["library-issues"]} />;
}
export function FrontOfficeReport() {
  return <ReportScreen title="Front office report" hint="Everyone signed in and out at the gate." keys={["visitors"]} />;
}
export function PaymentLogReport() {
  return <ReportScreen title="Payment log" hint="Fee payments received, with how they were paid." keys={["payment-log"]} />;
}
export function UserLogReport() {
  return <ReportScreen title="User log" hint="Who signed in, and when." keys={["user-log"]} />;
}
export function AuditTrailReport() {
  return <ReportScreen title="Audit trail" hint="Changes made in the system and who made them." keys={["audit"]} />;
}
export function AdmissionReport() {
  return <ReportScreen title="Admission report" hint="Admission test results for applicants." keys={["admission-tests"]} />;
}
export function AdmissionSummaryReport() {
  return <ReportScreen title="Admission summarized report" hint="Applications per program by status, and the application fee collected. Pick dates to count only applications made in that period." keys={["admission-summary"]} />;
}
export function TransportReport() {
  return <ReportScreen title="Transport report" hint="Students using school transport, with route, pickup point and vehicle." keys={["transport-students"]} />;
}
export function HostelReport() {
  return <ReportScreen title="Hostel report" hint="Students staying in the hostel, with room and since when." keys={["hostel-students"]} />;
}
export function StudentLogReport() {
  return <ReportScreen title="Student log update" hint="Changes made to student records: who changed what, and when." keys={["student-log"]} />;
}
export function BacklogReport() {
  return <ReportScreen title="Backlog" hint="Finalised papers a student failed (below the pass marks) or missed. Draft marks are not counted." keys={["backlog"]} />;
}
