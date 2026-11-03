import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, Row, Screen, StudentPicker,
  apiCall, dateOnly, formObject, plural, rowsOf, staffName, titleCase, useLoad, useStatus, useStudentNames
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/copo-ops.tsx, seating-ops.tsx, live-class-ops.tsx and
// certificate-ops.tsx, with the same endpoints.

const when = (value) => (value ? new Date(value).toLocaleString() : "-");

function papersOfGroups(groups, subjects) {
  const name = (id) => subjects.find((s) => s.id === id)?.name || "Subject";
  return groups.flatMap((g) => (g.exams || []).flatMap((e) => (e.subjects || []).map((p) => ({ id: p.id, label: name(p.subjectId) + " · " + e.name + " · " + g.name, date: p.dateFrom }))));
}

/* ==================================================================== CO-PO */

export function ProgramOutcomes() {
  const { data, error, reload, loaded } = useLoad(["/v1/programs", "/v1/copo/program-outcomes"]);
  const programs = rowsOf(data["/v1/programs"]);
  const rows = rowsOf(data["/v1/copo/program-outcomes"]);
  const [programId, setProgramId] = useState("");
  const [status, run] = useStatus();
  const shown = programId ? rows.filter((r) => r.program?.id === programId) : rows;
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/copo/program-outcomes", { programId: v.programId, kind: v.kind, code: v.code.trim().toUpperCase(), title: v.title.trim() }), "Outcome saved");
    if (ok) { form.querySelector("[name=code]").value = ""; form.querySelector("[name=title]").value = ""; reload(); }
  }
  return (
    <Screen title="Program outcomes" hint="What a graduate of each program should be able to do (POs), plus program-specific outcomes (PSOs).">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add outcome">
        <Form onSubmit={add}>
          <Field label="Program">
            <select name="programId" required value={programId} onChange={(event) => setProgramId(event.target.value)}>
              <option value="" disabled>Select program</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select name="kind" defaultValue="PO"><option value="PO">PO</option><option value="PSO">PSO</option></select>
          </Field>
          <Field label="Code"><input name="code" placeholder="PO1" required /></Field>
          <Field label="Outcome" wide><input name="title" placeholder="Apply knowledge of accounting principles" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No outcomes yet." : "Loading…"} columns={[
        { key: "program", label: "Program", render: (r) => r.program?.name || "-" },
        { key: "code", label: "Code", render: (r) => r.kind + " " + r.code },
        { key: "title", label: "Outcome" },
        { key: "indirect", label: "Indirect %", render: (r) => (r.indirect?.percent != null ? String(Number(r.indirect.percent)) : "-") },
      ]} />
    </Screen>
  );
}

export function CourseOutcomes() {
  const { data, error, reload, loaded } = useLoad(["/v1/subjects", "/v1/copo/course-outcomes", "/v1/exam-groups"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const rows = rowsOf(data["/v1/copo/course-outcomes"]);
  const papers = papersOfGroups(rowsOf(data["/v1/exam-groups"]), subjects);
  const [subjectId, setSubjectId] = useState("");
  const [status, run] = useStatus();
  const shown = subjectId ? rows.filter((r) => r.subject?.id === subjectId) : rows;
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/copo/course-outcomes", { subjectId: v.subjectId, code: v.code.trim().toUpperCase(), title: v.title.trim() }), "Course outcome saved");
    if (ok) { form.querySelector("[name=code]").value = ""; form.querySelector("[name=title]").value = ""; reload(); }
  }
  // The old screens never linked outcomes to exam papers, so direct attainment always came out as zero.
  async function link(event) {
    event.preventDefault();
    const v = formObject(event);
    await run(() => apiCall("POST", "/v1/copo/assessments", { courseOutcomeId: v.courseOutcomeId, examSubjectId: v.examSubjectId }), "Outcome linked to the exam paper. Its marks now count towards attainment.");
  }
  return (
    <Screen title="Course outcomes" hint="What students should learn in each subject (COs). Link each outcome to the exam papers that test it so attainment can be worked out.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add course outcome">
        <Form onSubmit={add}>
          <Field label="Subject">
            <select name="subjectId" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="" disabled>Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Code"><input name="code" placeholder="CO1" required /></Field>
          <Field label="Outcome" wide><input name="title" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No course outcomes yet." : "Loading…"} columns={[
        { key: "subject", label: "Subject", render: (r) => r.subject?.name || "-" }, { key: "code", label: "Code" }, { key: "title", label: "Outcome" },
      ]} />
      <Panel title="Link an outcome to an exam paper">
        <Form onSubmit={link}>
          <Field label="Course outcome">
            <select name="courseOutcomeId" required defaultValue="">
              <option value="" disabled>Select outcome</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{(r.subject?.name || "") + " · " + r.code}</option>)}
            </select>
          </Field>
          <Field label="Exam paper" wide>
            <select name="examSubjectId" required defaultValue="">
              <option value="" disabled>{papers.length ? "Select paper" : "No exam papers yet"}</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Button type="submit">Link</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function CoPoMapping() {
  const { data, error, reload, loaded } = useLoad(["/v1/copo/course-outcomes", "/v1/copo/program-outcomes", "/v1/copo/mappings", "/v1/subjects"]);
  const cos = rowsOf(data["/v1/copo/course-outcomes"]);
  const pos = rowsOf(data["/v1/copo/program-outcomes"]);
  const maps = rowsOf(data["/v1/copo/mappings"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const [subjectId, setSubjectId] = useState("");
  const [status, run] = useStatus();
  const shownCos = subjectId ? cos.filter((c) => c.subject?.id === subjectId) : cos;
  const weightOf = (coId, poId) => maps.find((m) => (m.courseOutcomeId || m.courseOutcome?.id) === coId && (m.programOutcomeId || m.programOutcome?.id) === poId)?.weight ?? "";
  async function set(co, po, weight) {
    const { ok } = await run(() => apiCall("POST", "/v1/copo/mappings", { courseOutcomeId: co.id, programOutcomeId: po.id, weight: Number(weight) }), co.code + " → " + po.code + " set to " + weight);
    if (ok) reload();
  }
  return (
    <Screen title="CO-PO mapping" hint="How strongly each course outcome supports each program outcome: 0 none, 1 low, 2 medium, 3 high.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Subject">
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {loaded && (!cos.length || !pos.length) && <p className="ck-notice ck-notice-error">Add course outcomes and program outcomes first.</p>}
      {shownCos.length > 0 && pos.length > 0 && (
        <DataTable rows={shownCos} empty="No course outcomes for this subject." columns={[
          { key: "co", label: "Course outcome", render: (r) => (r.subject?.name ? r.subject.name + " · " : "") + r.code },
          ...pos.map((po) => ({ key: po.id, label: po.kind + " " + po.code, render: (co) => (
            <select aria-label={co.code + " to " + po.code} value={String(weightOf(co.id, po.id))} onChange={(event) => event.target.value !== "" && set(co, po, event.target.value)} style={{ width: 60 }}>
              <option value="">-</option>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) })),
        ]} />
      )}
    </Screen>
  );
}

export function IndirectPo() {
  const { data, error, reload, loaded } = useLoad(["/v1/copo/program-outcomes"]);
  const pos = rowsOf(data["/v1/copo/program-outcomes"]);
  const [status, run] = useStatus();
  async function save(po, value) {
    const percent = Number(value);
    if (!(percent >= 0 && percent <= 100)) { run(() => Promise.reject(new Error("Enter a percentage from 0 to 100."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/copo/indirect", { programOutcomeId: po.id, percent }), po.code + " indirect attainment set to " + percent + "%");
    if (ok) reload();
  }
  return (
    <Screen title="Indirect PO mapping" hint="Attainment from surveys and feedback (for example, an exit survey), as a percentage for each program outcome.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <DataTable rows={pos} empty={loaded ? "Add program outcomes first." : "Loading…"} columns={[
        { key: "program", label: "Program", render: (r) => r.program?.name || "-" }, { key: "code", label: "Outcome", render: (r) => r.kind + " " + r.code + " · " + r.title },
        { key: "pct", label: "Indirect %", render: (r) => (
          <form onSubmit={(event) => { event.preventDefault(); save(r, new FormData(event.currentTarget).get("pct")); }} style={{ display: "inline-flex", gap: 6 }}>
            <input name="pct" type="number" min="0" max="100" step="0.01" defaultValue={r.indirect?.percent != null ? Number(r.indirect.percent) : ""} aria-label={"Indirect percent for " + r.code} style={{ width: 80 }} />
            <Button type="submit" variant="ghost">Save</Button>
          </form>
        ) },
      ]} />
    </Screen>
  );
}

export function ObeAttainment() {
  const { data, error } = useLoad(["/v1/programs"]);
  const programs = rowsOf(data["/v1/programs"]);
  const [rows, setRows] = useState(null);
  const [status, run] = useStatus();
  async function compute(programId) {
    setRows(null);
    if (!programId) return;
    const { ok, result } = await run(() => apiCall("GET", "/v1/copo/attainment?programId=" + encodeURIComponent(programId)), (json) => plural(rowsOf(json).length, "outcome"));
    if (ok) setRows(rowsOf(result));
  }
  return (
    <Screen title="Outcome basis education" hint="Attainment of each program outcome: direct (from marks in linked exam papers), indirect (from surveys) and overall.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel actions={rows && <Button variant="ghost" onClick={() => window.print()}>Print</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Program">
            <select defaultValue="" onChange={(event) => compute(event.target.value)}>
              <option value="">Select program</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {rows && (
        <DataTable rows={rows} rowKey={(r) => r.code} empty="No outcomes for this program." columns={[
          { key: "code", label: "Outcome" }, { key: "direct", label: "Direct", render: (r) => r.direct + "%" },
          { key: "indirect", label: "Indirect", render: (r) => (r.indirect == null ? "-" : r.indirect + "%") }, { key: "overall", label: "Overall", render: (r) => <strong>{r.overall}%</strong> },
        ]} />
      )}
      {rows && rows.length > 0 && rows.every((r) => !Number(r.direct)) && <p className="ck-notice ck-notice-error">Direct attainment is 0 everywhere. Link course outcomes to exam papers on the Course Outcomes screen, and make sure those papers have marks.</p>}
    </Screen>
  );
}

const LESSON_STATUS = { SUBMITTED: "Waiting for approval", APPROVED: "Approved", REJECTED: "Rejected" };
export function TeachingPlans() {
  const { data, error, reload, loaded } = useLoad(["/v1/subjects", "/v1/copo/course-outcomes", "/v1/copo/lessons"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const cos = rowsOf(data["/v1/copo/course-outcomes"]);
  const lessons = rowsOf(data["/v1/copo/lessons"]);
  const [subjectId, setSubjectId] = useState("");
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/copo/lessons", { subjectId: v.subjectId, title: v.title.trim(), courseOutcomeId: v.courseOutcomeId || undefined }), "Plan submitted for approval");
    if (ok) { form.querySelector("[name=title]").value = ""; reload(); }
  }
  return (
    <Screen title="Teaching-learning plan" hint="Lessons planned against course outcomes. Each plan goes for approval on the TLP Approve List.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Submit a plan">
        <Form onSubmit={add}>
          <Field label="Subject">
            <select name="subjectId" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="" disabled>Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Course outcome">
            <select name="courseOutcomeId" defaultValue="" key={subjectId}>
              <option value="">None</option>
              {cos.filter((c) => !subjectId || c.subject?.id === subjectId).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
            </select>
          </Field>
          <Field label="Lesson" wide><input name="title" required /></Field>
          <Button type="submit">Submit plan</Button>
        </Form>
      </Panel>
      <DataTable rows={lessons} empty={loaded ? "No plans yet." : "Loading…"} columns={[
        { key: "subject", label: "Subject", render: (r) => r.subject?.name || "-" }, { key: "title", label: "Lesson" },
        { key: "co", label: "Outcome", render: (r) => r.courseOutcome?.code || "-" }, { key: "status", label: "Status", render: (r) => LESSON_STATUS[r.status] || titleCase(r.status) },
      ]} />
    </Screen>
  );
}

export function TlpApprove() {
  const { data, error, reload, loaded } = useLoad(["/v1/copo/lessons"]);
  const lessons = rowsOf(data["/v1/copo/lessons"]);
  const [showAll, setShowAll] = useState(false);
  const [status, run] = useStatus();
  const shown = showAll ? lessons : lessons.filter((l) => l.status === "SUBMITTED");
  async function review(row, next) {
    if (next === "REJECTED" && !window.confirm("Reject \"" + row.title + "\"? It cannot be approved later.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/copo/lessons/" + row.id + "/review", { status: next }), "\"" + row.title + "\" " + (next === "APPROVED" ? "approved" : "rejected"));
    if (ok) reload();
  }
  return (
    <Screen title="TLP approve list" hint="Teaching-learning plans waiting for approval.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={plural(lessons.filter((l) => l.status === "SUBMITTED").length, "plan") + " waiting"} actions={<Check label="Show all plans" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />}>
        <DataTable rows={shown} empty={loaded ? "Nothing waiting for approval." : "Loading…"} columns={[
          { key: "subject", label: "Subject", render: (r) => r.subject?.name || "-" }, { key: "title", label: "Lesson" },
          { key: "co", label: "Outcome", render: (r) => r.courseOutcome?.code || "-" }, { key: "status", label: "Status", render: (r) => LESSON_STATUS[r.status] || titleCase(r.status) },
          { key: "act", label: "", render: (r) => (r.status === "SUBMITTED" ? <Row><Button variant="ghost" onClick={() => review(r, "APPROVED")}>Approve</Button><Button variant="danger" onClick={() => review(r, "REJECTED")}>Reject</Button></Row> : null) },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ================================================================== Seating */

export function SeatingBlocks() {
  const { data, error, reload, loaded } = useLoad(["/v1/seating/blocks"]);
  const rows = rowsOf(data["/v1/seating/blocks"]);
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const existing = rows.find((r) => r.name.toLowerCase() === v.name.trim().toLowerCase());
    const { ok } = await run(() => apiCall("POST", "/v1/seating/blocks", { name: v.name.trim(), capacity: Number(v.capacity) }), existing ? existing.name + " now has " + v.capacity + " seats" : "Block saved");
    if (ok) { form.reset(); reload(); }
  }
  const total = rows.reduce((s, r) => s + Number(r.capacity || 0), 0);
  return (
    <Screen title="Exam blocks" hint="Rooms used for exams and how many students each one seats. Saving an existing name changes its seats.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add block">
        <Form onSubmit={add}>
          <Field label="Block / room"><input name="name" required /></Field>
          <Field label="Seats"><input name="capacity" type="number" min="1" defaultValue="30" required /></Field>
          <Button type="submit">Save</Button>
        </Form>
      </Panel>
      <Panel title={plural(rows.length, "block") + " · " + plural(total, "seat")}>
        <DataTable rows={rows} empty={loaded ? "No blocks yet." : "Loading…"} columns={[{ key: "name", label: "Block" }, { key: "capacity", label: "Seats" }]} />
      </Panel>
    </Screen>
  );
}

export function SeatingAllocate() {
  const { data, error } = useLoad(["/v1/seating/blocks", "/v1/classes", "/v1/exam-groups", "/v1/subjects"]);
  const blocks = rowsOf(data["/v1/seating/blocks"]);
  const classes = rowsOf(data["/v1/classes"]);
  const papers = papersOfGroups(rowsOf(data["/v1/exam-groups"]), rowsOf(data["/v1/subjects"]));
  const [picked, setPicked] = useState(new Set());
  const [result, setResult] = useState(null);
  const [status, run] = useStatus();
  const seats = blocks.filter((b) => picked.has(b.id)).reduce((s, b) => s + Number(b.capacity || 0), 0);
  async function submit(event) {
    event.preventDefault();
    const v = formObject(event);
    const paper = papers.find((p) => p.id === v.examSubjectId);
    if (!picked.size) { run(() => Promise.reject(new Error("Tick at least one block."))); return; }
    let existing = 0;
    try { existing = rowsOf(await apiCall("GET", "/v1/seating/assignments?examSubjectId=" + encodeURIComponent(v.examSubjectId))).length; } catch { existing = 0; }
    if (existing && !window.confirm(plural(existing, "student") + (existing === 1 ? " is" : " are") + " already seated for " + (paper?.label || "this paper") + ". Seating again replaces those seats. Continue?")) return;
    const { ok, result: res } = await run(() => apiCall("POST", "/v1/seating/allocate", { examSubjectId: v.examSubjectId, blockIds: [...picked], classId: v.classId || undefined }), (json) => plural(rowsOf(json).length, "student") + " seated");
    if (ok) setResult(rowsOf(res));
  }
  return (
    <Screen title="Assign block" hint="Seat a paper's students across the chosen blocks, in roll-number order.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={submit}>
          <Field label="Exam paper" wide>
            <select name="examSubjectId" required defaultValue="">
              <option value="" disabled>{papers.length ? "Select paper" : "No exam papers yet"}</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.label}{p.date ? " · " + dateOnly(p.date) : ""}</option>)}
            </select>
          </Field>
          <Field label="Only class">
            <select name="classId" defaultValue="">
              <option value="">All classes taking the paper</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={"Blocks (" + plural(seats, "seat") + " picked)"} wide>
            {blocks.length ? <div className="ck-checklist">{blocks.map((b) => <Check key={b.id} label={b.name + " · " + b.capacity + " seats"} checked={picked.has(b.id)} onChange={(event) => setPicked((s) => { const n = new Set(s); if (event.target.checked) n.add(b.id); else n.delete(b.id); return n; })} />)}</div> : <div className="ck-empty">Add blocks on the Subject Details screen first.</div>}
          </Field>
          <Button type="submit">Seat students</Button>
        </Form>
      </Panel>
      {result && (
        <DataTable rows={result} empty="Nobody seated." columns={[
          { key: "seatNo", label: "Seat" }, { key: "block", label: "Block" }, { key: "adm", label: "Admission no", render: (r) => r.student?.admissionNo }, { key: "name", label: "Student", render: (r) => r.student?.name },
        ]} />
      )}
    </Screen>
  );
}

export function SeatingReport() {
  const { data, error, loaded } = useLoad(["/v1/seating/assignments"]);
  const rows = rowsOf(data["/v1/seating/assignments"]);
  const exams = [...new Set(rows.map((r) => r.exam))];
  const [exam, setExam] = useState("");
  const [block, setBlock] = useState("");
  const blocks = [...new Set(rows.filter((r) => !exam || r.exam === exam).map((r) => r.block))];
  const shown = rows.filter((r) => (!exam || r.exam === exam) && (!block || r.block === block));
  return (
    <Screen title="Seating report" hint="Who sits where. Print a block's list to put on the door.">
      <Notice status={{ error }} />
      <Panel actions={<Button variant="ghost" onClick={() => window.print()}>Print</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Exam"><select value={exam} onChange={(event) => { setExam(event.target.value); setBlock(""); }}><option value="">All exams</option>{exams.map((e) => <option key={e} value={e}>{e}</option>)}</select></Field>
          <Field label="Block"><select value={block} onChange={(event) => setBlock(event.target.value)}><option value="">All blocks</option>{blocks.map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No seats assigned yet." : "Loading…"} columns={[
        { key: "exam", label: "Exam" }, { key: "block", label: "Block" }, { key: "seatNo", label: "Seat" },
        { key: "adm", label: "Admission no", render: (r) => r.student?.admissionNo }, { key: "name", label: "Student", render: (r) => r.student?.name },
      ]} />
    </Screen>
  );
}

/* ============================================================ Live classes */

const PROVIDER = { GMEET: { name: "Google Meet", host: "meet.google.com" }, ZOOM: { name: "Zoom", host: "zoom.us" } };

function LiveClasses({ provider, meeting, report }) {
  const p = PROVIDER[provider];
  const path = "/v1/live-classes?provider=" + provider;
  const { data, error, reload, loaded } = useLoad([path, "/v1/classes", "/v1/subjects", "/v1/staff"]);
  const all = rowsOf(data[path]);
  // Meetings are sessions with no class; live classes have one.
  const rows = all.filter((r) => (meeting ? !r.class : Boolean(r.class)));
  const [status, run] = useStatus();
  const now = Date.now();
  const shown = report ? rows.filter((r) => new Date(r.startsAt).getTime() < now) : rows.slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const kind = meeting ? "meeting" : "class";

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    if (!/^https:\/\//i.test(v.meetingUrl)) { run(() => Promise.reject(new Error("The link must start with https://."))); return; }
    if (!v.meetingUrl.toLowerCase().includes(p.host) && !window.confirm("This link is not a " + p.name + " link (" + p.host + "). Save it anyway?")) return;
    const klass = rowsOf(data["/v1/classes"]).find((c) => c.id === v.classId);
    if (!meeting && klass && !klass.virtualClassroom) { run(() => Promise.reject(new Error(klass.name + " does not have Virtual class turned on. Turn it on for the class on Academics, then Class, and try again."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/live-classes", {
      provider, title: v.title.trim(), meetingUrl: v.meetingUrl.trim(), recordingUrl: v.recordingUrl || undefined, startsAt: v.startsAt,
      classId: meeting ? undefined : v.classId, subjectId: v.subjectId || undefined, staffId: v.staffId || undefined,
    }), "Live " + kind + " scheduled");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(row) {
    if (!window.confirm("Delete \"" + row.title + "\"?")) return;
    const { ok } = await run(() => apiCall("DELETE", "/v1/live-classes/" + row.id), "Deleted");
    if (ok) reload();
  }

  return (
    <Screen title={p.name + " " + (report ? "live " + kind + " report" : "live " + (meeting ? "meetings" : "classes"))} hint={report ? "Past " + p.name + " sessions, with recordings where saved." : "Schedule " + p.name + " sessions by pasting the meeting link. School World stores the link; it does not create the meeting."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {!report && (
        <Panel title={"Schedule a " + kind}>
          <Form onSubmit={add}>
            <Field label="Title" wide><input name="title" required /></Field>
            <Field label="Starts"><input name="startsAt" type="datetime-local" required /></Field>
            <Field label={p.name + " link"} wide><input name="meetingUrl" type="url" placeholder={"https://" + p.host + "/…"} required /></Field>
            {!meeting && (
              <Field label="Class">
                <select name="classId" required defaultValue="">
                  <option value="" disabled>Select class</option>
                  {rowsOf(data["/v1/classes"]).map((c) => <option key={c.id} value={c.id}>{c.name}{c.virtualClassroom ? "" : " (virtual class off)"}</option>)}
                </select>
              </Field>
            )}
            {!meeting && <Field label="Subject"><select name="subjectId" defaultValue=""><option value="">None</option>{rowsOf(data["/v1/subjects"]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
            <Field label="Host"><select name="staffId" defaultValue=""><option value="">None</option>{rowsOf(data["/v1/staff"]).map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}</select></Field>
            <Field label="Recording link"><input name="recordingUrl" type="url" placeholder="Add later if you like" /></Field>
            <Button type="submit">Schedule</Button>
          </Form>
        </Panel>
      )}
      <DataTable rows={shown} empty={loaded ? (report ? "No past sessions." : "Nothing scheduled.") : "Loading…"} columns={[
        { key: "startsAt", label: "When", render: (r) => <Row>{when(r.startsAt)}{!report && new Date(r.startsAt).getTime() < now && <span className="ck-badge ck-badge-warn">Past</span>}</Row> },
        { key: "title", label: "Title" },
        ...(meeting ? [] : [{ key: "class", label: "Class", render: (r) => [r.class, r.subject].filter(Boolean).join(" · ") || "-" }]),
        { key: "staff", label: "Host", render: (r) => r.staff || "-" },
        { key: "join", label: "", render: (r) => <Row><a href={r.meetingUrl} target="_blank" rel="noopener noreferrer">Join</a>{r.recordingUrl && <a href={r.recordingUrl} target="_blank" rel="noopener noreferrer">Recording</a>}</Row> },
        ...(report ? [] : [{ key: "act", label: "", render: (r) => <Button variant="danger" onClick={() => remove(r)}>Delete</Button> }]),
      ]} />
    </Screen>
  );
}
export const GmeetClasses = () => <LiveClasses provider="GMEET" />;
export const GmeetMeetings = () => <LiveClasses provider="GMEET" meeting />;
export const GmeetClassReport = () => <LiveClasses provider="GMEET" report />;
export const GmeetMeetingReport = () => <LiveClasses provider="GMEET" meeting report />;
export const ZoomClasses = () => <LiveClasses provider="ZOOM" />;
export const ZoomMeetings = () => <LiveClasses provider="ZOOM" meeting />;
export const ZoomClassReport = () => <LiveClasses provider="ZOOM" report />;
export const ZoomMeetingReport = () => <LiveClasses provider="ZOOM" meeting report />;
export function LiveClassSettings() {
  return (
    <Screen title="Live class setting" hint="How live classes work in this school.">
      <Panel>
        <p style={{ margin: 0 }}>School World stores Google Meet and Zoom links only. Create the meeting in Meet or Zoom, then paste its link on the Live Classes or Live Meeting screen. No Google or Zoom account keys are stored here, and meetings are not created from inside School World.</p>
      </Panel>
    </Screen>
  );
}

/* ============================================================= Certificates */

const MERGE = ["{{name}}", "{{admissionNo}}", "{{class}}", "{{section}}", "{{campus}}"];

export function CertificateTemplates() {
  const { data, error, reload, loaded } = useLoad(["/v1/print-templates?kind=CERTIFICATE"]);
  const rows = rowsOf(data["/v1/print-templates?kind=CERTIFICATE"]);
  const [open, setOpen] = useState(null);
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const unknown = [...new Set([...v.body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => "{{" + m[1] + "}}").filter((t) => !MERGE.includes(t)))];
    if (unknown.length && !window.confirm(unknown.join(", ") + " will be printed as written, because only " + MERGE.join(" ") + " are filled in. Save anyway?")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/print-templates", { kind: "CERTIFICATE", name: v.name.trim(), body: v.body }), "Template saved");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Student certificate" hint={"Certificate wording. These are filled in for each student: " + MERGE.join(" ") + "."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New template">
        <Form onSubmit={add}>
          <Field label="Name (printed as the title)" wide><input name="name" placeholder="Bonafide Certificate" required /></Field>
          <Field label="Wording" wide><textarea name="body" rows={6} required style={{ height: "auto", padding: 10 }} defaultValue="This is to certify that {{name}} ({{admissionNo}}) is a bona fide student of {{campus}}, class {{class}} / {{section}}." /></Field>
          <Button type="submit">Save template</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty={loaded ? "No templates yet. Certificates use a plain bonafide wording until you add one." : "Loading…"} columns={[
        { key: "name", label: "Template" }, { key: "body", label: "Wording", render: (r) => String(r.body).slice(0, 110) + (String(r.body).length > 110 ? "…" : "") },
        { key: "act", label: "", render: (r) => <Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "View"}</Button> },
      ]} />
      {rows.filter((r) => r.id === open).map((r) => <Panel key={r.id} title={r.name}><div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div></Panel>)}
    </Screen>
  );
}

async function studentsOf(classId, sectionId) {
  const rows = [];
  for (let page = 1; page < 200; page += 1) {
    const json = await apiCall("GET", "/v1/students?" + new URLSearchParams({ classId, ...(sectionId ? { sectionId } : {}), page: String(page), pageSize: "100" }));
    const batch = rowsOf(json);
    rows.push(...batch);
    if (!batch.length || rows.length >= Number(json.total ?? rows.length)) break;
  }
  return rows;
}

function StudentPdfScreen({ title, hint, certificate }) {
  const { data, error } = useLoad(["/v1/classes", ...(certificate ? ["/v1/print-templates?kind=CERTIFICATE"] : [])]);
  const classes = rowsOf(data["/v1/classes"]);
  const templates = rowsOf(data["/v1/print-templates?kind=CERTIFICATE"]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [students, setStudents] = useState(null);
  const [one, setOne] = useState(null);
  const [status, run] = useStatus();
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  useEffect(() => {
    if (!classId) { setStudents(null); return; }
    let live = true;
    run(() => studentsOf(classId, sectionId).then((rows) => { if (live) setStudents(rows); return rows; }), (rows) => plural(rows.length, "student"));
    return () => { live = false; };
  }, [classId, sectionId]);
  // The old screen always printed with the first template; here the template is chosen.
  const href = (id) => (certificate ? "/api/v1/students/" + id + "/certificate?format=pdf" + (templateId ? "&templateId=" + templateId : "") : "/api/v1/students/" + id + "/id-card?format=pdf");
  const list = one ? [one] : students || [];
  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          {certificate && (
            <Field label="Template">
              <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                <option value="">{templates.length ? "First template (" + templates[0].name + ")" : "Plain bonafide wording"}</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Class"><select value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(""); setOne(null); }}><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Section"><select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={!classId}><option value="">All sections</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </Form>
        <StudentPicker value={one} onPick={(row) => { setOne(row); if (row) setClassId(""); }} />
        {certificate && <p style={{ margin: "8px 0 0" }}>Each certificate you open is recorded in the Certificate Report.</p>}
      </Panel>
      {list.length > 0 && (
        <DataTable rows={list} empty="No students." columns={[
          { key: "admissionNo", label: "Admission no" }, { key: "name", label: "Student" },
          { key: "class", label: "Class", render: (r) => [r.class, r.section].filter(Boolean).join(" ") || "-" },
          { key: "pdf", label: "", render: (r) => <a className="ck-btn ck-btn-ghost" href={href(r.id)} target="_blank" rel="noreferrer">{certificate ? "Certificate PDF" : "ID card PDF"}</a> },
        ]} />
      )}
    </Screen>
  );
}
export const GenerateCertificate = () => <StudentPdfScreen title="Generate certificate" hint="Print a certificate for a student, using one of your templates." certificate />;
export const GenerateStudentIdCards = () => <StudentPdfScreen title="Generate ID card" hint="Print student ID cards by class, or for one student." />;

export function StaffIdCards() {
  const { data, error, loaded } = useLoad(["/v1/staff"]);
  const staff = rowsOf(data["/v1/staff"]);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = term ? staff.filter((s) => staffName(s).toLowerCase().includes(term)) : staff;
  return (
    <Screen title="Staff ID card" hint="Print ID cards for staff.">
      <Notice status={{ error }} />
      <Panel><Form onSubmit={(event) => event.preventDefault()}><Field label="Search" wide><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or staff ID" /></Field></Form></Panel>
      <DataTable rows={shown} empty={loaded ? "No staff." : "Loading…"} columns={[
        { key: "employeeId", label: "Staff ID" }, { key: "name", label: "Name", render: (r) => [r.firstName, r.lastName].filter(Boolean).join(" ") },
        { key: "designation", label: "Designation", render: (r) => r.designation?.name || "-" },
        { key: "pdf", label: "", render: (r) => <a className="ck-btn ck-btn-ghost" href={"/api/v1/staff/" + r.id + "/id-card?format=pdf"} target="_blank" rel="noreferrer">ID card PDF</a> },
      ]} />
    </Screen>
  );
}

export function CertificateReport() {
  const { data, error, loaded } = useLoad(["/v1/print-templates?kind=issues"]);
  const rows = rowsOf(data["/v1/print-templates?kind=issues"]);
  const names = useStudentNames(rows.map((r) => r.studentId));
  return (
    <Screen title="Certificate report" hint="The latest 200 certificates printed.">
      <Notice status={{ error }} />
      <DataTable rows={rows} empty={loaded ? "No certificates printed yet." : "Loading…"} columns={[
        { key: "createdAt", label: "Printed", render: (r) => when(r.createdAt) }, { key: "title", label: "Certificate" },
        { key: "student", label: "Student", render: (r) => (r.studentId ? names[r.studentId] || "Loading…" : "-") },
      ]} />
    </Screen>
  );
}
