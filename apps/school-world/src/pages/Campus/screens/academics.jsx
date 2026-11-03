import React, { useEffect, useMemo, useState } from "react";
import {
  Button, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiDelete, apiGet, apiPost, apiPut, dateOnly, formObject, rowsOf, useList, useStatus
} from "../kit.jsx";

const DOT = " · ";

export function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [status, run] = useStatus();

  async function load() {
    try {
      const json = await apiGet("/v1/academic-years");
      setSessions(rowsOf(json));
      setCurrentId(json?.currentSessionId ?? null);
      setLoadError("");
    } catch (reason) {
      setLoadError(reason.message || "Could not load sessions.");
    }
  }
  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiPost("/v1/academic-years", {
      name: v.name,
      code: v.code,
      sequenceNo: Number(v.sequenceNo || 0),
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
      receiptPrefix: v.receiptPrefix || undefined,
      invoicePrefix: v.invoicePrefix || undefined,
      admissionPrefix: v.admissionPrefix || undefined,
      firstAdmissionNo: v.firstAdmissionNo ? Number(v.firstAdmissionNo) : undefined,
    }), "Session saved");
    if (ok) { form.reset(); load(); }
  }
  async function savePrefixes(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiPost("/v1/session-prefixes", {
      sessionId: v.sessionId,
      receiptPrefix: v.receiptPrefix || undefined,
      invoicePrefix: v.invoicePrefix || undefined,
      admissionPrefix: v.admissionPrefix || undefined,
      firstAdmissionNo: v.firstAdmissionNo ? Number(v.firstAdmissionNo) : undefined,
    }), "Prefixes saved");
    if (ok) load();
  }
  async function activate(id) {
    const { ok } = await run(() => apiPost("/v1/academic-years/" + id + "/set-current", {}), "Session activated");
    if (ok) load();
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/academic-years/" + id), "Session removed");
    if (ok) load();
  }
  async function clearPrefixes(id) {
    const { ok } = await run(() => apiDelete("/v1/session-prefixes/" + id), "Prefixes cleared");
    if (ok) load();
  }

  const isCurrent = (row) => row.id === currentId || row.isCurrent;
  return (
    <Screen title="Sessions" hint="Academic years, the current one, and the number prefixes used for receipts, invoices and admissions.">
      <Notice status={{ error: loadError || status.error, message: status.message }} />
      <Panel title="New session">
        <Form onSubmit={create}>
          <Field label="Name"><input name="name" placeholder="2026-27" required /></Field>
          <Field label="Code"><input name="code" /></Field>
          <Field label="Sequence"><input name="sequenceNo" type="number" defaultValue="0" /></Field>
          <Field label="Start"><input name="startDate" type="date" /></Field>
          <Field label="End"><input name="endDate" type="date" /></Field>
          <Field label="Fee receipt prefix"><input name="receiptPrefix" placeholder="RCP" /></Field>
          <Field label="Invoice prefix"><input name="invoicePrefix" placeholder="INV" /></Field>
          <Field label="Admission form prefix"><input name="admissionPrefix" placeholder="APP" /></Field>
          <Field label="First admission number"><input name="firstAdmissionNo" type="number" min="1" defaultValue="1" /></Field>
          <Button type="submit">Add session</Button>
        </Form>
      </Panel>
      <DataTable
        rows={sessions}
        empty="No sessions yet."
        columns={[
          { key: "name", label: "Session", render: (row) => <>{row.name} {isCurrent(row) && <span className="ck-badge">Current</span>}</> },
          { key: "receiptPrefix", label: "Receipt", render: (row) => row.receiptPrefix || "-" },
          { key: "invoicePrefix", label: "Invoice", render: (row) => row.invoicePrefix || "-" },
          { key: "admissionPrefix", label: "Admission", render: (row) => (row.admissionPrefix ? row.admissionPrefix + "-" + (row.firstAdmissionNo ?? 1) : "-") },
          { key: "act", label: "", render: (row) => (
            <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              {!isCurrent(row) && <Button variant="ghost" onClick={() => activate(row.id)}>Activate</Button>}
              {(row.receiptPrefix || row.invoicePrefix || row.admissionPrefix) && <Button variant="ghost" onClick={() => clearPrefixes(row.id)}>Clear prefixes</Button>}
              <RemoveButton onRemove={() => remove(row.id)} />
            </span>
          ) },
        ]}
      />
      <Panel title="Year prefixes">
        <Form onSubmit={savePrefixes}>
          <Field label="Session">
            <select name="sessionId" required defaultValue="">
              <option value="" disabled>Select session</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Fee receipt prefix"><input name="receiptPrefix" /></Field>
          <Field label="Invoice prefix"><input name="invoicePrefix" /></Field>
          <Field label="Admission form prefix"><input name="admissionPrefix" /></Field>
          <Field label="First admission no"><input name="firstAdmissionNo" type="number" min="1" /></Field>
          <Button type="submit">Save prefixes</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function Departments() {
  const { rows, error, reload } = useList("/v1/departments");
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiPost("/v1/departments", { name: v.name, code: v.code }), "Department saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/departments/" + id), "Department removed");
    if (ok) reload();
  }

  return (
    <Screen title="Departments" hint="Academic departments that programs belong to.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add department">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Code"><input name="code" /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function Programs() {
  const departments = useList("/v1/departments");
  const programs = useList("/v1/programs");
  const [status, run] = useStatus();
  const deptName = new Map(departments.rows.map((row) => [row.id, row.name]));

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiPost("/v1/programs", { departmentId: v.departmentId, name: v.name }), "Program saved");
    if (ok) { form.reset(); programs.reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/programs/" + id), "Program removed");
    if (ok) programs.reload();
  }

  return (
    <Screen title="Programs" hint="Courses offered under each department.">
      <Notice status={{ error: departments.error || programs.error || status.error, message: status.message }} />
      <Panel title="Add program">
        <Form onSubmit={add}>
          <Field label="Department">
            <select name="departmentId" required>{departments.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Field label="Program name"><input name="name" placeholder="B.Com" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={programs.rows}
        columns={[
          { key: "name", label: "Program" },
          { key: "department", label: "Department", render: (row) => deptName.get(row.departmentId) || "" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function Sections() {
  const { rows, error, reload } = useList("/v1/classes");
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiPost("/v1/sections", { classId: v.classId, name: v.name }), "Section saved");
    if (ok) { form.reset(); reload(); }
  }

  return (
    <Screen title="Sections" hint="Divisions inside each class, such as A, B or C.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add section">
        <Form onSubmit={add}>
          <Field label="Class">
            <select name="classId" required>{rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Field label="Section name"><input name="name" placeholder="A" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Class" },
          { key: "sections", label: "Sections", render: (row) => (row.sections || []).map((item) => item.name).join(", ") || "-" },
        ]}
      />
    </Screen>
  );
}

export function ClassTeachers() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [status, run] = useStatus();

  async function load() {
    try {
      const json = await apiGet("/v1/class-teachers");
      setRows(json?.data ?? []);
      setStaff(json?.staff ?? []);
      setLoadError("");
    } catch (reason) {
      setLoadError(reason.message || "Could not load class teachers.");
    }
  }
  useEffect(() => { load(); }, []);

  async function assign(sectionId, value) {
    const { ok, result } = await run(() => apiPost("/v1/class-teachers", { sectionId, staffId: value || null }), "Class teacher saved");
    if (ok && result?.data) { setRows(result.data); if (result.staff) setStaff(result.staff); }
  }
  async function clear(sectionId) {
    const { ok } = await run(() => apiDelete("/v1/class-teachers/" + sectionId), "Class teacher removed");
    if (ok) load();
  }

  return (
    <Screen title="Class teachers" hint="One teacher per section. Names come from campus staff.">
      <Notice status={{ error: loadError || status.error, message: status.message }} />
      <DataTable
        rows={rows}
        empty="No sections yet. Add classes and sections first."
        rowKey={(row) => row.sectionId}
        columns={[
          { key: "class", label: "Class and section", render: (row) => row.className + DOT + row.sectionName },
          { key: "teacher", label: "Class teacher", render: (row) => (
            <select value={row.staffId ?? ""} onChange={(event) => assign(row.sectionId, event.target.value)} aria-label={"Teacher for " + row.className + " " + row.sectionName}>
              <option value="">Not assigned</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {[person.firstName, person.lastName].filter(Boolean).join(" ") + (person.employeeId ? DOT + person.employeeId : "")}
                </option>
              ))}
            </select>
          ) },
          { key: "act", label: "", render: (row) => (row.staffId ? <RemoveButton onRemove={() => clear(row.sectionId)} /> : null) },
        ]}
      />
    </Screen>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkingDays() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  });
  const [days, setDays] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [status, run] = useStatus();

  async function load(target = month) {
    const [year, monthNo] = target.split("-").map(Number);
    const last = new Date(year, monthNo, 0).getDate();
    try {
      const json = await apiGet("/v1/working-days?from=" + target + "-01&to=" + target + "-" + String(last).padStart(2, "0"));
      setDays(rowsOf(json));
      setLoadError("");
    } catch (reason) {
      setLoadError(reason.message || "Could not load the calendar.");
    }
  }
  useEffect(() => { if (month) load(month); }, [month]);

  const byDate = useMemo(() => new Map(days.map((row) => [dateOnly(row.date), row])), [days]);
  const cells = useMemo(() => {
    if (!month) return [];
    const [year, monthNo] = month.split("-").map(Number);
    const last = new Date(year, monthNo, 0).getDate();
    return Array.from({ length: last }, (_, index) => {
      const date = month + "-" + String(index + 1).padStart(2, "0");
      return { date, day: index + 1, weekday: new Date(date + "T00:00:00").getDay() };
    });
  }, [month]);

  async function toggle(cell) {
    const holiday = byDate.get(cell.date) ? !byDate.get(cell.date).isWorking : false;
    const { ok } = await run(
      () => apiPut("/v1/working-days", { date: cell.date, isWorking: holiday, note: holiday ? null : "Holiday" }),
      holiday ? "Marked working day" : "Marked holiday"
    );
    if (ok) load();
  }

  return (
    <Screen title="Working days" hint="Click a date to mark it a holiday, or click a holiday to make it a working day again.">
      <Notice status={{ error: loadError || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Month"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field>
        </Form>
      </Panel>
      <Panel>
        <div className="ck-cal">
          {WEEKDAYS.map((name) => <div key={name} className="ck-cal-head">{name}</div>)}
          {cells[0] && Array.from({ length: cells[0].weekday }).map((_, index) => <div key={"pad" + index} />)}
          {cells.map((cell) => {
            const row = byDate.get(cell.date);
            const holiday = row ? !row.isWorking : false;
            return (
              <button key={cell.date} type="button" className={"ck-cal-day" + (holiday ? " ck-cal-holiday" : "")} onClick={() => toggle(cell)} aria-pressed={holiday} title={holiday ? "Holiday" : "Working day"}>
                {cell.day}
              </button>
            );
          })}
        </div>
      </Panel>
    </Screen>
  );
}
