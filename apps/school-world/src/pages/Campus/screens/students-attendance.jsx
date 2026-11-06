import React, { useEffect, useState } from "react";
import {
  Button, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiDelete, apiGet, apiPost, dateOnly, formObject, lineProblem, rowsOf, useList, useStatus
} from "../kit.jsx";
import { schoolToday } from "../../../school-locale.js";

function SimpleMaster({ title, hint, path, singular, withCode }) {
  const { rows, error, reload } = useList(path);
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const body = { name: values.name };
    if (withCode && values.code) body.code = values.code;
    const { ok } = await run(() => apiPost(path, body), singular + " saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete(path + "/" + id), singular + " removed");
    if (ok) reload();
  }

  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={"Add " + singular.toLowerCase()}>
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          {withCode && <Field label="Code"><input name="code" /></Field>}
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          ...(withCode ? [{ key: "code", label: "Code" }] : []),
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function StudentCategories() {
  return <SimpleMaster title="Student categories" hint="Categories such as General, OBC or Staff ward." path="/v1/categories" singular="Category" withCode />;
}

export function DisableReasons() {
  return <SimpleMaster title="Disable reasons" hint="Reasons offered when a student record is disabled." path="/v1/disable-reasons" singular="Reason" />;
}

export function RollNumbers() {
  const classes = useList("/v1/classes");
  const [classId, setClassId] = useState("");
  const [status, run] = useStatus();
  const sections = classes.rows.find((row) => row.id === classId)?.sections ?? [];

  async function assign(event) {
    event.preventDefault();
    const values = formObject(event);
    await run(() => apiPost("/v1/roll-numbers/assign", {
      class_id: values.classId,
      section_id: values.sectionId,
      start_from: Number(values.startFrom),
      arrangement: values.arrangement,
      sort: values.sort,
    }), (result) => "Updated " + (result?.updated ?? 0) + " rolls");
  }

  return (
    <Screen title="Generate roll numbers" hint="Number a section in order, starting from the roll you choose.">
      <Notice status={{ error: classes.error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={assign}>
          <Field label="Class">
            <select name="classId" value={classId} onChange={(event) => setClassId(event.target.value)} required>
              <option value="">Select class</option>
              {classes.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select name="sectionId" required>
              <option value="">Select section</option>
              {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Starting roll"><input name="startFrom" type="number" min="1" defaultValue="101" required /></Field>
          <Field label="Arrangement">
            <select name="arrangement" defaultValue="mix">
              <option value="mix">Mix</option>
              <option value="boys_first">First boys</option>
              <option value="girls_first">First girls</option>
            </select>
          </Field>
          <Field label="Sort as">
            <select name="sort" defaultValue="last">
              <option value="last">Last name</option>
              <option value="first">First name</option>
              <option value="id">ID</option>
            </select>
          </Field>
          <Button type="submit">Assign rolls</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function BulkUpload() {
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState([]);
  const [issued, setIssued] = useState([]);
  const [busy, setBusy] = useState(false);

  async function upload(event) {
    event.preventDefault();
    setBusy(true);
    setStatus({});
    setErrors([]);
    setIssued([]);
    try {
      // Raw fetch: a failed import returns per-line errors that the shared client would drop.
      const response = await fetch("/api/v1/students/import", { method: "POST", body: new FormData(event.currentTarget), credentials: "same-origin" });
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        setIssued(json.issued ?? []);
        setStatus({ message: "Enrolled " + json.inserted + " students. Enrollment numbers and portal logins were generated. Copy the passwords now; they are emailed when SMTP is set." });
      } else {
        const lineErrors = json.errors ?? [];
        setErrors(lineErrors);
        setStatus({ error: lineErrors.length ? "Nothing was imported. Fix the lines below and upload the file again." : json.message || json.error || "Import failed." });
      }
    } catch (reason) {
      setStatus({ error: reason.message || "Import failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Student bulk upload" hint="CSV must include First Name and Class. Student ID is optional; enrollment numbers such as ENR-2026-0001 are generated. One bad row rolls back the whole file.">
      <Notice status={status} />
      <Panel title="Upload CSV">
        <Form onSubmit={upload}>
          <Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" required /></Field>
          <Button type="submit" disabled={busy}>{busy ? "Importing..." : "Import and enroll"}</Button>
          <a href="/demo-student-bulk-upload.csv">Download demo CSV</a>
        </Form>
      </Panel>
      {errors.length > 0 && (
        <DataTable
          rows={errors}
          rowKey={(row) => row.line}
          columns={[
            { key: "line", label: "Line" },
            { key: "fields", label: "Problem", render: lineProblem },
          ]}
        />
      )}
      {issued.length > 0 && (
        <Panel title="Portal logins (shown once)">
          <DataTable
            rows={issued}
            rowKey={(row) => row.admissionNo}
            columns={[
              { key: "enrollment", label: "Enrollment", render: (row) => row.enrollmentNo ?? row.admissionNo },
              { key: "student", label: "Student login", render: (row) => row.student.username + " / " + row.student.password },
              { key: "parent", label: "Parent login", render: (row) => (row.parent ? row.parent.username + " / " + row.parent.password : "-") },
              { key: "mail", label: "Email", render: (row) => "student " + (row.mail?.student ?? "n/a") + (row.parent ? " · parent " + (row.mail?.parent ?? "n/a") : "") },
            ]}
          />
        </Panel>
      )}
    </Screen>
  );
}

export function LeaveTypes() {
  const { rows, error, reload } = useList("/v1/leave-types");
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/leave-types", { name: values.name, daysYear: Number(values.daysYear || 0) }), "Leave type saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/leave-types/" + id), "Leave type removed");
    if (ok) reload();
  }

  return (
    <Screen title="Leave types" hint="Kinds of leave and the days each person gets per year.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add leave type">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Days per year"><input name="daysYear" type="number" min="0" /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "daysYear", label: "Days per year" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function ApproveLeave() {
  const { rows, error, reload } = useList("/v1/leave-requests");
  const [status, run] = useStatus();

  async function decide(id, action) {
    const { ok } = await run(() => apiPost("/v1/leave-requests/" + id + "/" + action, {}), action === "approve" ? "Leave approved" : "Leave rejected");
    if (ok) reload();
  }

  return (
    <Screen title="Approve leave" hint="Pending leave requests from students and staff.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <DataTable
        rows={rows}
        empty="No leave requests."
        columns={[
          { key: "type", label: "Leave type", render: (row) => row.leaveType?.name || "" },
          { key: "for", label: "For", render: (row) => (row.studentId ? "Student" : row.staffId ? "Staff" : "") },
          { key: "dates", label: "Dates", render: (row) => dateOnly(row.fromDate) + " to " + dateOnly(row.toDate) },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status", render: (row) => <span className={"ck-badge" + (row.status === "pending" ? " ck-badge-warn" : "")}>{row.status}</span> },
          { key: "act", label: "", render: (row) => (row.status === "pending" ? (
            <span style={{ display: "inline-flex", gap: 8 }}>
              <Button onClick={() => decide(row.id, "approve")}>Approve</Button>
              <Button variant="danger" onClick={() => decide(row.id, "reject")}>Reject</Button>
            </span>
          ) : null) },
        ]}
      />
    </Screen>
  );
}

const STAFF_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALFDAY", "LEAVE"];

export function StaffAttendance() {
  const [date, setDate] = useState(() => schoolToday());
  const [rows, setRows] = useState([]);
  const [status, run] = useStatus();

  async function load(event) {
    event?.preventDefault();
    const { ok, result } = await run(() => apiGet("/v1/attendance?book=staff&date=" + date));
    if (ok) setRows(rowsOf(result));
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await run(() => fetchSave(), "Attendance saved");
  }
  function fetchSave() {
    // The server de-duplicates a repeated save through this key.
    return fetch("/api/v1/attendance/day", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        book: "staff",
        date,
        entries: rows.map((row) => ({ staff_id: row.staffId, status: row.status ?? "PRESENT" })),
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Could not save attendance.");
      }
    });
  }
  function setRowStatus(index, value) {
    setRows((current) => current.map((row, at) => (at === index ? { ...row, status: value } : row)));
  }

  return (
    <Screen title="Staff attendance" hint="Mark the day's attendance for every staff member.">
      <Notice status={status} />
      <Panel>
        <Form onSubmit={load}>
          <Field label="Date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Button type="submit">Load</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        empty="No staff to mark for this date."
        rowKey={(row) => row.staffId}
        columns={[
          { key: "employeeId", label: "Employee id" },
          { key: "name", label: "Name" },
          { key: "status", label: "Status", render: (row) => {
            const index = rows.indexOf(row);
            return (
              <select value={row.status ?? "PRESENT"} onChange={(event) => setRowStatus(index, event.target.value)}>
                {STAFF_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            );
          } },
        ]}
      />
      <div><Button onClick={save} disabled={!rows.length}>Save attendance</Button></div>
    </Screen>
  );
}
