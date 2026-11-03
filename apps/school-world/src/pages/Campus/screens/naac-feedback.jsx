import React, { useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, Row, Screen, StudentPicker,
  apiCall, dateOnly, formObject, plural, rowsOf, staffName, titleCase, useLoad, useStatus, useStudentNames
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/naac-ops.tsx and feedback-ops.tsx,
// with the same endpoints.

const when = (value) => (value ? new Date(value).toLocaleString() : "-");
const today = () => new Date().toISOString().slice(0, 10);

function Bar({ percent }) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <Row>
      <span className="ck-bar" style={{ width: 120 }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: value + "%" }} /></span>
      <span>{value}%</span>
    </Row>
  );
}

/* ================================================================== NAAC */

export function NaacDashboard() {
  const { data, error, reload, loaded } = useLoad(["/v1/naac/dashboard"]);
  const rows = rowsOf(data["/v1/naac/dashboard"]);
  const totals = rows.reduce((t, r) => ({ tasks: t.tasks + (r.tasks || 0), done: t.done + (r.done || 0), assignments: t.assignments + (r.assignments || 0), evidence: t.evidence + (r.evidence || 0) }), { tasks: 0, done: 0, assignments: 0, evidence: 0 });
  const overall = totals.assignments ? Math.round((totals.done / totals.assignments) * 100) : 0;
  return (
    <Screen title="NAAC dashboard" hint="Progress on each of the seven NAAC criteria, from the tasks given to staff.">
      <Notice status={{ error }} />
      <Panel title={"Overall " + overall + "% · " + plural(totals.tasks, "task") + " · " + plural(totals.evidence, "evidence file")} actions={<Button variant="ghost" onClick={reload}>Refresh</Button>}>
        <DataTable rows={rows} empty={loaded ? "No criteria yet." : "Loading…"} columns={[
          { key: "number", label: "Criterion", render: (row) => "C" + row.number },
          { key: "title", label: "Title" },
          { key: "tasks", label: "Tasks" },
          { key: "work", label: "Done / given", render: (row) => row.done + " / " + row.assignments },
          { key: "evidence", label: "Evidence" },
          { key: "percent", label: "Progress", render: (row) => <Bar percent={row.percent} /> },
        ]} />
      </Panel>
    </Screen>
  );
}

export function NaacTasks() {
  const { data, error, reload, loaded } = useLoad(["/v1/naac/criteria", "/v1/naac/tasks"]);
  const criteria = rowsOf(data["/v1/naac/criteria"]);
  const tasks = rowsOf(data["/v1/naac/tasks"]);
  const [criterion, setCriterion] = useState("");
  const [status, run] = useStatus();
  const shown = criterion ? tasks.filter((row) => row.criterion?.id === criterion) : tasks;

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/naac/tasks", {
      criterionId: v.criterionId, title: v.title, keyIndicator: v.keyIndicator || undefined, dueOn: v.dueOn || undefined, evidenceRequired: v.evidenceRequired === "on",
    }), "Task saved");
    if (ok) { form.querySelector("[name=title]").value = ""; form.querySelector("[name=keyIndicator]").value = ""; reload(); }
  }

  return (
    <Screen title="NAAC task master" hint="Tasks under each criterion. Give them to staff on the Task Allocation screen.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New task">
        <Form onSubmit={add}>
          <Field label="Criterion" wide>
            <select name="criterionId" required defaultValue="">
              <option value="" disabled>Select criterion</option>
              {criteria.map((row) => <option key={row.id} value={row.id}>C{row.number} {row.title}</option>)}
            </select>
          </Field>
          <Field label="Task" wide><input name="title" placeholder="Upload IQAC minutes for 2025-26" required /></Field>
          <Field label="Key indicator"><input name="keyIndicator" placeholder="6.5.1" /></Field>
          <Field label="Due on"><input name="dueOn" type="date" /></Field>
          <Check name="evidenceRequired" label="Evidence needed before it can be marked done" />
          <Button type="submit">Add task</Button>
        </Form>
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Show" wide>
            <select value={criterion} onChange={(event) => setCriterion(event.target.value)}>
              <option value="">All criteria</option>
              {criteria.map((row) => <option key={row.id} value={row.id}>C{row.number} {row.title}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No tasks yet." : "Loading…"} columns={[
        { key: "criterion", label: "Criterion", render: (row) => "C" + row.criterion?.number },
        { key: "title", label: "Task" },
        { key: "keyIndicator", label: "Key indicator", render: (row) => row.keyIndicator || "-" },
        { key: "dueOn", label: "Due", render: (row) => <Row>{dateOnly(row.dueOn) || "-"}{row.dueOn && dateOnly(row.dueOn) < today() && (row.assignments || []).some((a) => a.status !== "DONE") && <span className="ck-badge ck-badge-warn">Overdue</span>}</Row> },
        { key: "evidence", label: "Evidence", render: (row) => (row.evidenceRequired ? row.evidence + " (needed)" : row.evidence) },
        { key: "people", label: "Given to", render: (row) => (row.assignments || []).map((a) => a.staff + " (" + titleCase(a.status) + ")").join(", ") || "Nobody yet" },
      ]} />
    </Screen>
  );
}

export function NaacAllocation() {
  const { data, error, reload, loaded } = useLoad(["/v1/naac/tasks", "/v1/staff"]);
  const tasks = rowsOf(data["/v1/naac/tasks"]);
  const staff = rowsOf(data["/v1/staff"]);
  const [openId, setOpenId] = useState(null);
  const [status, run] = useStatus();
  const open = tasks.find((row) => row.id === openId);

  async function assign(event) {
    event.preventDefault();
    const v = formObject(event);
    const task = tasks.find((row) => row.id === v.taskId);
    const person = staff.find((row) => row.id === v.staffId);
    const { ok } = await run(() => apiCall("POST", "/v1/naac/tasks/" + v.taskId + "/assign", { staffId: v.staffId }), "\"" + task?.title + "\" given to " + staffName(person));
    if (ok) reload();
  }
  async function addEvidence(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const { ok } = await run(async () => {
      let url = String(data.get("fileUrl") || "").trim();
      if (file instanceof File && file.size > 0) {
        const upload = new FormData();
        upload.append("file", file);
        upload.append("kind", "naac");
        upload.append("ownerId", open.id);
        const response = await fetch("/api/v1/files", { method: "POST", body: upload, credentials: "same-origin" });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.url) throw new Error(json.fields?.file || json.message || "Upload failed.");
        url = json.url;
      }
      if (!url) throw new Error("Choose a file or paste a link.");
      return apiCall("POST", "/v1/naac/tasks/" + open.id + "/evidence", { fileUrl: url, note: String(data.get("note") || "").trim() || undefined });
    }, "Evidence added");
    if (ok) { form.reset(); reload(); }
  }
  async function complete(task, assignment) {
    if (task.evidenceRequired && !task.evidence) { run(() => Promise.reject(new Error("Add evidence for \"" + task.title + "\" before marking it done."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/naac/assignments/" + assignment.id + "/complete"), assignment.staff + " marked done");
    if (ok) reload();
  }

  return (
    <Screen title="Task allocation" hint="Give NAAC tasks to staff, collect evidence, and mark each person's part done.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Give a task">
        <Form onSubmit={assign}>
          <Field label="Task" wide>
            <select name="taskId" required defaultValue="">
              <option value="" disabled>{tasks.length ? "Select task" : "Add tasks on the Task Master screen first"}</option>
              {tasks.map((row) => <option key={row.id} value={row.id}>C{row.criterion?.number} · {row.title}</option>)}
            </select>
          </Field>
          <Field label="Staff">
            <select name="staffId" required defaultValue="">
              <option value="" disabled>Select staff</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Button type="submit">Assign</Button>
        </Form>
      </Panel>
      <DataTable rows={tasks} empty={loaded ? "No tasks yet." : "Loading…"} columns={[
        { key: "title", label: "Task", render: (row) => "C" + row.criterion?.number + " · " + row.title },
        { key: "evidence", label: "Evidence", render: (row) => <Row>{row.evidence}{row.evidenceRequired && !row.evidence && <span className="ck-badge ck-badge-warn">Needed</span>}</Row> },
        { key: "people", label: "Staff", render: (row) => (row.assignments || []).length ? (
          <span style={{ display: "grid", gap: 4 }}>
            {row.assignments.map((a) => (
              <Row key={a.id}>
                {a.staff}
                {a.status === "DONE" ? <span className="ck-badge">Done</span> : <Button variant="ghost" onClick={() => complete(row, a)}>Mark done</Button>}
              </Row>
            ))}
          </span>
        ) : "Nobody yet" },
        { key: "act", label: "", render: (row) => <Button variant="ghost" onClick={() => setOpenId(openId === row.id ? null : row.id)}>{openId === row.id ? "Close" : "Add evidence"}</Button> },
      ]} />
      {open && (
        <Panel title={"Evidence for " + open.title}>
          <Form onSubmit={addEvidence}>
            <Field label="File"><input name="file" type="file" /></Field>
            <Field label="Or link" wide><input name="fileUrl" placeholder="https://drive.example.com/iqac-minutes.pdf" /></Field>
            <Field label="Note" wide><input name="note" /></Field>
            <Button type="submit">Add evidence</Button>
          </Form>
        </Panel>
      )}
    </Screen>
  );
}

/** Per-criterion task report built from the dashboard and task lists (there is no separate report endpoint). */
export function NaacReport() {
  const { data, error, loaded } = useLoad(["/v1/naac/dashboard", "/v1/naac/tasks"]);
  const criteria = rowsOf(data["/v1/naac/dashboard"]);
  const tasks = rowsOf(data["/v1/naac/tasks"]);
  return (
    <Screen title="NAAC report" hint="Every criterion with its tasks, who has them, and how much evidence is in. Print it for the IQAC file.">
      <Notice status={{ error }} />
      <Panel actions={<Button variant="ghost" onClick={() => window.print()}>Print</Button>}>
        <p style={{ margin: 0 }}>Prepared {new Date().toLocaleDateString()}.</p>
      </Panel>
      {!loaded && <p>Loading…</p>}
      {criteria.map((c) => {
        const own = tasks.filter((t) => t.criterion?.id === c.id || t.criterion?.number === c.number);
        return (
          <Panel key={c.id || c.number} title={"C" + c.number + " " + c.title} actions={<Bar percent={c.percent} />}>
            <DataTable rows={own} empty="No tasks under this criterion." columns={[
              { key: "keyIndicator", label: "Indicator", render: (row) => row.keyIndicator || "-" },
              { key: "title", label: "Task" },
              { key: "dueOn", label: "Due", render: (row) => dateOnly(row.dueOn) || "-" },
              { key: "people", label: "Staff", render: (row) => (row.assignments || []).map((a) => a.staff + " · " + titleCase(a.status)).join("; ") || "Not given" },
              { key: "evidence", label: "Evidence", render: (row) => row.evidence + (row.evidenceRequired ? " (needed)" : "") },
            ]} />
          </Panel>
        );
      })}
    </Screen>
  );
}

/* ============================================================== Feedback */

const KIND_LABELS = { RATING: "Rating 1–5", TEXT: "Written answer", MCQ: "Multiple choice" };

export function FeedbackForms() {
  const { data, error, reload, loaded } = useLoad(["/v1/feedback/forms"]);
  const forms = rowsOf(data["/v1/feedback/forms"]);
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    if (forms.some((row) => row.name.toLowerCase() === v.name.trim().toLowerCase())) { run(() => Promise.reject(new Error("A form called " + v.name.trim() + " already exists."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/feedback/forms", { name: v.name.trim() }), "Form saved. Add its questions on the Field Master screen.");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Feedback forms" hint="Name a feedback form, add its questions, then open it to a class for a period.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New form">
        <Form onSubmit={add}>
          <Field label="Form name" wide><input name="name" placeholder="Teacher feedback, term 1" required /></Field>
          <Button type="submit">Add form</Button>
        </Form>
      </Panel>
      <DataTable rows={forms} empty={loaded ? "No forms yet." : "Loading…"} columns={[
        { key: "name", label: "Form" },
        { key: "fields", label: "Questions", render: (row) => (row.fields || []).length },
      ]} />
    </Screen>
  );
}

/** Read-only view of each form and its questions, as a student would see them. */
export function FeedbackFormPreview() {
  const { data, error, loaded } = useLoad(["/v1/feedback/forms"]);
  const forms = rowsOf(data["/v1/feedback/forms"]);
  const [formId, setFormId] = useState("");
  const form = forms.find((row) => row.id === formId);
  return (
    <Screen title="Feedback form" hint="See a form's questions exactly as they will be asked.">
      <Notice status={{ error }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Form" wide>
            <select value={formId} onChange={(event) => setFormId(event.target.value)}>
              <option value="">{loaded && !forms.length ? "No forms yet" : "Select form"}</option>
              {forms.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {form && (
        <Panel title={form.name}>
          {(form.fields || []).length ? (
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
              {form.fields.map((field) => (
                <li key={field.id}>
                  <strong>{field.label}</strong> <span className="ck-badge">{KIND_LABELS[field.kind] || field.kind}</span>
                  {field.kind === "MCQ" && <div>{(field.options || []).join(" · ")}</div>}
                </li>
              ))}
            </ol>
          ) : <p style={{ margin: 0 }}>This form has no questions yet.</p>}
        </Panel>
      )}
    </Screen>
  );
}

export function FeedbackFields() {
  const { data, error, reload, loaded } = useLoad(["/v1/feedback/forms"]);
  const forms = rowsOf(data["/v1/feedback/forms"]);
  const [kind, setKind] = useState("RATING");
  const [formId, setFormId] = useState("");
  const [status, run] = useStatus();
  const form = forms.find((row) => row.id === formId);

  async function add(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const v = formObject(event);
    const options = String(v.options || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (kind === "MCQ" && options.length < 2) { run(() => Promise.reject(new Error("Give at least two choices, separated by commas."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/feedback/fields", { formId, label: v.label, kind, options: kind === "MCQ" ? [...new Set(options)] : undefined }), "Question added");
    if (ok) { target.querySelector("[name=label]").value = ""; const o = target.querySelector("[name=options]"); if (o) o.value = ""; reload(); }
  }

  return (
    <Screen title="Field master" hint="The questions on each feedback form.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add question">
        <Form onSubmit={add}>
          <Field label="Form">
            <select value={formId} onChange={(event) => setFormId(event.target.value)} required>
              <option value="" disabled>{loaded && !forms.length ? "Add a form first" : "Select form"}</option>
              {forms.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Answer type">
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Question" wide><input name="label" placeholder="How clearly does the teacher explain?" required /></Field>
          {kind === "MCQ" && <Field label="Choices" wide><input name="options" placeholder="Always, Often, Sometimes, Never" required /></Field>}
          <Button type="submit" disabled={!formId}>Add question</Button>
        </Form>
      </Panel>
      {form && (
        <DataTable rows={form.fields || []} empty="No questions yet." columns={[
          { key: "label", label: "Question" },
          { key: "kind", label: "Type", render: (row) => KIND_LABELS[row.kind] || row.kind },
          { key: "options", label: "Choices", render: (row) => (row.options || []).join(", ") || "-" },
        ]} />
      )}
    </Screen>
  );
}

export function FeedbackAssign() {
  const { data, error, reload } = useLoad(["/v1/feedback/forms", "/v1/classes", "/v1/feedback/assignments"]);
  const forms = rowsOf(data["/v1/feedback/forms"]);
  const classes = rowsOf(data["/v1/classes"]);
  const open = rowsOf(data["/v1/feedback/assignments"]);
  const [status, run] = useStatus();

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const chosen = forms.find((row) => row.id === v.formId);
    if (!(chosen?.fields || []).length) { run(() => Promise.reject(new Error(chosen?.name + " has no questions yet. Add them on the Field Master screen."))); return; }
    if (new Date(v.closesAt) <= new Date(v.opensAt)) { run(() => Promise.reject(new Error("The window must close after it opens."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/feedback/assignments", { formId: v.formId, classId: v.classId || undefined, opensAt: v.opensAt, closesAt: v.closesAt }), chosen.name + " is open for feedback");
    if (ok) { form.reset(); reload(); }
  }

  return (
    <Screen title="Assign feedback form" hint="Open a form to one class, or to everyone, for a period.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Open a form">
        <Form onSubmit={submit}>
          <Field label="Form">
            <select name="formId" required defaultValue="">
              <option value="" disabled>Select form</option>
              {forms.map((row) => <option key={row.id} value={row.id}>{row.name} ({plural((row.fields || []).length, "question")})</option>)}
            </select>
          </Field>
          <Field label="Class">
            <select name="classId" defaultValue="">
              <option value="">All classes</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Opens"><input name="opensAt" type="datetime-local" required /></Field>
          <Field label="Closes"><input name="closesAt" type="datetime-local" required /></Field>
          <Button type="submit">Open form</Button>
        </Form>
      </Panel>
      <Panel title="Open now">
        <DataTable rows={open} empty="No form is open right now." columns={[
          { key: "form", label: "Form", render: (row) => row.form?.name },
          { key: "opensAt", label: "Opened", render: (row) => when(row.opensAt) },
          { key: "closesAt", label: "Closes", render: (row) => when(row.closesAt) },
        ]} />
      </Panel>
    </Screen>
  );
}

function Answer({ field }) {
  if (field.kind === "RATING") {
    return (
      <Field label={field.label} wide>
        <span style={{ display: "inline-flex", gap: 14, flexWrap: "wrap" }} role="radiogroup" aria-label={field.label}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <input type="radio" name={field.id} value={n} required /> {n}
            </label>
          ))}
        </span>
      </Field>
    );
  }
  if (field.kind === "MCQ") {
    return (
      <Field label={field.label} wide>
        <select name={field.id} required defaultValue="">
          <option value="" disabled>Choose</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Field>
    );
  }
  return <Field label={field.label} wide><textarea name={field.id} rows={3} maxLength={2000} required style={{ height: "auto", padding: 10 }} /></Field>;
}

function FillFeedbackScreen({ title, hint }) {
  const { data, error, loaded } = useLoad(["/v1/feedback/assignments"]);
  const assignments = rowsOf(data["/v1/feedback/assignments"]);
  const [assignmentId, setAssignmentId] = useState("");
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();
  const assignment = assignments.find((row) => row.id === assignmentId);

  async function submit(event) {
    event.preventDefault();
    if (!student || !assignment) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const answers = {};
    for (const field of assignment.form.fields || []) answers[field.id] = values.get(field.id) ?? "";
    const { ok } = await run(() => apiCall("POST", "/v1/feedback/responses", { assignmentId, respondentId: student.id, answers }), "Feedback from " + student.name + " submitted");
    if (ok) { form.reset(); setStudent(null); }
  }

  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {loaded && !assignments.length && <p className="ck-notice ck-notice-error">No feedback form is open right now. Open one on the Assign Form screen.</p>}
      <Panel>
        <Form onSubmit={submit} key={assignmentId}>
          <Field label="Form" wide>
            <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required>
              <option value="" disabled>Select form</option>
              {assignments.map((row) => <option key={row.id} value={row.id}>{row.form?.name} · closes {when(row.closesAt)}</option>)}
            </select>
          </Field>
          {assignment && <StudentPicker value={student} onPick={setStudent} />}
          {assignment && (assignment.form.fields || []).map((field) => <Answer key={field.id} field={field} />)}
          {assignment && <Button type="submit" disabled={!student}>Submit feedback</Button>}
        </Form>
      </Panel>
    </Screen>
  );
}

export function FillFeedback() { return <FillFeedbackScreen title="Fill feedback form" hint="Record a student's answers to an open feedback form. Each student can answer a form once." />; }
export function StudentRatingForm() { return <FillFeedbackScreen title="Student rating form" hint="Record a student's ratings on an open feedback form for NAAC. Each student can answer a form once." />; }

function SubmittedScreen({ title }) {
  const { data, error, reload, loaded } = useLoad(["/v1/feedback/responses"]);
  const rows = rowsOf(data["/v1/feedback/responses"]);
  const names = useStudentNames(rows.map((row) => row.respondentId));
  const [formName, setFormName] = useState("");
  const formsInList = useMemo(() => [...new Set(rows.map((row) => row.form))].sort(), [rows]);
  const shown = formName ? rows.filter((row) => row.form === formName) : rows;
  return (
    <Screen title={title} hint="Who has answered each feedback form.">
      <Notice status={{ error }} />
      <Panel title={plural(shown.length, "response")} actions={<Button variant="ghost" onClick={reload}>Refresh</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Form" wide>
            <select value={formName} onChange={(event) => setFormName(event.target.value)}>
              <option value="">All forms</option>
              {formsInList.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
        </Form>
        <DataTable rows={shown} empty={loaded ? "No responses yet." : "Loading…"} columns={[
          { key: "createdAt", label: "Submitted", render: (row) => when(row.createdAt) },
          { key: "form", label: "Form" },
          { key: "who", label: "Student", render: (row) => names[row.respondentId] || "Loading…" },
        ]} />
      </Panel>
    </Screen>
  );
}

export function SubmittedFeedback() { return <SubmittedScreen title="Submitted feedback" />; }
export function StudentFeedbackList() { return <SubmittedScreen title="Student feedback list" />; }

export function FeedbackReport() {
  const { data, error } = useLoad(["/v1/feedback/forms"]);
  const forms = rowsOf(data["/v1/feedback/forms"]);
  const [report, setReport] = useState(null);
  const [status, run] = useStatus();
  async function load(formId) {
    setReport(null);
    if (!formId) return;
    const { ok, result } = await run(() => apiCall("GET", "/v1/feedback/report?formId=" + encodeURIComponent(formId)), (json) => plural(json.responses ?? 0, "response"));
    if (ok) setReport(result);
  }
  return (
    <Screen title="Feedback report" hint="Average ratings, how often each choice was picked, and written answers for a form.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel actions={report && <Button variant="ghost" onClick={() => window.print()}>Print</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Form" wide>
            <select defaultValue="" onChange={(event) => load(event.target.value)}>
              <option value="">Select form</option>
              {forms.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {report && (report.fields || []).map((field) => (
        <Panel key={field.id || field.label} title={field.label}>
          {field.kind === "RATING" && (field.average == null || Number.isNaN(Number(field.average)) ? <p style={{ margin: 0 }}>No ratings yet.</p> : <Row><strong>{Number(field.average).toFixed(2)}</strong> out of 5 <Bar percent={(Number(field.average) / 5) * 100} /></Row>)}
          {field.kind === "MCQ" && (
            <DataTable rows={Object.entries(field.counts || {}).map(([option, count]) => ({ option, count }))} rowKey={(row) => row.option} empty="No answers yet." columns={[
              { key: "option", label: "Choice" },
              { key: "count", label: "Picked" },
              { key: "share", label: "Share", render: (row) => <Bar percent={report.responses ? Math.round((row.count / report.responses) * 100) : 0} /> },
            ]} />
          )}
          {field.kind === "TEXT" && ((field.texts || []).length ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>{field.texts.map((text, index) => <li key={index}>{text}</li>)}</ul>
          ) : <p style={{ margin: 0 }}>No written answers yet.</p>)}
        </Panel>
      ))}
    </Screen>
  );
}
