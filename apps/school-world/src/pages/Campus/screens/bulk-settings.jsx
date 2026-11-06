import React, { useEffect, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Row, Screen,
  apiCall, formObject, lineProblem, plural, rowsOf, staffName, uploadForm, useLoad, useStatus
} from "../kit.jsx";
import { MessageLog, SmsTemplates } from "./comms-front-office.jsx";
import { formatMoney } from "../../../school-locale.js";

/* =============================================================== helpers */

/** Class + section filter used by the student bulk screens. */
function ClassSection({ classes, value, onChange, required }) {
  const sections = classes.find((c) => c.id === value.classId)?.sections || [];
  return (
    <>
      <Field label="Class"><select required={required} value={value.classId} onChange={(e) => onChange({ classId: e.target.value, sectionId: "" })}><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Section"><select value={value.sectionId} onChange={(e) => onChange({ ...value, sectionId: e.target.value })} disabled={!value.classId}><option value="">All sections</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    </>
  );
}

/** Every active student of a class / section (the list API pages at 100). */
async function loadStudents({ classId, sectionId }) {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const json = await apiCall("GET", "/v1/students?" + new URLSearchParams({ classId, ...(sectionId ? { sectionId } : {}), pageSize: "100", page: String(page) }));
    out.push(...rowsOf(json));
    if (out.length >= (json.total ?? 0) || !rowsOf(json).length) break;
  }
  return out;
}

/** Runs one request per item, one at a time, and reports each failure by name. */
async function eachInTurn(items, task) {
  const failed = [];
  let done = 0;
  for (const item of items) {
    try { await task(item); done++; } catch (reason) { failed.push({ item, message: reason.message }); }
  }
  return { done, failed };
}

const inputStyle = { width: "100%", minWidth: 110 };

/* ======================================================= Student bulk update */

const STUDENT_FIELDS = [
  { key: "mobile", label: "Mobile" },
  { key: "gender", label: "Gender", options: ["MALE", "FEMALE", "OTHER"] },
  { key: "enrollmentNo", label: "Enrollment no" },
  { key: "scholarNo", label: "Scholar no" },
  { key: "pen", label: "PEN" },
  { key: "apaarId", label: "APAAR ID" },
  { key: "rfid", label: "RFID" },
  { key: "fatherName", label: "Father's name" },
  { key: "motherName", label: "Mother's name" },
];

export function StudentBulkUpdate() {
  const { data, error } = useLoad(["/v1/classes"]);
  const classes = rowsOf(data["/v1/classes"]);
  const [pick, setPick] = useState({ classId: "", sectionId: "" });
  const [rows, setRows] = useState(null);
  const [edits, setEdits] = useState({});
  const [status, run] = useStatus();
  // quiet: refresh after a save without replacing the save message.
  async function load(event, quiet) {
    event?.preventDefault();
    setEdits({});
    if (quiet) { try { setRows(await loadStudents(pick)); } catch { /* the save message already says what happened */ } return; }
    const { ok, result } = await run(() => loadStudents(pick), (list) => plural(list.length, "student") + " loaded");
    setRows(ok ? result : null);
  }
  const set = (id, key, value) => setEdits((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));
  const changedRows = rows ? rows.filter((r) => Object.entries(edits[r.id] || {}).some(([k, v]) => (v ?? "") !== (r[k] ?? ""))) : [];
  async function save() {
    const { ok } = await run(() => eachInTurn(changedRows, (r) => {
      const body = {};
      for (const [k, v] of Object.entries(edits[r.id])) if ((v ?? "") !== (r[k] ?? "")) body[k] = v.trim ? v.trim() : v;
      if (body.gender === "") delete body.gender;
      return apiCall("PATCH", "/v1/students/" + r.id, body);
    }).then((outcome) => { if (outcome.failed.length) throw new Error(plural(outcome.done, "student") + " saved. Not saved: " + outcome.failed.map((f) => f.item.admissionNo + " (" + f.message + ")").join("; ")); return outcome; }),
    (outcome) => plural(outcome.done, "student") + " saved");
    if (ok) load(null, true);
  }
  return (
    <Screen title="Student bulk update" hint="Edit details of a whole class at once, then save only the rows you changed. Roll numbers have their own screen (Generate Roll Number), and status changes go through Disable / Enable.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={load}><ClassSection classes={classes} value={pick} onChange={setPick} required /><Button type="submit">Load students</Button></Form>
      </Panel>
      {rows && (
        <Panel title={plural(rows.length, "student")} actions={<Button onClick={save} disabled={!changedRows.length}>Save {plural(changedRows.length, "change")}</Button>}>
          <DataTable rows={rows} empty="No active students in this class." columns={[
            { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Name" },
            ...STUDENT_FIELDS.map((f) => ({ key: f.key, label: f.label, render: (r) => {
              const value = edits[r.id]?.[f.key] ?? r[f.key] ?? "";
              return f.options
                ? <select aria-label={f.label} value={value} onChange={(e) => set(r.id, f.key, e.target.value)}><option value="">-</option>{f.options.map((o) => <option key={o} value={o}>{o[0] + o.slice(1).toLowerCase()}</option>)}</select>
                : <input aria-label={f.label + " for " + r.name} style={inputStyle} value={value} maxLength={120} onChange={(e) => set(r.id, f.key, e.target.value)} />;
            } })),
          ]} />
        </Panel>
      )}
    </Screen>
  );
}

/* =================================================== Student bulk "delete" */

export function StudentBulkDisable() {
  const { data, error } = useLoad(["/v1/classes", "/v1/disable-reasons"]);
  const classes = rowsOf(data["/v1/classes"]);
  const reasons = rowsOf(data["/v1/disable-reasons"]);
  const [pick, setPick] = useState({ classId: "", sectionId: "" });
  const [rows, setRows] = useState(null);
  const [chosen, setChosen] = useState(new Set());
  const [reasonId, setReasonId] = useState("");
  const [status, run] = useStatus();
  async function load(event, quiet) {
    event?.preventDefault();
    setChosen(new Set());
    if (quiet) { try { setRows(await loadStudents(pick)); } catch { /* keep the result message */ } return; }
    const { ok, result } = await run(() => loadStudents(pick), (list) => plural(list.length, "student") + " loaded");
    setRows(ok ? result : null);
  }
  const toggle = (id) => setChosen((set) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  async function disable() {
    const picked = rows.filter((r) => chosen.has(r.id));
    if (!window.confirm("Disable " + plural(picked.length, "student") + "? They leave every class list, but their fees, marks and attendance are kept and they can be enabled again from Disabled Students.")) return;
    await run(() => eachInTurn(picked, (r) => apiCall("POST", "/v1/students/" + r.id + "/disable", { reasonId })).then((o) => {
      if (o.failed.length) throw new Error(plural(o.done, "student") + " disabled. Not disabled: " + o.failed.map((f) => f.item.admissionNo + " (" + f.message + ")").join("; "));
      return o;
    }), (o) => plural(o.done, "student") + " disabled");
    load(null, true);
  }
  return (
    <Screen title="Bulk delete" hint="Removes students from the active lists by disabling them. Records are not erased, so fee receipts, marks and attendance history stay correct; enable a student again from Disabled Students.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={load}><ClassSection classes={classes} value={pick} onChange={setPick} required /><Button type="submit">Load students</Button></Form>
      </Panel>
      {rows && (
        <Panel title={plural(chosen.size, "student") + " selected"} actions={(
          <Row>
            <select aria-label="Reason" value={reasonId} onChange={(e) => setReasonId(e.target.value)}><option value="">{reasons.length ? "Reason" : "Add disable reasons first"}</option>{reasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <Button variant="danger" onClick={disable} disabled={!chosen.size || !reasonId}>Disable selected</Button>
          </Row>
        )}>
          <Row><Button variant="ghost" onClick={() => setChosen(new Set(rows.map((r) => r.id)))}>Select all</Button><Button variant="ghost" onClick={() => setChosen(new Set())}>Clear</Button></Row>
          <DataTable rows={rows} empty="No active students in this class." columns={[
            { key: "pick", label: "", render: (r) => <input type="checkbox" aria-label={"Select " + r.name} checked={chosen.has(r.id)} onChange={() => toggle(r.id)} /> },
            { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Name" }, { key: "section", label: "Section", render: (r) => r.section || "-" },
          ]} />
        </Panel>
      )}
    </Screen>
  );
}

/* ========================================================= Staff bulk update */

export function StaffBulkUpdate() {
  const { data, error, reload } = useLoad(["/v1/staff", "/v1/departments", "/v1/designations"]);
  const staff = rowsOf(data["/v1/staff"]);
  const departments = rowsOf(data["/v1/departments"]);
  const designations = rowsOf(data["/v1/designations"]);
  const [edits, setEdits] = useState({});
  const [status, run] = useStatus();
  const set = (id, key, value) => setEdits((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));
  const value = (r, k) => edits[r.id]?.[k] ?? r[k] ?? "";
  const changed = staff.filter((r) => Object.entries(edits[r.id] || {}).some(([k, v]) => v !== (r[k] ?? "")));
  async function save() {
    const bad = changed.find((r) => !String(value(r, "firstName")).trim() || (value(r, "email") && !/^\S+@\S+\.\S+$/.test(value(r, "email"))));
    if (bad) { run(() => Promise.reject(new Error(staffName(bad) + ": first name is required and the email must be valid."))); return; }
    await run(() => eachInTurn(changed, (r) => {
      const body = {};
      for (const [k, v] of Object.entries(edits[r.id])) {
        if (v === (r[k] ?? "")) continue;
        if (k === "departmentId" || k === "designationId") body[k] = v || null;
        else if (k === "email" && !v) continue; // the API cannot clear an email; leave it as it was
        else body[k] = String(v).trim();
      }
      return Object.keys(body).length ? apiCall("PATCH", "/v1/staff/" + r.id, body) : Promise.resolve();
    }).then((o) => { if (o.failed.length) throw new Error(plural(o.done, "staff record") + " saved. Not saved: " + o.failed.map((f) => staffName(f.item) + " (" + f.message + ")").join("; ")); return o; }),
    (o) => plural(o.done, "staff record") + " saved");
    setEdits({});
    reload();
  }
  const text = (k, label) => ({ key: k, label, render: (r) => <input aria-label={label + " for " + staffName(r)} style={inputStyle} value={value(r, k)} maxLength={120} onChange={(e) => set(r.id, k, e.target.value)} /> });
  const pick = (k, label, list) => ({ key: k, label, render: (r) => <select aria-label={label} value={value(r, k)} onChange={(e) => set(r.id, k, e.target.value)}><option value="">None</option>{list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select> });
  return (
    <Screen title="Staff bulk update" hint="Edit active staff in one table and save only the rows you changed. An email can be changed here but not removed.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={plural(staff.length, "staff member")} actions={<Button onClick={save} disabled={!changed.length}>Save {plural(changed.length, "change")}</Button>}>
        <DataTable rows={staff} empty="No active staff." columns={[
          { key: "employeeId", label: "Employee ID", render: (r) => r.employeeId || "-" },
          text("firstName", "First name"), text("lastName", "Last name"), text("phone", "Phone"), text("email", "Email"),
          pick("departmentId", "Department", departments), pick("designationId", "Designation", designations),
        ]} />
      </Panel>
    </Screen>
  );
}

/* ========================================================= Fee receipt import */

export function FeeReceiptImport() {
  const [status, run] = useStatus();
  const [report, setReport] = useState(null);
  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.file.files[0];
    if (!file) return;
    if (!window.confirm("Record every payment in " + file.name + "? Each line becomes a fee receipt.")) return;
    const fd = new FormData();
    fd.append("file", file);
    const { ok } = await run(async () => {
      const { ok: good, json } = await uploadForm("/v1/fees/import", fd);
      if (!good) throw new Error(lineProblem(json) || json.message || json.error || "Import failed.");
      setReport(json);
      return json;
    }, (json) => plural(json.paid ?? 0, "payment") + " recorded out of " + plural(json.total ?? 0, "line"));
    if (ok) form.reset();
  }
  return (
    <Screen title="Fee receipt import" hint="Record payments received elsewhere (bank, offline counter) from a CSV file. Columns: admissionNo, invoiceId, amount, and optionally method and paidAt (YYYY-MM-DD).">
      <Notice status={status} />
      <Panel>
        <Form onSubmit={upload}>
          <Field label="CSV file" wide><input name="file" type="file" accept=".csv,text/csv" required /></Field>
          <Button type="submit">Import receipts</Button>
        </Form>
        <p>Example line: <code>A-1001,clx123invoice,2500,UPI,2026-08-14</code>. Find invoice IDs on the student's fee page.</p>
      </Panel>
      {report?.errors?.length > 0 && (
        <Panel title={plural(report.errors.length, "line") + " not imported"}>
          <DataTable rows={report.errors} rowKey={(r, i) => i} columns={[{ key: "line", label: "Line" }, { key: "message", label: "Problem" }]} />
        </Panel>
      )}
    </Screen>
  );
}

/* ===================================================== Login credentials send */

export function LoginCredentialsSend() {
  const { data, error } = useLoad(["/v1/classes", "/v1/message-channels"]);
  const classes = rowsOf(data["/v1/classes"]);
  const channels = data["/v1/message-channels"];
  const [pick, setPick] = useState({ classId: "", sectionId: "" });
  const [rows, setRows] = useState(null);
  const [chosen, setChosen] = useState(new Set());
  const [portals, setPortals] = useState({ student: true, parent: false });
  const [result, setResult] = useState(null);
  const [status, run] = useStatus();
  async function load(event) {
    event?.preventDefault();
    setChosen(new Set());
    setResult(null);
    const { ok, result: list } = await run(() => loadStudents(pick), (list) => plural(list.length, "student") + " loaded");
    setRows(ok ? list : null);
  }
  async function send() {
    const list = [...chosen];
    const kinds = Object.keys(portals).filter((k) => portals[k]);
    if (!window.confirm("Send new passwords to " + plural(list.length, "student") + " (" + kinds.join(" and ") + " logins)? Their current passwords stop working once the email is delivered.")) return;
    const out = { sent: 0, skipped: 0, failed: 0, results: [] };
    const { ok } = await run(async () => {
      for (let i = 0; i < list.length; i += 200) {
        const part = await apiCall("POST", "/v1/students/send-logins", { studentIds: list.slice(i, i + 200), portals: kinds });
        out.sent += part.sent; out.skipped += part.skipped; out.failed += part.failed; out.results.push(...part.results);
      }
      return out;
    }, (o) => plural(o.sent, "email") + " sent" + (o.skipped ? ", " + o.skipped + " skipped" : "") + (o.failed ? ", " + o.failed + " not delivered" : ""));
    if (ok) setResult(out);
  }
  const toggle = (id) => setChosen((set) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <Screen title="Login credentials send" hint="Emails students or parents a new temporary password for their portal login. Passwords are stored scrambled, so the old one cannot be resent; a password only changes once its email is delivered.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {channels && !channels.email && <p className="ck-notice ck-notice-error">Email is not set up, so nothing can be sent. Add the mail server under Email Setting first.</p>}
      <Panel>
        <Form onSubmit={load}><ClassSection classes={classes} value={pick} onChange={setPick} required /><Button type="submit">Load students</Button></Form>
      </Panel>
      {rows && (
        <Panel title={plural(chosen.size, "student") + " selected"} actions={(
          <Row>
            <Check label="Student login" checked={portals.student} onChange={(e) => setPortals((p) => ({ ...p, student: e.target.checked }))} />
            <Check label="Parent login" checked={portals.parent} onChange={(e) => setPortals((p) => ({ ...p, parent: e.target.checked }))} />
            <Button onClick={send} disabled={!chosen.size || (!portals.student && !portals.parent) || !channels?.email}>Send</Button>
          </Row>
        )}>
          <Row><Button variant="ghost" onClick={() => setChosen(new Set(rows.map((r) => r.id)))}>Select all</Button><Button variant="ghost" onClick={() => setChosen(new Set())}>Clear</Button></Row>
          <DataTable rows={rows} empty="No active students in this class." columns={[
            { key: "pick", label: "", render: (r) => <input type="checkbox" aria-label={"Select " + r.name} checked={chosen.has(r.id)} onChange={() => toggle(r.id)} /> },
            { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Name" },
            { key: "login", label: "Student login", render: (r) => (r.studentLoginEnabled ? "Yes" : "None yet") },
          ]} />
        </Panel>
      )}
      {result && (
        <Panel title="Result">
          <DataTable rows={result.results} rowKey={(r, i) => i} columns={[
            { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Name" }, { key: "portal", label: "Login", render: (r) => (r.portal === "parent" ? "Parent" : "Student") },
            { key: "to", label: "Email", render: (r) => r.to || "-" }, { key: "status", label: "Result", render: (r) => (r.status === "sent" ? "Sent" : (r.status === "failed" ? "Not delivered" : "Skipped") + (r.reason ? ": " + r.reason : "")) },
          ]} />
        </Panel>
      )}
    </Screen>
  );
}

/* ============================================================ Specializations */

export function Specializations() {
  const { data, error, reload, loaded } = useLoad(["/v1/specializations", "/v1/programs"]);
  const rows = rowsOf(data["/v1/specializations"]);
  const programs = rowsOf(data["/v1/programs"]);
  const [editing, setEditing] = useState(null);
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/specializations", { programId: v.programId, name: v.name.trim() }), "Specialization saved");
    if (ok) { form.reset(); reload(); }
  }
  async function rename(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiCall("PATCH", "/v1/specializations/" + editing.id, { name: v.name.trim() }), "Specialization renamed");
    if (ok) { setEditing(null); reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/specializations/" + row.id), "Specialization removed");
    if (ok) reload();
  }
  return (
    <Screen title="Specialization" hint="Majors and minors offered within a program. Assign them to sections under Assign Major/Minor.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={editing ? "Rename " + editing.name : "Add specialization"}>
        {editing ? (
          <Form onSubmit={rename} key={editing.id}>
            <Field label="Name"><input name="name" required maxLength={120} defaultValue={editing.name} /></Field>
            <Row><Button type="submit">Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></Row>
          </Form>
        ) : (
          <Form onSubmit={add}>
            <Field label="Program"><select name="programId" required defaultValue=""><option value="" disabled>{programs.length ? "Select program" : "Add a program first"}</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Specialization"><input name="name" required maxLength={120} placeholder="Economics" /></Field>
            <Button type="submit">Add</Button>
          </Form>
        )}
      </Panel>
      <DataTable rows={rows} empty={loaded ? "No specializations yet." : "Loading…"} columns={[
        { key: "program", label: "Program" }, { key: "name", label: "Specialization" }, { key: "sections", label: "Sections" },
        { key: "act", label: "", render: (r) => <Row><Button variant="ghost" onClick={() => setEditing(r)}>Rename</Button>{r.sections ? null : <RemoveButton onRemove={() => remove(r)} />}</Row> },
      ]} />
    </Screen>
  );
}

export function AssignSpecialization() {
  const { data, error, reload } = useLoad(["/v1/classes", "/v1/specializations"]);
  const classes = rowsOf(data["/v1/classes"]);
  const specs = rowsOf(data["/v1/specializations"]);
  const [status, run] = useStatus();
  const rows = classes.flatMap((c) => (c.sections || []).map((s) => ({ ...s, className: c.name, programId: c.programId, programName: c.program?.name })));
  async function assign(section, specializationId) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/sections/" + section.id, { specializationId: specializationId || null }), section.className + " " + section.name + (specializationId ? " assigned" : " cleared"));
    if (ok) reload();
  }
  return (
    <Screen title="Assign major / minor" hint="Give each section the specialization it follows. Only specializations of the section's own program are offered.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <DataTable rows={rows} empty="No sections yet." columns={[
        { key: "className", label: "Class" }, { key: "name", label: "Section" }, { key: "programName", label: "Program", render: (r) => r.programName || "-" },
        { key: "spec", label: "Specialization", render: (r) => {
          const mine = specs.filter((s) => s.programId === r.programId);
          return <select aria-label={"Specialization for " + r.className + " " + r.name} value={r.specializationId || ""} onChange={(e) => assign(r, e.target.value)} disabled={!mine.length && !r.specializationId}>
            <option value="">{mine.length ? "None" : "No specializations for this program"}</option>{mine.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>;
        } },
      ]} />
    </Screen>
  );
}

/* ======================================================= Marksheet templates */

export function MarksheetTemplates() {
  const { data, error, reload, loaded } = useLoad(["/v1/report-templates", "/v1/classes"]);
  const templates = rowsOf(data["/v1/report-templates"]);
  const assigns = data["/v1/report-templates"]?.assigns || [];
  const classes = rowsOf(data["/v1/classes"]);
  const sections = classes.flatMap((c) => (c.sections || []).map((s) => ({ id: s.id, label: c.name + " " + s.name })));
  const [editing, setEditing] = useState(null);
  const [status, run] = useStatus();
  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const body = { name: v.name.trim(), body: v.body };
    const { ok } = await run(() => (editing ? apiCall("PATCH", "/v1/report-templates/" + editing.id, body) : apiCall("POST", "/v1/report-templates", body)), editing ? "Format updated" : "Format saved");
    if (ok) { form.reset(); setEditing(null); reload(); }
  }
  async function assign(sectionId, templateId) {
    const { ok } = await run(() => apiCall("POST", "/v1/report-templates", { sectionId, templateId }), "Format assigned");
    if (ok) reload();
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/report-templates/" + row.id), "Format removed");
    if (ok) reload();
  }
  return (
    <Screen title="Design marksheet" hint="Marksheet formats and which section uses which. Note: the printed marksheet PDF still uses the standard layout; these formats are stored and assigned for when custom printing is switched on.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={editing ? "Edit " + editing.name : "New format"}>
        <Form onSubmit={save} key={editing?.id || "new"}>
          <Field label="Format name"><input name="name" required maxLength={120} defaultValue={editing?.name || ""} /></Field>
          <Field label="Layout" wide><textarea name="body" required rows={8} defaultValue={editing?.body || ""} style={{ height: "auto", padding: 10 }} placeholder={"{{name}} · {{admissionNo}}\n{{class}} {{section}}"} /></Field>
          <Row><Button type="submit">Save format</Button>{editing && <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>}</Row>
        </Form>
      </Panel>
      <Panel title={plural(templates.length, "format")}>
        <DataTable rows={templates} empty={loaded ? "No formats yet." : "Loading…"} columns={[
          { key: "name", label: "Format" }, { key: "used", label: "Sections", render: (t) => assigns.filter((a) => a.templateId === t.id).length },
          { key: "act", label: "", render: (t) => <Row><Button variant="ghost" onClick={() => setEditing(t)}>Edit</Button><RemoveButton onRemove={() => remove(t)} /></Row> },
        ]} />
      </Panel>
      <Panel title="Format per section">
        <DataTable rows={sections} empty="No sections yet." columns={[
          { key: "label", label: "Section" },
          { key: "t", label: "Format", render: (s) => (
            <select aria-label={"Format for " + s.label} value={assigns.find((a) => a.sectionId === s.id)?.templateId || ""} onChange={(e) => e.target.value && assign(s.id, e.target.value)} disabled={!templates.length}>
              <option value="">{templates.length ? "Standard" : "Add a format first"}</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ================================================================ Multi branch */

const branchError = (error) => (/platform admin/i.test(error || "") ? "Only platform administrators can see and manage campuses. Ask your platform administrator for access." : error);

export function Branches() {
  const { data, error: rawError, reload, loaded } = useLoad(["/v1/branches"]);
  const error = branchError(rawError);
  const rows = rowsOf(data["/v1/branches"]);
  const active = data["/v1/branches"]?.activeCampusId;
  const [editing, setEditing] = useState(null);
  const [issued, setIssued] = useState(null);
  const [status, run] = useStatus();
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok, result } = await run(() => apiCall("POST", "/v1/branches", { name: v.name.trim(), code: v.code.trim().toUpperCase(), adminUsername: v.adminUsername.trim() || "admin", demoUsers: v.demoUsers === "on" }), (j) => "Campus " + j.code + " created");
    if (ok) { setIssued(result); form.reset(); reload(); }
  }
  async function patch(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiCall("PATCH", "/v1/branches/" + editing.id, { name: v.name.trim(), address: v.address, phone: v.phone, email: v.email, logo: v.logo }), "Campus saved");
    if (ok) { setEditing(null); reload(); }
  }
  async function switchTo(row) {
    if (!window.confirm("Work in " + row.name + "? Every screen will show that campus's records until you switch back.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/auth/switch-campus", { campusId: row.id }), "Switched to " + row.name);
    if (ok) window.location.reload();
  }
  if (loaded === false && !error) return <Screen title="Multi branch"><p>Loading…</p></Screen>;
  return (
    <Screen title="Multi branch" hint="Campuses in your organisation. Only platform administrators can add or switch campuses.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {issued && <p className="ck-notice ck-notice-ok">First login for {issued.code}: {issued.adminUsername} / {issued.adminPassword}. Save this password now; it is shown only once.</p>}
      {!error && (
        <Panel title={editing ? "Edit " + editing.name : "Add campus"}>
          {editing ? (
            <Form onSubmit={patch} key={editing.id}>
              <Field label="Name"><input name="name" required defaultValue={editing.name} /></Field>
              <Field label="Address" wide><input name="address" defaultValue={editing.address || ""} /></Field>
              <Field label="Phone"><input name="phone" defaultValue={editing.phone || ""} /></Field>
              <Field label="Email"><input name="email" type="email" defaultValue={editing.email || ""} /></Field>
              <Field label="Logo link"><input name="logo" type="url" defaultValue={editing.logo || ""} /></Field>
              <Row><Button type="submit">Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></Row>
            </Form>
          ) : (
            <Form onSubmit={create}>
              <Field label="Campus name"><input name="name" required minLength={2} placeholder="West Campus" /></Field>
              <Field label="Campus code"><input name="code" required minLength={2} placeholder="WEST" /></Field>
              <Field label="First admin username"><input name="adminUsername" placeholder="admin" /></Field>
              <Check name="demoUsers" label="Add demo teacher, student and parent" />
              <Button type="submit">Add campus</Button>
            </Form>
          )}
        </Panel>
      )}
      <BranchTable rows={rows} active={active} onEdit={setEditing} onSwitch={switchTo} />
    </Screen>
  );
}

function BranchTable({ rows, active, onEdit, onSwitch }) {
  return (
    <DataTable rows={rows} empty="No campuses to show." columns={[
      { key: "name", label: "Campus", render: (r) => r.name + (r.id === active ? " (current)" : "") }, { key: "code", label: "Code", render: (r) => r.code || "-" },
      { key: "studentCount", label: "Students" }, { key: "staffCount", label: "Staff" },
      { key: "feeDue", label: "Fee due", render: (r) => formatMoney(Number(r.feeDue || 0), { maximumFractionDigits: 2 }) },
      ...(onEdit ? [{ key: "act", label: "", render: (r) => <Row><Button variant="ghost" onClick={() => onEdit(r)}>Edit</Button>{r.id !== active && <Button variant="ghost" onClick={() => onSwitch(r)}>Work in this campus</Button>}</Row> }] : []),
    ]} />
  );
}

export function BranchReport() {
  const { data, error: rawError, loaded } = useLoad(["/v1/branches"]);
  const error = branchError(rawError);
  const rows = rowsOf(data["/v1/branches"]);
  const sum = (k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  return (
    <Screen title="Multi branch report" hint="Students, staff and fees due in every campus.">
      <Notice status={{ error }} />
      <BranchTable rows={rows} active={data["/v1/branches"]?.activeCampusId} />
      {loaded && rows.length > 1 && <Panel title="All campuses"><p>{plural(sum("studentCount"), "student")} · {plural(sum("staffCount"), "staff member")} · {formatMoney(sum("feeDue"), {})} due</p></Panel>}
    </Screen>
  );
}

/* ============================================================ Backup / restore */

const CONFIRM = "RESTORE ALL CAMPUSES";

export function BackupRestore() {
  const { data, error, reload } = useLoad(["/v1/backup"]);
  const info = data["/v1/backup"];
  const dumps = info?.dumps || [];
  const [typed, setTyped] = useState("");
  const [status, run] = useStatus();
  function download() {
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campus-snapshot-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function dump() {
    const { ok } = await run(() => apiCall("POST", "/v1/backup"), (j) => "Backup " + (j.dump?.name || "") + " written");
    if (ok) reload();
  }
  async function restore(name) {
    if (typed !== CONFIRM) { run(() => Promise.reject(new Error("Type " + CONFIRM + " in the box first."))); return; }
    if (!window.confirm("Restore " + name + "? This replaces the data of EVERY campus with the backup. Anything entered since then is lost.")) return;
    await run(() => apiCall("POST", "/v1/backup/restore", { name, confirm: CONFIRM }), "Restored " + name + ". Sign in again if you are signed out.");
    setTyped("");
  }
  return (
    <Screen title="Backup / restore" hint="Make a full database backup, download a summary snapshot, or restore a backup. Restoring replaces every campus, not just this one.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Row><Button onClick={dump}>Make backup now</Button><Button variant="ghost" onClick={download} disabled={!info}>Download snapshot</Button></Row>
        {info?.counts && <p>{Object.entries(info.counts).map(([k, v]) => v + " " + k).join(" · ")}</p>}
      </Panel>
      <Panel title={plural(dumps.length, "backup")}>
        <Field label={"Type " + CONFIRM + " to enable restore"} wide><input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
        <DataTable rows={dumps} rowKey={(d) => d.name} empty="No backups yet." columns={[
          { key: "name", label: "Backup" }, { key: "createdAt", label: "Made", render: (d) => new Date(d.createdAt).toLocaleString() },
          { key: "bytes", label: "Size", render: (d) => (Number(d.bytes) / 1048576).toFixed(1) + " MB" },
          { key: "act", label: "", render: (d) => <Button variant="danger" onClick={() => restore(d.name)} disabled={typed !== CONFIRM}>Restore</Button> },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ============================================================ Front CMS setting */

export function FrontCmsSetting() {
  const { data, error, reload, loaded } = useLoad(["/v1/website"]);
  const site = data["/v1/website"] || {};
  const [status, run] = useStatus();
  async function save(event) {
    event.preventDefault();
    const v = formObject(event);
    if (v.logoUrl && !/^https?:\/\//i.test(v.logoUrl)) { run(() => Promise.reject(new Error("The logo link must start with http:// or https://."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/website", { published: v.published === "on", tagline: v.tagline, about: v.about, logoUrl: v.logoUrl, phone: v.phone, email: v.email, address: v.address }), "Website settings saved");
    if (ok) reload();
  }
  return (
    <Screen title="Front CMS setting" hint="The public website's basic details. Pages, news, events and the gallery are managed in the Front CMS screens.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {loaded && (
        <Panel>
          <Form onSubmit={save} key={JSON.stringify(site)}>
            <Check name="published" label="Website is live" defaultChecked={Boolean(site.published)} />
            <Field label="Tagline" wide><input name="tagline" maxLength={200} defaultValue={site.tagline || ""} /></Field>
            <Field label="About" wide><textarea name="about" rows={5} style={{ height: "auto", padding: 10 }} defaultValue={site.about || ""} /></Field>
            <Field label="Logo link"><input name="logoUrl" type="url" defaultValue={site.logoUrl || ""} /></Field>
            <Field label="Phone"><input name="phone" defaultValue={site.phone || ""} /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={site.email || ""} /></Field>
            <Field label="Address" wide><input name="address" defaultValue={site.address || ""} /></Field>
            <Button type="submit">Save</Button>
          </Form>
        </Panel>
      )}
    </Screen>
  );
}

/* ============================================================ Messaging setup */

function ChannelStatus() {
  const { data, error } = useLoad(["/v1/message-channels"]);
  const c = data["/v1/message-channels"];
  return (
    <Panel title="Delivery">
      <Notice status={{ error }} />
      {c && (
        <ul>
          <li>Email: {c.email ? "set up; emails are sent." : "not set up; emails are only written to the message log. Add the mail server under Email Setting."}</li>
          <li>SMS: {c.sms ? "an SMS gateway is connected; messages are sent." : "no SMS gateway is connected; messages are only written to the message log."}</li>
        </ul>
      )}
      <p>The SMS gateway address is set by the server administrator in the server settings (SMS_WEBHOOK_URL), not here, so a campus account cannot make the server send data to an unknown address.</p>
    </Panel>
  );
}

export function SmsSetting() {
  return (
    <>
      <Screen title="SMS setting" hint="Whether SMS messages are delivered, and the wording of each SMS below."><ChannelStatus /></Screen>
      <SmsTemplates />
    </>
  );
}

export function NotificationSetting() {
  return (
    <Screen title="Notification setting" hint="Which messages the system sends and whether they can be delivered.">
      <ChannelStatus />
      <Panel title="Messages the system sends">
        <ul>
          <li>Portal login email: sent when a student is admitted or imported, and from Login Credentials Send. Its wording is the email template named portal_login.</li>
          <li>Fee due reminders: sent when staff run Fees Reminder, by SMS or email, using the template named fee_due.</li>
          <li>Notices, emails and SMS composed by staff under Communicate.</li>
        </ul>
        <p>There are no automatic or scheduled sends; each of these is started by a person.</p>
      </Panel>
    </Screen>
  );
}

export function ScheduleLog() {
  return (
    <>
      <Screen title="Schedule email / SMS log" hint="Messages cannot be scheduled for later in this system; every message is sent when it is created. This is the log of everything sent.">{null}</Screen>
      <MessageLog />
    </>
  );
}

/* ================================================================ Info pages */

function Info({ title, hint, points }) {
  return (
    <Screen title={title} hint={hint}>
      <Panel><ul>{points.map((p) => <li key={p}>{p}</li>)}</ul></Panel>
    </Screen>
  );
}
const info = (props) => function InfoPage() { return <Info {...props} />; };

export const CaptchaSetting = info({ title: "Captcha setting", hint: "How sign-in is protected against password guessing.", points: [
  "Repeated wrong passwords from the same account or address are slowed down and then blocked for a while (login rate limiting), which does the job a captcha did in the old system.",
  "There is nothing to switch on here; the protection is always on.",
] });
export const LanguageSetting = info({ title: "Languages", hint: "Languages of the staff screens.", points: [
  "School World screens are in English. Switching the interface language is not available yet.",
  "Names, notices and templates can be written in any language; they are stored exactly as typed.",
] });
export const SystemFields = info({ title: "System fields", hint: "Fields on the student and staff forms.", points: [
  "The standard fields are fixed so that reports, marksheets and government exports stay correct.",
  "To collect extra details, add your own fields under Custom Fields (also called Manage Attributes).",
] });
export const StudentProfileUpdate = info({ title: "Student profile update", hint: "Who can change a student's details.", points: [
  "Staff with permission to edit students change details in Manage Students or in bulk under Student Bulk Update.",
  "Students and parents cannot edit their own profile from the portal; they ask the office, so every change is made by staff and recorded in the student log.",
] });
export const SystemUpdate = info({ title: "System update", hint: "How the system is kept up to date.", points: [
  "Updates are released by the development team and installed on the server for every campus at once.",
  "There is nothing to download or run from this screen.",
] });
export const OnlineCourseSetting = info({ title: "Online course setting", hint: "Where online courses are set up.", points: [
  "Courses, their categories and questions are managed under Online Course.",
  "Payments made offline are recorded under Offline Payment, and enrolments are listed in Course Report.",
] });
