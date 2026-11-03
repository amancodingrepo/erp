import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Row, Screen, StudentPicker,
  apiCall, money, plural, rowsOf, staffName, useLoad, useStatus, useStudentNames
} from "../kit.jsx";

// Screens on top of /v1/registers/{kind} (apps/erp/src/lib/services/registers.ts). The server owns the
// field rules; these screens read them from GET /v1/registers and build their forms from them, so a
// rule changes in one place. Linked records (staff, class, subject...) are checked server-side too.

let defsPromise = null;
function useRegisterDefs() {
  const [defs, setDefs] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    defsPromise = defsPromise || apiCall("GET", "/v1/registers").then(rowsOf);
    defsPromise.then((rows) => live && setDefs(rows)).catch((reason) => { defsPromise = null; if (live) setError(reason.message); });
    return () => { live = false; };
  }, []);
  return { defs, error };
}

const REF_PATHS = { staff: "/v1/staff?status=all", class: "/v1/classes", subject: "/v1/subjects", program: "/v1/programs", leaveType: "/v1/leave-types", examPaper: "/v1/exam-groups" };
/** Local date and time as typed into date / datetime-local inputs (not UTC). */
const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const today = () => localNow().slice(0, 10);

function lookupOptions(type, field, data) {
  if (type === "staff") return rowsOf(data[REF_PATHS.staff]).map((s) => ({ value: s.id, label: staffName(s) + (s.isActive === false ? " (disabled)" : "") }));
  if (type === "examPaper") {
    const subjects = rowsOf(data[REF_PATHS.subject]);
    const name = (id) => subjects.find((s) => s.id === id)?.name || "Subject";
    return rowsOf(data[REF_PATHS.examPaper]).flatMap((g) => (g.exams || []).flatMap((e) => (e.subjects || []).map((p) => ({ value: p.id, label: name(p.subjectId) + " · " + e.name + " · " + g.name }))));
  }
  if (type === "register") return rowsOf(data["/v1/registers/" + field.ref]).map((r) => ({ value: r.id, label: r.title }));
  return rowsOf(data[REF_PATHS[type]]).map((r) => ({ value: r.id, label: r.name }));
}

function shown(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && text.length <= 19 ? text.replace("T", " ") : text;
}

/** Shared state for a register: definition, rows, lookups and labels. */
function useRegister(kind, more = []) {
  const { defs, error: defError } = useRegisterDefs();
  const def = defs?.find((d) => d.kind === kind);
  const fields = def?.fields || [];
  const listPath = "/v1/registers/" + kind;
  const paths = useMemo(() => {
    const set = new Set([listPath, ...more]);
    for (const f of fields) {
      if (f.type === "register") set.add("/v1/registers/" + f.ref);
      else if (REF_PATHS[f.type]) set.add(REF_PATHS[f.type]);
      if (f.type === "examPaper") set.add(REF_PATHS.subject);
    }
    return [...set];
  }, [def, more.join("|")]);
  const { data, error, reload, loaded } = useLoad(def ? paths : []);
  const rows = rowsOf(data[listPath]);
  const names = useStudentNames(rows.flatMap((r) => fields.filter((f) => f.type === "student").map((f) => r[f.key])));
  const label = (field, value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (field.type === "student") return names[value] || "Loading…";
    if (REF_PATHS[field.type] || field.type === "register") return lookupOptions(field.type, field, data).find((o) => o.value === value)?.label || "(removed)";
    return shown(value);
  };
  return { def, fields, rows, data, error: defError || error, reload, loaded: loaded && Boolean(def), label, names, listPath };
}

/** Add / edit form for one register row. */
function RegisterForm({ def, fields, data, editing, preset = {}, hide = [], onSaved, onCancel, run, submitLabel }) {
  const [student, setStudent] = useState(null);
  const [changing, setChanging] = useState(false);
  const visible = fields.filter((f) => !hide.includes(f.key) && !(f.key in preset));
  const studentField = visible.find((f) => f.type === "student");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = { ...preset };
    for (const f of visible) {
      if (f.type === "student") { if (student) body[f.key] = student.id; else if (!editing && f.required) { run(() => Promise.reject(new Error("Select a student first."))); return; } continue; }
      if (f.type === "bool") { body[f.key] = values.get(f.key) === "on"; continue; }
      const raw = String(values.get(f.key) ?? "").trim();
      if (raw === "") { if (editing) body[f.key] = null; continue; }
      body[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    if (def.statuses.length && values.get("status")) body.status = String(values.get("status"));
    const { ok } = await run(() => apiCall(editing ? "PATCH" : "POST", "/v1/registers/" + def.kind + (editing ? "/" + editing.id : ""), body), editing ? def.title + " updated" : def.title + " saved");
    if (ok) { if (!editing) form.reset(); setStudent(null); setChanging(false); onSaved(); }
  }
  return (
    <Form onSubmit={submit} key={editing?.id || "new"}>
      {visible.map((f) => {
        const initial = editing ? editing[f.key] : f.type === "date" && f.required ? today() : undefined;
        if (f.type === "student") {
          return editing && !changing
            ? <Field key={f.key} label={f.label} wide><span>Kept as is. <Button variant="ghost" onClick={() => setChanging(true)}>Change student</Button></span></Field>
            : <StudentPicker key={f.key} value={student} onPick={setStudent} />;
        }
        if (f.type === "bool") return <Check key={f.key} name={f.key} label={f.label} defaultChecked={Boolean(initial)} />;
        const common = { name: f.key, required: f.required, defaultValue: initial ?? "" };
        let input;
        if (f.type === "enum" || REF_PATHS[f.type] || f.type === "register") {
          const options = f.type === "enum" ? f.options.map((o) => ({ value: o, label: o })) : lookupOptions(f.type, f, data);
          input = (
            <select {...common}>
              <option value="" disabled={f.required}>{f.required ? (options.length ? "Select" : "Nothing to pick yet") : "None"}</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        } else if (f.type === "longtext") {
          input = <textarea {...common} rows={4} maxLength={5000} style={{ height: "auto", padding: 10 }} />;
        } else {
          const type = { number: "number", date: "date", datetime: "datetime-local", url: "url", phone: "tel" }[f.type] || "text";
          input = <input {...common} type={type} min={f.min} max={f.max} step={f.type === "number" ? "any" : undefined} maxLength={f.type === "number" ? undefined : 300} />;
        }
        return <Field key={f.key} label={f.label} wide={f.type === "longtext"}>{input}</Field>;
      })}
      {def.statuses.length > 0 && editing && (
        <Field label="Status"><select name="status" defaultValue={editing.status || def.statuses[0]}>{def.statuses.map((s) => <option key={s}>{s}</option>)}</select></Field>
      )}
      <Row>
        <Button type="submit">{submitLabel || (editing ? "Save changes" : "Save")}</Button>
        {editing && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </Row>
    </Form>
  );
}

/**
 * Generic register screen.
 * preset: values fixed for new rows (and hidden). hide: field keys left out of the form.
 * filter(row): which rows this screen shows. dateKey: adds a from/to filter on that field.
 * readOnly: a report view. footer(rows, ctx): extra panel under the list.
 */
export function RegisterScreen({ kind, title, hint, preset, hide = [], filter, readOnly, dateKey, columns, footer, formTitle, more = [], top }) {
  const reg = useRegister(kind, more);
  const { def, fields, rows, data, label, reload, loaded } = reg;
  const [status, run] = useStatus();
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const base = filter ? rows.filter(filter) : rows;
  const term = q.trim().toLowerCase();
  const list = base.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (dateKey && range.from && String(row[dateKey] || "").slice(0, 10) < range.from) return false;
    if (dateKey && range.to && String(row[dateKey] || "").slice(0, 10) > range.to) return false;
    if (!term) return true;
    return fields.some((f) => String(label(f, row[f.key])).toLowerCase().includes(term)) || String(row.code || "").toLowerCase().includes(term);
  });

  async function setRowStatus(row, next) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/registers/" + kind + "/" + row.id, { status: next }), "Status changed to " + next);
    if (ok) reload();
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/registers/" + kind + "/" + row.id), def.title + " removed");
    if (ok) { if (editing?.id === row.id) setEditing(null); reload(); }
  }

  const listed = fields.filter((f) => !hide.includes(f.key) && !(preset && f.key in preset) && f.type !== "longtext");
  const ctx = { ...reg, setRowStatus };
  const cols = columns ? columns(ctx) : [
    ...(def?.hasCode ? [{ key: "code", label: "Code" }] : []),
    ...listed.map((f) => ({ key: f.key, label: f.label, render: (row) => label(f, row[f.key]) })),
  ];
  if (def?.statuses.length) {
    cols.push({ key: "status", label: "Status", render: (row) => (readOnly ? row.status || "-" : (
      <select aria-label="Status" value={row.status || ""} onChange={(event) => setRowStatus(row, event.target.value)}>
        {def.statuses.map((s) => <option key={s}>{s}</option>)}
      </select>
    )) });
  }
  if (!readOnly) cols.push({ key: "act", label: "", render: (row) => <Row><Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button><RemoveButton onRemove={() => remove(row)} /></Row> });

  return (
    <Screen title={title || def?.title || "Loading…"} hint={hint}>
      <Notice status={{ error: reg.error || status.error, message: status.message }} />
      {top && def && top(ctx)}
      {!readOnly && def && (
        <Panel title={editing ? "Edit " + def.title.toLowerCase() : formTitle || "Add " + def.title.toLowerCase()}>
          <RegisterForm def={def} fields={fields} data={data} editing={editing} preset={preset} hide={hide} run={run} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
        </Panel>
      )}
      <Panel
        title={plural(list.length, "record")}
        actions={(
          <Row>
            {def?.statuses.length > 0 && <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{def.statuses.map((s) => <option key={s}>{s}</option>)}</select>}
            {dateKey && <><input type="date" aria-label="From" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /><input type="date" aria-label="To" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></>}
            {base.length > 8 && <input aria-label="Search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />}
          </Row>
        )}
      >
        {dateKey && range.from && range.to && range.to < range.from && <p className="ck-notice ck-notice-error">The end date is before the start date.</p>}
        <DataTable rows={list} empty={loaded ? (base.length ? "No record matches." : "Nothing here yet.") : "Loading…"} columns={cols} />
      </Panel>
      {footer && def && loaded && footer(list, ctx)}
    </Screen>
  );
}

const reg = (props) => function RegisterPage() { return <RegisterScreen {...props} />; };

/* ------------------------------------------------------------ Front office */

export const PhoneCallLog = reg({ kind: "phone-calls", title: "Phone call log", hint: "Calls made and received at the front desk, with any follow-up date.", dateKey: "date" });
export const PostalDispatch = reg({ kind: "postal-dispatch", title: "Postal dispatch", hint: "Letters and parcels sent out.", dateKey: "date" });
export const PostalReceive = reg({ kind: "postal-receive", title: "Postal receive", hint: "Letters and parcels received.", dateKey: "date" });
export const Complaints = reg({ kind: "complaints", title: "Complaint", hint: "Complaints, who handles them, and their status from Open to Closed.", dateKey: "date" });
export const Inward = reg({ kind: "inward", title: "Inward", hint: "Documents received by the office.", dateKey: "date" });
export const Outward = reg({ kind: "outward", title: "Outward", hint: "Documents sent by the office.", dateKey: "date" });
export const InwardReport = reg({ kind: "inward", title: "Inward report", hint: "Every inward entry. Pick dates to narrow the list.", readOnly: true, dateKey: "date" });
export const OutwardReport = reg({ kind: "outward", title: "Outward report", hint: "Every outward entry. Pick dates to narrow the list.", readOnly: true, dateKey: "date" });

/* ------------------------------------------------------------------ Hostel */

export const RoomTypes = reg({ kind: "room-types", title: "Room type", hint: "Kinds of hostel room, such as single or 3-share." });
export const Gatepasses = reg({ kind: "gatepasses", title: "Gate pass list", hint: "Passes for students leaving the hostel. Each pass gets a code that the gate can scan or type.", dateKey: "outAt" });

export function GatepassScan() {
  const { def, rows, label, fields, reload, loaded, error } = useRegister("gatepasses");
  const [code, setCode] = useState("");
  const [status, run] = useStatus();
  const pass = rows.find((r) => String(r.code || "").toLowerCase() === code.trim().toLowerCase());
  const next = pass && ({ Issued: "Out", Out: "Returned" })[pass.status];
  async function move() {
    const { ok } = await run(() => apiCall("PATCH", "/v1/registers/gatepasses/" + pass.id, { status: next }), "Marked " + next.toLowerCase());
    if (ok) reload();
  }
  return (
    <Screen title="Scan gate pass" hint="Scan the pass code with a barcode or QR scanner (they type the code into the box), or type it in. Then mark the student out or back.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Pass code"><input autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="GP-…" /></Field>
        </Form>
        {!loaded && <p>Loading passes…</p>}
        {loaded && code.trim() && !pass && <p className="ck-notice ck-notice-error">No gate pass has this code.</p>}
        {pass && def && (
          <>
            <DataTable rows={[pass]} columns={[{ key: "code", label: "Code" }, ...fields.map((f) => ({ key: f.key, label: f.label, render: (r) => label(f, r[f.key]) })), { key: "status", label: "Status" }]} />
            {pass.expectedBackAt && pass.status === "Out" && pass.expectedBackAt.slice(0, 16) < localNow() && <p className="ck-notice ck-notice-error">This student is late: they were due back by {pass.expectedBackAt.replace("T", " ")}.</p>}
            {next ? <Button onClick={move}>Mark {next.toLowerCase()}</Button> : <p>This pass is {String(pass.status).toLowerCase()}; nothing more to record.</p>}
          </>
        )}
      </Panel>
    </Screen>
  );
}

/* --------------------------------------------------------- Human resource */

export const LeaveApprovers = reg({ kind: "leave-approvers", title: "Leave approval setup", hint: "Who approves leave. Leave the type blank to cover every leave type." });
export const TeacherRatings = reg({ kind: "teacher-ratings", title: "Teachers rating", hint: "Ratings from 1 to 5 for each teacher and period." });
export const TeacherResearch = reg({ kind: "teacher-research", title: "Teachers research", hint: "Publications, research projects, awards and achievements." });
export const TeacherAchievementReport = reg({ kind: "teacher-research", title: "Teacher achievement report", hint: "Awards and achievements recorded for teachers.", readOnly: true, filter: (r) => r.category === "Achievement" || r.category === "Award" });
export const TeacherResearchReport = reg({ kind: "teacher-research", title: "Teacher's research, publications and awards", hint: "Everything recorded under Teachers research.", readOnly: true, filter: (r) => r.category !== "Achievement" });
export const StaffWeekOffs = reg({ kind: "staff-week-offs", title: "Set staff week off", hint: "Each staff member's weekly day off." });
export const StaffTasks = reg({ kind: "staff-tasks", title: "Task management", hint: "Tasks given to staff, with due dates and progress.", dateKey: "dueOn" });
export const StaffLeaveBatches = reg({ kind: "staff-leave-batches", title: "Staff leave batches", hint: "Leave years, such as April to March." });
export const StaffCertificateTemplates = reg({ kind: "staff-certificate-templates", title: "Staff certificate", hint: "Certificate wording for staff. Use {{name}}, {{employeeId}}, {{designation}}, {{department}}, {{campus}} and {{date}}; they are filled in when you generate a certificate." });

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function StaffGenerateCertificate() {
  const { data, error, reload } = useLoad(["/v1/staff?status=all", "/v1/registers/staff-certificate-templates", "/v1/registers/staff-certificate-issues"]);
  // The campus name is optional here: HR staff may not be allowed to read settings.
  const [campusName, setCampusName] = useState("");
  useEffect(() => { apiCall("GET", "/v1/settings").then((s) => setCampusName(s?.name || "")).catch(() => {}); }, []);
  const staff = rowsOf(data["/v1/staff?status=all"]);
  const templates = rowsOf(data["/v1/registers/staff-certificate-templates"]);
  const issues = rowsOf(data["/v1/registers/staff-certificate-issues"]);
  const [pick, setPick] = useState({ staffId: "", templateId: "" });
  const [status, run] = useStatus();
  const person = staff.find((s) => s.id === pick.staffId);
  const template = templates.find((t) => t.id === pick.templateId);
  const vars = person && {
    name: [person.firstName, person.lastName].filter(Boolean).join(" "), employeeId: person.employeeId || "",
    designation: person.designation?.name || "", department: person.department?.name || "", campus: campusName, date: new Date().toLocaleDateString("en-IN"),
  };
  const text = template && vars ? String(template.body).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in vars ? vars[key] : m)) : "";
  async function issue() {
    const win = window.open("", "_blank");
    if (!win) { run(() => Promise.reject(new Error("Allow pop-ups for this site to print the certificate."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/registers/staff-certificate-issues", { staffId: person.id, templateId: template.id, certificate: template.name }), "Certificate issued and recorded");
    if (!ok) { win.close(); return; }
    win.document.write("<!doctype html><meta charset='utf-8'><title>" + escapeHtml(template.name) + "</title><body style=\"font-family:Georgia,serif;max-width:720px;margin:60px auto;line-height:1.6\"><h1 style=\"text-align:center\">" + escapeHtml(template.name) + "</h1><p style=\"white-space:pre-wrap\">" + escapeHtml(text) + "</p></body>");
    win.document.close();
    win.focus();
    win.print();
    reload();
  }
  const staffLabel = (id) => staffName(staff.find((s) => s.id === id)) || "(removed)";
  return (
    <Screen title="Generate staff certificate" hint="Pick a staff member and a certificate. Check the wording, then print. Every certificate printed is recorded below.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Staff"><select value={pick.staffId} onChange={(e) => setPick((p) => ({ ...p, staffId: e.target.value }))}><option value="">Select staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}</select></Field>
          <Field label="Certificate"><select value={pick.templateId} onChange={(e) => setPick((p) => ({ ...p, templateId: e.target.value }))}><option value="">{templates.length ? "Select certificate" : "Add a certificate under Staff Certificate first"}</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        </Form>
        {text && <><p style={{ whiteSpace: "pre-wrap", border: "1px solid var(--sd-border, #dfe7f1)", borderRadius: 8, padding: 16 }}>{text}</p><Button onClick={issue}>Print and record</Button></>}
      </Panel>
      <Panel title={plural(issues.length, "certificate") + " issued"}>
        <DataTable rows={issues} empty="No staff certificates issued yet." columns={[
          { key: "staff", label: "Staff", render: (r) => staffLabel(r.staffId) }, { key: "certificate", label: "Certificate" },
          { key: "createdAt", label: "Issued", render: (r) => new Date(r.createdAt).toLocaleString() },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Payroll */

export const TaxElements = reg({ kind: "tax-declarations", title: "Add income tax element", hint: "Deduction sections staff can declare, such as 80C, with the yearly limit. Generate Income Tax caps each declaration at its limit." });

export const VisitingStaffPayroll = reg({
  kind: "visiting-staff", title: "Visiting staff payroll", hint: "Sessions taken by visiting faculty. Amount is hours × rate. Mark a session Paid once settled.", dateKey: "date",
  columns: ({ fields, label }) => [
    ...fields.map((f) => ({ key: f.key, label: f.label, render: (r) => label(f, r[f.key]) })),
    { key: "amount", label: "Amount", render: (r) => money(Math.round(Number(r.hours) * Number(r.rate) * 100) / 100) },
  ],
  footer: (rows) => {
    const unpaid = rows.filter((r) => r.status !== "Paid").reduce((sum, r) => sum + Number(r.hours) * Number(r.rate), 0);
    return <Panel title="Still to pay (rows shown above)"><p>{money(Math.round(unpaid * 100) / 100)}</p></Panel>;
  },
});

export function GenerateIncomeTax() {
  const { data, error } = useLoad(["/v1/staff?status=all", "/v1/registers/tax-declarations"]);
  const staff = rowsOf(data["/v1/staff?status=all"]);
  const elements = rowsOf(data["/v1/registers/tax-declarations"]);
  const now = new Date();
  const thisFy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const [staffId, setStaffId] = useState("");
  const [fy, setFy] = useState(String(thisFy));
  const [amounts, setAmounts] = useState({});
  const [result, setResult] = useState(null);
  const [status, run] = useStatus();
  async function calculate(event) {
    event.preventDefault();
    setResult(null);
    const declarations = elements.map((e) => ({ elementId: e.id, amount: Number(amounts[e.id] || 0) })).filter((d) => d.amount > 0);
    const { ok, result: json } = await run(() => apiCall("POST", "/v1/payroll/income-tax", { staffId, fyStart: Number(fy), declarations }), "Tax worked out");
    if (ok) setResult(json);
  }
  return (
    <Screen title="Generate income tax" hint="Yearly tax for one staff member from their payslips in the financial year, after the deductions they declare. It uses the same TDS slabs and rebate as the payroll run. Nothing is saved.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={calculate}>
          <Field label="Staff"><select required value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="" disabled>Select staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}</select></Field>
          <Field label="Financial year"><select value={fy} onChange={(e) => setFy(e.target.value)}>{[0, 1, 2, 3].map((n) => thisFy - n).map((y) => <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>)}</select></Field>
          {elements.map((e) => <Field key={e.id} label={e.name + (e.maxLimit != null ? " (limit " + money(e.maxLimit) + ")" : "")}><input type="number" min="0" step="0.01" value={amounts[e.id] || ""} onChange={(ev) => setAmounts((a) => ({ ...a, [e.id]: ev.target.value }))} placeholder="0" /></Field>)}
          <Button type="submit">Work out tax</Button>
        </Form>
        {!elements.length && <p>No income tax elements yet. Add them under Add Income Tax Element to declare deductions.</p>}
      </Panel>
      {result && (
        <Panel title={result.staff.name + " · " + result.financialYear}>
          {!result.months.length && <p className="ck-notice ck-notice-error">No payslips in this financial year, so the gross is zero.</p>}
          {!result.slabs && <p className="ck-notice ck-notice-error">No TDS slabs are set up, so the tax shows as zero. Add them under Tax Slabs.</p>}
          <DataTable rowKey={(r) => r.k} rows={[
            { k: "Gross pay (" + plural(result.months.length, "payslip") + ")", v: result.gross },
            ...result.lines.map((l) => ({ k: "Less " + l.name + (l.allowed !== l.declared ? " (declared " + money(l.declared) + ", capped)" : ""), v: l.allowed })),
            { k: "Taxable income", v: result.taxable }, { k: "Tax for the year", v: result.tax },
            { k: "TDS already deducted", v: result.tdsDeducted }, { k: Number(result.balance) >= 0 ? "Still to deduct" : "Deducted in excess", v: String(Math.abs(Number(result.balance))) },
          ]} columns={[{ key: "k", label: "" }, { key: "v", label: "Amount", render: (r) => money(r.v) }]} />
        </Panel>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- Academics */

export const Semesters = reg({ kind: "semesters", title: "Semester", hint: "Semesters of each program, in order." });
export const SemesterAllocations = reg({ kind: "semester-allocations", title: "Semester allocation", hint: "Which semester each class is in." });
export const ProgramIntakes = reg({ kind: "program-intakes", title: "Program intake", hint: "Seats offered in each program for an admission year." });

/* ------------------------------------------------------------- Examinations */

export const ExamTypes = reg({ kind: "exam-types", title: "Exam type", hint: "Kinds of exam, such as mid-term or practical." });
export const MarksDivisions = reg({ kind: "marks-divisions", title: "Marks division", hint: "Divisions by percentage, such as First Division from 60 to 100." });
export const RelativeGrades = reg({ kind: "relative-grades", title: "Relative grade", hint: "Grades given by rank in class, such as A for the top 10%." });
export const ResultRemarks = reg({ kind: "result-remarks", title: "Result remark", hint: "The remark printed for each percentage band." });
export const RemunerationRates = reg({ kind: "remuneration-rates", title: "Remuneration setup", hint: "What each exam duty pays." });
export const RemunerationHours = reg({ kind: "remuneration-hours", title: "Remuneration hour setup", hint: "Exam duties done by each staff member: papers set or checked, hours invigilated, and so on.", dateKey: "date" });
export const QuestionPapers = reg({ kind: "question-papers", title: "Question paper creation", hint: "Assign a paper to a setter, track it from Assigned to Approved, and keep a link to the file.", dateKey: "dueOn" });
export const QuestionPaperApprovals = reg({
  kind: "question-papers", title: "Question paper approve list", hint: "Papers sent in by setters. Open the file, then approve or reject with a note.",
  filter: (r) => r.status === "Submitted" || r.status === "Approved" || r.status === "Rejected",
  columns: ({ fields, label, setRowStatus }) => [
    ...fields.filter((f) => f.key !== "reviewNote").map((f) => ({ key: f.key, label: f.label, render: (r) => (f.key === "fileUrl" && r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer">Open</a> : label(f, r[f.key])) })),
    { key: "decide", label: "", render: (r) => (r.status === "Submitted" ? <Row><Button onClick={() => setRowStatus(r, "Approved")}>Approve</Button><Button variant="danger" onClick={() => setRowStatus(r, "Rejected")}>Reject</Button></Row> : null) },
  ],
});

export function RemunerationBill() {
  const { data, error } = useLoad(["/v1/registers/remuneration-rates", "/v1/registers/remuneration-hours", "/v1/staff?status=all"]);
  const rates = rowsOf(data["/v1/registers/remuneration-rates"]);
  const duties = rowsOf(data["/v1/registers/remuneration-hours"]);
  const staff = rowsOf(data["/v1/staff?status=all"]);
  const [range, setRange] = useState({ from: "", to: "" });
  const [exam, setExam] = useState("");
  const exams = [...new Set(duties.map((d) => d.examName).filter(Boolean))].sort();
  const picked = duties.filter((d) => (!exam || d.examName === exam) && (!range.from || (d.date && d.date >= range.from)) && (!range.to || (d.date && d.date <= range.to)));
  // A duty is paid at its rate only when exactly one rate is set for that duty; otherwise it is flagged.
  const rateFor = (role) => { const found = rates.filter((r) => r.role === role); return found.length === 1 ? found[0] : found.length ? "many" : null; };
  const lines = picked.map((d) => { const rate = rateFor(d.role); return { ...d, rate, amount: rate && rate !== "many" ? Math.round(Number(d.quantity) * Number(rate.rate) * 100) / 100 : null }; });
  const byStaff = new Map();
  for (const line of lines) { const list = byStaff.get(line.staffId) || []; list.push(line); byStaff.set(line.staffId, list); }
  const total = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const problems = lines.filter((l) => l.amount === null).length;
  return (
    <Screen title="Exam remuneration bill" hint="Exam duties from Remuneration Hour Setup, paid at the rates in Remuneration Setup.">
      <Notice status={{ error }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Exam"><select value={exam} onChange={(e) => setExam(e.target.value)}><option value="">All exams</option>{exams.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="From"><input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
          <Field label="To"><input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
        </Form>
        {(range.from || range.to) && <p>Duties with no date are left out when dates are picked.</p>}
        {problems > 0 && <p className="ck-notice ck-notice-error">{problems === 1 ? "1 duty" : problems + " duties"} could not be priced: the duty has no rate, or more than one rate. Fix it in Remuneration Setup.</p>}
      </Panel>
      {[...byStaff.entries()].map(([staffId, list]) => (
        <Panel key={staffId} title={(staffName(staff.find((s) => s.id === staffId)) || "(removed staff)") + " · " + money(list.reduce((s, l) => s + (l.amount || 0), 0))}>
          <DataTable rows={list} columns={[
            { key: "date", label: "Date", render: (l) => l.date || "-" }, { key: "examName", label: "Exam", render: (l) => l.examName || "-" },
            { key: "role", label: "Duty" }, { key: "quantity", label: "Quantity" },
            { key: "rate", label: "Rate", render: (l) => (l.rate === "many" ? "More than one rate" : l.rate ? money(l.rate.rate) + " " + l.rate.unit.toLowerCase() : "No rate") },
            { key: "amount", label: "Amount", render: (l) => (l.amount === null ? "-" : money(l.amount)) },
          ]} />
        </Panel>
      ))}
      <Panel title={"Total · " + money(Math.round(total * 100) / 100)}>{!lines.length && <p>No exam duties for these filters.</p>}</Panel>
    </Screen>
  );
}

/* ------------------------------------------------------------ Lesson plan */

export const LessonTopics = reg({ kind: "lesson-topics", title: "Topic", hint: "Lessons and their topics for each subject, in teaching order." });
export const InstructionPlans = reg({ kind: "instruction-plans", title: "Instruction plan", hint: "How each subject will be taught, week by week." });
export const SyllabusStatus = reg({ kind: "syllabus-status", title: "Manage syllabus status", hint: "How far each class has got with each topic." });

export function CopyOldLessons() {
  const { data, error, reload } = useLoad(["/v1/ops/lesson-plans", "/v1/classes", "/v1/subjects"]);
  const plans = rowsOf(data["/v1/ops/lesson-plans"]);
  const classes = rowsOf(data["/v1/classes"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const [pick, setPick] = useState({ fromClass: "", subjectId: "", toClass: "" });
  const [status, run] = useStatus();
  const source = plans.filter((p) => p.classId === pick.fromClass && (!pick.subjectId || p.subjectId === pick.subjectId));
  const key = (p) => [p.subjectId || "", p.weekNo ?? "", String(p.title || "").toLowerCase()].join("|");
  const already = new Set(plans.filter((p) => p.classId === pick.toClass).map(key));
  const fresh = source.filter((p) => !already.has(key(p)));
  async function copy(event) {
    event.preventDefault();
    if (pick.fromClass === pick.toClass) { run(() => Promise.reject(new Error("Pick a different class to copy into."))); return; }
    const { ok } = await run(async () => {
      let done = 0;
      for (const p of fresh) {
        const body = { classId: pick.toClass, title: p.title };
        for (const k of ["subjectId", "weekNo", "topic", "body"]) if (p[k] !== null && p[k] !== undefined && p[k] !== "") body[k] = p[k];
        await apiCall("POST", "/v1/ops/lesson-plans", body);
        done++;
      }
      return done;
    }, (done) => plural(done, "lesson") + " copied" + (source.length > fresh.length ? "; " + plural(source.length - fresh.length, "lesson") + " were already there and were skipped" : ""));
    if (ok) reload();
  }
  return (
    <Screen title="Copy old lessons" hint="Copy lesson plans from one class to another, for example last year's plans into this year's class. Lessons the target class already has are skipped.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={copy}>
          <Field label="Copy from class"><select required value={pick.fromClass} onChange={(e) => setPick((p) => ({ ...p, fromClass: e.target.value }))}><option value="" disabled>Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Subject"><select value={pick.subjectId} onChange={(e) => setPick((p) => ({ ...p, subjectId: e.target.value }))}><option value="">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Copy into class"><select required value={pick.toClass} onChange={(e) => setPick((p) => ({ ...p, toClass: e.target.value }))}><option value="" disabled>Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Button type="submit" disabled={!fresh.length || !pick.toClass}>Copy {plural(fresh.length, "lesson")}</Button>
        </Form>
      </Panel>
      {pick.fromClass && (
        <Panel title={plural(source.length, "lesson") + " in the source class"}>
          <DataTable rows={source} empty="This class has no lesson plans for that subject." columns={[
            { key: "weekNo", label: "Week", render: (p) => p.weekNo ?? "-" }, { key: "subject", label: "Subject", render: (p) => subjects.find((s) => s.id === p.subjectId)?.name || "-" },
            { key: "title", label: "Lesson" }, { key: "copy", label: "", render: (p) => (pick.toClass && already.has(key(p)) ? "Already there" : "") },
          ]} />
        </Panel>
      )}
    </Screen>
  );
}

/* ----------------------------------------------------------- Download center */

const isVideo = (row, types) => /video/i.test(types.find((t) => t.id === row.typeId)?.name || row.type?.name || "") || /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/i.test(row.url || "");

export function VideoTutorials() {
  const { data, error, reload, loaded } = useLoad(["/v1/ops/contents", "/v1/ops/download-types"]);
  const types = rowsOf(data["/v1/ops/download-types"]);
  const videos = rowsOf(data["/v1/ops/contents"]).filter((row) => isVideo(row, types));
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = Object.fromEntries(new FormData(form).entries());
    if (!/^https?:\/\//i.test(v.url)) { run(() => Promise.reject(new Error("The link must start with http:// or https://."))); return; }
    const { ok } = await run(async () => {
      let type = types.find((t) => /^video/i.test(t.name));
      if (!type) type = await apiCall("POST", "/v1/ops/download-types", { name: "Video" });
      return apiCall("POST", "/v1/ops/contents", { title: v.title.trim(), url: v.url.trim(), typeId: type.id, audience: v.audience });
    }, "Video shared");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Video tutorial" hint="Links to teaching videos (YouTube, Vimeo or a video file). They are saved as shared content of type Video, so they also appear in the content share list.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add video">
        <Form onSubmit={add}>
          <Field label="Title"><input name="title" required maxLength={200} /></Field>
          <Field label="Video link" wide><input name="url" type="url" required placeholder="https://" /></Field>
          <Field label="Share with"><select name="audience" defaultValue="all"><option value="all">Everyone</option><option value="student">Students</option><option value="staff">Staff</option></select></Field>
          <Button type="submit">Share video</Button>
        </Form>
      </Panel>
      <Panel title={plural(videos.length, "video")}>
        <DataTable rows={videos} empty={loaded ? "No videos shared yet." : "Loading…"} columns={[
          { key: "title", label: "Title" }, { key: "audience", label: "For", render: (r) => ({ all: "Everyone", student: "Students", staff: "Staff" })[r.audience] || "-" },
          { key: "url", label: "Link", render: (r) => <a href={r.url} target="_blank" rel="noreferrer">Watch</a> },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ------------------------------------------------------ Other course forms */

export const OtherCourses = reg({ kind: "other-courses", title: "Other course form setting", hint: "Courses students can apply for outside their main program, such as liberal arts electives. Untick Open to stop new applications." });
export const OtherCourseReport = reg({ kind: "other-course-applications", title: "Other course form report", hint: "Every application, by course and status.", readOnly: true });

export function OtherCourseApplications() {
  return (
    <RegisterScreen
      kind="other-course-applications" title="Other course form" hint="Apply students to an open course and approve or reject applications. A student can apply to a course only once."
      top={({ data, rows }) => {
        const courses = rowsOf(data["/v1/registers/other-courses"]);
        const open = courses.filter((c) => c.open);
        const full = courses.filter((c) => c.seats != null && rows.filter((r) => r.courseId === c.id && r.status === "Approved").length >= c.seats);
        return (open.length < courses.length || full.length) ? (
          <Panel>
            {open.length < courses.length && <p>Closed courses: {courses.filter((c) => !c.open).map((c) => c.title).join(", ")}. New applications to them are refused.</p>}
            {full.length > 0 && <p>Full (approved applications reached the seats): {full.map((c) => c.title).join(", ")}.</p>}
          </Panel>
        ) : null;
      }}
    />
  );
}
