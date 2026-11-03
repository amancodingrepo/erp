import React, { useEffect, useState } from "react";
import {
  Button, DataTable, Field, Form, Notice, Panel, Row, Screen, StudentPicker,
  apiCall, dateOnly, formObject, lineProblem, plural, rowsOf, staffName, titleCase, uploadForm, useLoad, useStatus
} from "../kit.jsx";

// Screens the old app wired to the wrong panel, rebuilt on the endpoints that actually do the job
// (apps/erp/src/app/api/v1/students/[id]/{admit-card,marksheet,photo,documents,enable},
// students/photos, leave-requests, reminders/fees).

async function allStudents(params) {
  const rows = [];
  for (let page = 1; page < 200; page += 1) {
    const json = await apiCall("GET", "/v1/students?" + new URLSearchParams({ ...params, page: String(page), pageSize: "100" }));
    const batch = rowsOf(json);
    rows.push(...batch);
    if (!batch.length || rows.length >= Number(json.total ?? rows.length)) break;
  }
  return rows;
}

function ClassPicker({ classId, sectionId, onChange }) {
  const { data } = useLoad(["/v1/classes"]);
  const classes = rowsOf(data["/v1/classes"]);
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  return (
    <>
      <Field label="Class"><select value={classId} onChange={(event) => onChange(event.target.value, "")}><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Section"><select value={sectionId} onChange={(event) => onChange(classId, event.target.value)} disabled={!classId}><option value="">All sections</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    </>
  );
}

function useClassStudents(classId, sectionId, run) {
  const [students, setStudents] = useState(null);
  useEffect(() => {
    if (!classId) { setStudents(null); return; }
    let live = true;
    run(() => allStudents({ classId, ...(sectionId ? { sectionId } : {}) }).then((rows) => { if (live) setStudents(rows); return rows; }), (rows) => plural(rows.length, "student"));
    return () => { live = false; };
  }, [classId, sectionId]);
  return students;
}

/* ------------------------------------------------------- Disabled students */

export function DisabledStudents() {
  const [rows, setRows] = useState(null);
  const [status, run] = useStatus();
  async function load() {
    try { setRows(await allStudents({ status: "DISABLED" })); } catch (reason) { run(() => Promise.reject(reason)); }
  }
  useEffect(() => { load(); }, []);
  async function enable(row) {
    if (!window.confirm("Enable " + row.name + " again? They return to the active student list.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/students/" + row.id + "/enable"), row.name + " is active again");
    if (ok) load();
  }
  return (
    <Screen title="Disabled students" hint="Students who were disabled (left, transferred or blocked). Enable one to bring them back.">
      <Notice status={status} />
      <DataTable rows={rows || []} empty={rows ? "No disabled students." : "Loading…"} columns={[
        { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Name" },
        { key: "class", label: "Last class", render: (r) => [r.class, r.section].filter(Boolean).join(" ") || "-" },
        { key: "mobile", label: "Mobile", render: (r) => r.mobile || "-" },
        { key: "act", label: "", render: (r) => <Button variant="ghost" onClick={() => enable(r)}>Enable</Button> },
      ]} />
    </Screen>
  );
}

/* ------------------------------------------------- Photos and documents */

export function UploadStudentPhoto() {
  const [student, setStudent] = useState(null);
  const [result, setResult] = useState(null);
  const [status, run] = useStatus();
  async function single(event) {
    event.preventDefault();
    if (!student) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || !file.size) { run(() => Promise.reject(new Error("Choose a photo."))); return; }
    if (!/^image\//.test(file.type)) { run(() => Promise.reject(new Error("The photo must be an image file."))); return; }
    const { ok } = await run(async () => {
      const body = new FormData();
      body.append("file", file);
      const { ok: done, json } = await uploadForm("/v1/students/" + student.id + "/photo", body);
      if (!done) throw new Error(json.fields ? Object.values(json.fields).join(". ") : json.message || "Upload failed.");
      return json;
    }, "Photo saved for " + student.name);
    if (ok) { form.reset(); setStudent(null); }
  }
  async function bulk(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("csv");
    if (!(file instanceof File) || !file.size) return;
    const body = new FormData();
    body.append("file", file);
    const { ok } = await run(async () => {
      const { ok: done, json } = await uploadForm("/v1/students/photos", body);
      if (!done) throw new Error(json.fields?.file || json.message || "Upload failed.");
      setResult(json);
      return json;
    }, (json) => json.updated + " of " + json.total + " photos linked");
    if (ok) form.reset();
  }
  return (
    <Screen title="Upload student photo" hint="Add one student's photo, or link many at once from a CSV of photo links.">
      <Notice status={status} />
      <Panel title="One student">
        <Form onSubmit={single}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label="Photo"><input name="file" type="file" accept="image/*" required /></Field>
          <Button type="submit" disabled={!student}>Upload</Button>
        </Form>
      </Panel>
      <Panel title="Many students (CSV)">
        <p style={{ margin: "0 0 8px" }}>Columns: <code>admissionNo</code> (or <code>scholarNo</code> / <code>enrollmentNo</code>) and <code>photoUrl</code>, one row per student.</p>
        <Form onSubmit={bulk}>
          <Field label="CSV file"><input name="csv" type="file" accept=".csv,text/csv" required /></Field>
          <Button type="submit">Link photos</Button>
        </Form>
        {result?.errors?.length > 0 && (
          <DataTable rows={result.errors} rowKey={(r, i) => i} columns={[{ key: "line", label: "Line" }, { key: "message", label: "Problem", render: lineProblem }]} />
        )}
      </Panel>
    </Screen>
  );
}

export function UploadStudentDocuments() {
  const [student, setStudent] = useState(null);
  const [docs, setDocs] = useState(null);
  const [status, run] = useStatus();
  async function load(s = student) {
    if (!s) { setDocs(null); return; }
    try { setDocs(rowsOf(await apiCall("GET", "/v1/students/" + s.id + "/documents"))); } catch (reason) { run(() => Promise.reject(reason)); }
  }
  useEffect(() => { load(); }, [student?.id]);
  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");
    if (!(file instanceof File) || !file.size) { run(() => Promise.reject(new Error("Choose a file."))); return; }
    const body = new FormData();
    body.append("title", String(values.get("title") || "").trim());
    body.append("file", file);
    const { ok } = await run(async () => {
      const { ok: done, json } = await uploadForm("/v1/students/" + student.id + "/documents", body);
      if (!done) throw new Error(json.fields ? Object.values(json.fields).join(". ") : json.message || "Upload failed.");
      return json;
    }, "Document saved");
    if (ok) { form.reset(); load(); }
  }
  return (
    <Screen title="Upload student documents" hint="Birth certificates, transfer certificates, mark sheets and other papers for a student. Allowed file types are set under System Setting, then File Types.">
      <Notice status={status} />
      <Panel>
        <StudentPicker value={student} onPick={setStudent} />
      </Panel>
      {student && (
        <>
          <Panel title={"Add document for " + student.name}>
            <Form onSubmit={upload}>
              <Field label="Document"><input name="title" placeholder="Transfer certificate" required /></Field>
              <Field label="File"><input name="file" type="file" required /></Field>
              <Button type="submit">Upload</Button>
            </Form>
          </Panel>
          <DataTable rows={docs || []} empty={docs ? "No documents yet." : "Loading…"} columns={[
            { key: "title", label: "Document" }, { key: "createdAt", label: "Added", render: (r) => dateOnly(r.createdAt) },
            { key: "open", label: "", render: (r) => <a href={r.fileUrl} target="_blank" rel="noreferrer">Open</a> },
          ]} />
        </>
      )}
    </Screen>
  );
}

/* ---------------------------------------------- Admit cards and marksheets */

function ExamPdfScreen({ title, hint, kind }) {
  const { data, error } = useLoad(["/v1/exam-groups"]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const [groupId, setGroupId] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, run] = useStatus();
  const students = useClassStudents(classId, sectionId, run);
  const exams = groups.find((g) => g.id === groupId)?.exams || [];
  const ready = kind === "admit" ? Boolean(examId) : Boolean(groupId);
  const href = (id) => "/api/v1/students/" + id + "/" + (kind === "admit" ? "admit-card?examId=" + examId : "marksheet?" + (examId ? "examId=" + examId : "examGroupId=" + groupId)) + "&format=pdf";
  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Exam group"><select value={groupId} onChange={(event) => { setGroupId(event.target.value); setExamId(""); }}><option value="">Select group</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label={kind === "admit" ? "Exam" : "Exam (optional)"}><select value={examId} onChange={(event) => setExamId(event.target.value)} disabled={!groupId}><option value="">{kind === "admit" ? "Select exam" : "Whole group"}</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
          <ClassPicker classId={classId} sectionId={sectionId} onChange={(c, s) => { setClassId(c); setSectionId(s); }} />
        </Form>
        {!ready && <p style={{ margin: "8px 0 0" }}>{kind === "admit" ? "Pick an exam group and exam." : "Pick an exam group."}</p>}
      </Panel>
      {ready && students && (
        <DataTable rows={students} empty="No students in this class." columns={[
          { key: "admissionNo", label: "Admission no" }, { key: "rollNo", label: "Roll", render: (r) => r.rollNo || "-" }, { key: "name", label: "Student" },
          { key: "class", label: "Class", render: (r) => [r.class, r.section].filter(Boolean).join(" ") || "-" },
          { key: "pdf", label: "", render: (r) => <a className="ck-btn ck-btn-ghost" href={href(r.id)} target="_blank" rel="noreferrer">{kind === "admit" ? "Admit card PDF" : "Marksheet PDF"}</a> },
        ]} />
      )}
    </Screen>
  );
}
export const PrintAdmitCard = () => <ExamPdfScreen kind="admit" title="Print admit card" hint="Admit cards for an exam, class by class." />;
export const PrintMarksheet = () => <ExamPdfScreen kind="marksheet" title="Print marksheet" hint="Marksheets for an exam group or one exam, class by class. Only finalised marks are reliable." />;

/* -------------------------------------------------------- Staff apply leave */

export function StaffApplyLeave() {
  const { data, error, reload, loaded } = useLoad(["/v1/leave-types", "/v1/staff", "/v1/leave-requests", "/v1/auth/me"]);
  const types = rowsOf(data["/v1/leave-types"]);
  const staff = rowsOf(data["/v1/staff"]);
  const meId = data["/v1/auth/me"]?.user?.id;
  const mine = staff.find((s) => s.login?.id === meId);
  const requests = rowsOf(data["/v1/leave-requests"]).filter((r) => r.staffId);
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    if (v.toDate < v.fromDate) { run(() => Promise.reject(new Error("The last day is before the first day."))); return; }
    const clash = requests.find((r) => r.staffId === v.staffId && r.status !== "REJECTED" && dateOnly(r.fromDate) <= v.toDate && v.fromDate <= dateOnly(r.toDate));
    if (clash && !window.confirm("This overlaps a " + titleCase(clash.status) + " request (" + dateOnly(clash.fromDate) + " to " + dateOnly(clash.toDate) + "). Apply anyway?")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/leave-requests", { staffId: v.staffId, leaveTypeId: v.leaveTypeId, fromDate: v.fromDate, toDate: v.toDate, reason: v.reason || undefined }), "Leave applied. It now waits for approval on Approve Leave Request.");
    if (ok) { form.reset(); reload(); }
  }
  const name = (id) => staffName(staff.find((s) => s.id === id)) || "Staff";
  return (
    <Screen title="Apply leave" hint="Apply for staff leave. Requests are approved on the Approve Leave Request screen.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New request">
        <Form onSubmit={submit} key={mine?.id || "x"}>
          <Field label="Staff"><select name="staffId" required defaultValue={mine?.id || ""}><option value="" disabled>Select staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)}{s.id === mine?.id ? " (you)" : ""}</option>)}</select></Field>
          <Field label="Leave type"><select name="leaveTypeId" required defaultValue=""><option value="" disabled>{types.length ? "Select type" : "Add leave types first"}</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="From"><input name="fromDate" type="date" required /></Field>
          <Field label="To"><input name="toDate" type="date" required /></Field>
          <Field label="Reason" wide><input name="reason" /></Field>
          <Button type="submit">Apply</Button>
        </Form>
      </Panel>
      <DataTable rows={requests} empty={loaded ? "No staff leave requests yet." : "Loading…"} columns={[
        { key: "staff", label: "Staff", render: (r) => name(r.staffId) }, { key: "type", label: "Type", render: (r) => r.leaveType?.name || "-" },
        { key: "dates", label: "Dates", render: (r) => dateOnly(r.fromDate) + (dateOnly(r.toDate) !== dateOnly(r.fromDate) ? " to " + dateOnly(r.toDate) : "") },
        { key: "reason", label: "Reason", render: (r) => r.reason || "-" }, { key: "status", label: "Status", render: (r) => titleCase(r.status) },
      ]} />
    </Screen>
  );
}

/* ------------------------------------------------------------ Fee reminder */

export function FeesReminder() {
  const { data, error } = useLoad(["/v1/message-templates"]);
  const templates = rowsOf(data["/v1/message-templates"]).filter((t) => t.name === "fee_due");
  const [status, run] = useStatus();
  const has = (channel) => templates.some((t) => t.channel === channel);
  async function send(channel) {
    const label = channel === "EMAIL" ? "email" : "SMS";
    if (!window.confirm("Send a fee reminder " + label + " to every student who owes fees? Each message includes their balance. This cannot be undone.")) return;
    await run(() => apiCall("POST", "/v1/reminders/fees", { channel }), (json) => plural(Number(json.sent || 0), "reminder") + " sent" + (Number(json.skipped) ? ", " + json.skipped + " skipped (no " + (channel === "EMAIL" ? "email address" : "mobile number") + ")" : ""));
  }
  return (
    <Screen title="Fees reminder" hint="Remind every student with unpaid fees, using the template named fee_due. Placeholders filled in: {{name}} {{admissionNo}} {{balance}} {{campus}}.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        {!has("SMS") && !has("EMAIL") && data["/v1/message-templates"] && <p className="ck-notice ck-notice-error">Create a template named fee_due on the SMS Template or Email Template screen first.</p>}
        <Row>
          <Button onClick={() => send("SMS")} disabled={!has("SMS")}>Send SMS reminders</Button>
          <Button variant="ghost" onClick={() => send("EMAIL")} disabled={!has("EMAIL")}>Send email reminders</Button>
        </Row>
      </Panel>
    </Screen>
  );
}
