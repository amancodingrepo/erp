import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  StudentPicker, apiCall, dateOnly, formObject, money, rowsOf, useStatus, useLoad, Row, plural
} from "../kit.jsx";
import { moneyLabel } from "../../../school-locale.js";

// Ported from apps/erp/src/app/(staff)/staff/exams/page.tsx, components/modules/exams-ops.tsx
// (grades, result block) and components/modules/exam-form-ops.tsx, with the same endpoints.

const EXAM_TYPES = [
  ["GENERAL_PASS_FAIL", "General pass/fail"],
  ["SCHOOL_GRADE", "School grade"],
  ["COLLEGE_GRADE", "College grade"],
  ["GPA", "GPA"],
  ["AVERAGE_PASSING", "Average passing"],
];
const typeLabel = (value) => EXAM_TYPES.find(([key]) => key === value)?.[1] || value || "-";



/** Every paper in a group as { id, label, exam, subjectName, ...paper }. */
function papersOf(group, subjects) {
  const name = (id) => subjects.find((row) => row.id === id)?.name || "Subject";
  return (group?.exams || []).flatMap((exam) => (exam.subjects || []).map((paper) => ({
    ...paper,
    exam: exam.name,
    subjectName: name(paper.subjectId),
    label: name(paper.subjectId) + " · " + exam.name,
  })));
}

function GroupSelect({ groups, value, onChange, name, required = true, placeholder = "Select exam group" }) {
  const controlled = value !== undefined;
  return (
    <select name={name} required={required} {...(controlled ? { value, onChange } : { defaultValue: "" })}>
      <option value="" disabled={required}>{placeholder}</option>
      {groups.map((row) => <option key={row.id} value={row.id}>{row.name}{row.groupKind && row.groupKind !== "Regular" ? " (" + row.groupKind + ")" : ""}</option>)}
    </select>
  );
}

/* ------------------------------------------------------------ Exam group */

export function ExamGroups() {
  const { data, error, reload } = useLoad(["/v1/exam-groups", "/v1/sessions", "/v1/subjects"]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const sessions = rowsOf(data["/v1/sessions"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const currentSessionId = data["/v1/sessions"]?.currentSessionId || "";
  const sessionName = (id) => sessions.find((row) => row.id === id)?.name || "-";
  const [groupId, setGroupId] = useState("");
  const [examId, setExamId] = useState("");
  const [status, run] = useStatus();
  const group = groups.find((row) => row.id === groupId);

  async function createGroup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok, result } = await run(() => apiCall("POST", "/v1/exam-groups", {
      name: v.name,
      sessionId: v.sessionId,
      examType: v.examType,
      groupKind: v.groupKind,
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
      examMonthYear: v.examMonthYear || undefined,
      isAdditional: v.isAdditional === "on",
      revaluationOn: v.revaluationOn === "on",
    }), "Exam group created");
    if (ok) { form.reset(); await reload(); setGroupId(result.id); setExamId(""); }
  }
  async function patchGroup(row, patch, message) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/exam-groups/" + row.id, patch), message);
    if (ok) reload();
  }
  async function removeGroup(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/exam-groups/" + row.id), "Exam group removed");
    if (ok) { if (row.id === groupId) { setGroupId(""); setExamId(""); } reload(); }
  }
  async function addExam(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok, result } = await run(() => apiCall("POST", "/v1/exam-groups/" + groupId + "/exams", { name: v.name }), "Exam added");
    if (ok) { form.reset(); await reload(); setExamId(result.id); }
  }
  async function attachPaper(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const maxMarks = Number(v.maxMarks);
    const minMarks = Number(v.minMarks);
    if (minMarks > maxMarks) { run(() => Promise.reject(new Error("Pass marks cannot be more than the maximum."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/exams/" + examId + "/subjects", {
      subjectId: v.subjectId,
      maxMarks,
      minMarks,
      dateFrom: v.dateFrom || undefined,
      startTime: v.startTime || undefined,
      durationMin: v.durationMin ? Number(v.durationMin) : undefined,
      roomNo: v.roomNo || undefined,
    }), "Paper attached");
    if (ok) { form.reset(); reload(); }
  }

  const exam = group?.exams?.find((row) => row.id === examId);
  const papers = papersOf(group, subjects);
  return (
    <Screen title="Exam group" hint="Exam groups for a session, the exams inside each group, and the subject papers each exam has.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New exam group">
        <Form onSubmit={createGroup}>
          <Field label="Name"><input name="name" placeholder="Term 1 2026" required /></Field>
          <Field label="Session">
            <select name="sessionId" required defaultValue={currentSessionId} key={currentSessionId}>
              <option value="" disabled>Select session</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.name}{row.id === currentSessionId ? " (current)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Exam type">
            <select name="examType" defaultValue="COLLEGE_GRADE">
              {EXAM_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Group kind">
            <select name="groupKind" defaultValue="Regular">
              <option value="Regular">Regular</option>
              <option value="ATKT">ATKT</option>
            </select>
          </Field>
          <Field label="Starts"><input name="startDate" type="date" /></Field>
          <Field label="Ends"><input name="endDate" type="date" /></Field>
          <Field label="Exam month"><input name="examMonthYear" placeholder="Mar 2027" /></Field>
          <Check name="isAdditional" label="Additional exam" />
          <Check name="revaluationOn" label="Allow revaluation" />
          <Button type="submit">Create group</Button>
        </Form>
      </Panel>

      <DataTable
        rows={groups}
        empty="No exam groups yet."
        columns={[
          { key: "name", label: "Group", render: (row) => <Row>{row.name}{row.groupKind === "ATKT" && <span className="ck-badge">ATKT</span>}{row.isAdditional && <span className="ck-badge">Additional</span>}</Row> },
          { key: "session", label: "Session", render: (row) => sessionName(row.sessionId) },
          { key: "type", label: "Type", render: (row) => typeLabel(row.examType) },
          { key: "dates", label: "Dates", render: (row) => [dateOnly(row.startDate), dateOnly(row.endDate)].filter(Boolean).join(" to ") || row.examMonthYear || "-" },
          { key: "exams", label: "Exams", render: (row) => (row.exams || []).length },
          { key: "reval", label: "Revaluation", render: (row) => (
            <Button variant="ghost" onClick={() => patchGroup(row, { revaluationOn: !row.revaluationOn }, row.revaluationOn ? "Revaluation turned off" : "Revaluation turned on")}>{row.revaluationOn ? "On" : "Off"}</Button>
          ) },
          { key: "act", label: "", render: (row) => (
            <Row>
              <Button variant="ghost" onClick={() => { setGroupId(row.id); setExamId(""); }}>Open</Button>
              {!(row.exams || []).length && <RemoveButton onRemove={() => removeGroup(row)} />}
            </Row>
          ) },
        ]}
      />

      {group && (
        <Panel title={"Exams in " + group.name}>
          <Form onSubmit={addExam}>
            <Field label="New exam"><input name="name" placeholder="Unit test 1" required /></Field>
            <Button type="submit">Add exam</Button>
          </Form>
          <Form onSubmit={(event) => event.preventDefault()}>
            <Field label="Exam">
              <select value={examId} onChange={(event) => setExamId(event.target.value)}>
                <option value="">Select exam to attach papers</option>
                {(group.exams || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
          </Form>
          {exam && (
            <Form onSubmit={attachPaper}>
              <Field label="Subject">
                <select name="subjectId" required defaultValue="">
                  <option value="" disabled>Select subject</option>
                  {subjects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </Field>
              <Field label="Max marks"><input name="maxMarks" type="number" min="1" step="any" defaultValue="100" required /></Field>
              <Field label="Pass marks"><input name="minMarks" type="number" min="0" step="any" defaultValue="40" required /></Field>
              <Field label="Date"><input name="dateFrom" type="date" /></Field>
              <Field label="Start time"><input name="startTime" type="time" /></Field>
              <Field label="Minutes"><input name="durationMin" type="number" min="1" /></Field>
              <Field label="Room"><input name="roomNo" /></Field>
              <Button type="submit">Attach to {exam.name}</Button>
            </Form>
          )}
          <DataTable
            rows={papers}
            empty="No papers in this group yet."
            columns={[
              { key: "exam", label: "Exam" },
              { key: "subjectName", label: "Subject" },
              { key: "marks", label: "Max / pass", render: (row) => row.maxMarks + " / " + row.minMarks },
              { key: "when", label: "Schedule", render: (row) => [dateOnly(row.dateFrom), row.startTime, row.durationMin ? row.durationMin + " min" : "", row.roomNo ? "Room " + row.roomNo : ""].filter(Boolean).join(" · ") || "-" },
            ]}
          />
        </Panel>
      )}
    </Screen>
  );
}

/* --------------------------------------------------------- Exam schedule */

export function ExamSchedule() {
  const { data, error } = useLoad(["/v1/exam-groups", "/v1/subjects"]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const [groupId, setGroupId] = useState("");
  const rows = useMemo(() => {
    const picked = groupId ? groups.filter((row) => row.id === groupId) : groups;
    return picked
      .flatMap((group) => papersOf(group, subjects).map((paper) => ({ ...paper, group: group.name })))
      .sort((a, b) => (dateOnly(a.dateFrom) || "9999").localeCompare(dateOnly(b.dateFrom) || "9999") || String(a.startTime || "").localeCompare(String(b.startTime || "")));
  }, [groups, subjects, groupId]);

  return (
    <Screen title="Exam schedule" hint="Every paper in date order. Dates, times and rooms are set when a paper is attached on the Exam group screen.">
      <Notice status={{ error }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Exam group"><GroupSelect groups={groups} value={groupId} onChange={(event) => setGroupId(event.target.value)} required={false} placeholder="All groups" /></Field>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        empty="No papers scheduled yet."
        columns={[
          { key: "date", label: "Date", render: (row) => dateOnly(row.dateFrom) || "Not set" },
          { key: "startTime", label: "Time", render: (row) => row.startTime || "-" },
          { key: "durationMin", label: "Duration", render: (row) => (row.durationMin ? row.durationMin + " min" : "-") },
          { key: "subjectName", label: "Subject" },
          { key: "exam", label: "Exam" },
          { key: "group", label: "Group" },
          { key: "roomNo", label: "Room", render: (row) => row.roomNo || "-" },
          { key: "marks", label: "Max / pass", render: (row) => row.maxMarks + " / " + row.minMarks },
        ]}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------ Mark entry */

export function MarkEntry() {
  const { data, error } = useLoad(["/v1/exam-groups", "/v1/subjects", "/v1/classes"]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const classes = rowsOf(data["/v1/classes"]);
  const [groupId, setGroupId] = useState("");
  const [paperId, setPaperId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sheet, setSheet] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, run] = useStatus();
  const papers = papersOf(groups.find((row) => row.id === groupId), subjects);
  const sections = classes.find((row) => row.id === classId)?.sections || [];

  async function load(message) {
    if (!paperId) return;
    const query = new URLSearchParams();
    if (classId) query.set("classId", classId);
    if (sectionId) query.set("sectionId", sectionId);
    const { ok, result } = await run(() => apiCall("GET", "/v1/exams/" + paperId + "/roster?" + query), (json) => message || plural(rowsOf(json).length, "student"));
    if (ok) {
      setSheet({ ...result, data: rowsOf(result).map((row) => ({ ...row, marks: row.marks == null ? "" : String(row.marks) })) });
      setDirty(false);
    }
  }
  useEffect(() => { setSheet(null); }, [paperId, classId, sectionId]);

  function patch(index, value) {
    setSheet((current) => ({ ...current, data: current.data.map((row, i) => (i === index ? { ...row, ...value } : row)) }));
    setDirty(true);
  }
  const max = Number(sheet?.maxMarks ?? 0);
  const overMax = sheet ? sheet.data.filter((row) => !row.isAbsent && row.marks !== "" && Number(row.marks) > max).length : 0;
  const badNumber = sheet ? sheet.data.filter((row) => !row.isAbsent && row.marks !== "" && !Number.isFinite(Number(row.marks))).length : 0;

  async function save() {
    // The server rejects blank marks that are not marked absent, so only filled rows are sent.
    const entries = sheet.data
      .filter((row) => row.isAbsent || row.marks !== "")
      .map((row) => ({ studentId: row.studentId, rosterId: row.rosterId, marks: row.isAbsent ? null : Number(row.marks), isAbsent: row.isAbsent }));
    if (!entries.length) { run(() => Promise.reject(new Error("Enter at least one mark first."))); return false; }
    const { ok } = await run(() => apiCall("PUT", "/v1/exams/" + paperId + "/marks", { entries }), plural(entries.length, "mark") + " saved as draft");
    if (ok) setDirty(false);
    return ok;
  }
  async function finalize() {
    const blank = sheet.data.filter((row) => !row.isAbsent && row.marks === "").length;
    const warn = blank ? " " + blank + " student(s) have no mark yet." : "";
    if (!window.confirm("Finalize this paper? Only a principal or super admin can change marks afterwards." + warn)) return;
    if (dirty && !(await save())) return;
    const { ok } = await run(() => apiCall("POST", "/v1/exams/" + paperId + "/finalize"), "Paper finalized");
    if (ok) load("Paper finalized");
  }

  const paper = papers.find((row) => row.id === paperId);
  return (
    <Screen title="Mark entry" hint="Pick a paper, load the class, enter marks, save a draft, then finalize when every mark is in.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => { event.preventDefault(); load(); }}>
          <Field label="Exam group"><GroupSelect groups={groups} value={groupId} onChange={(event) => { setGroupId(event.target.value); setPaperId(""); }} /></Field>
          <Field label="Paper">
            <select value={paperId} onChange={(event) => setPaperId(event.target.value)} required>
              <option value="" disabled>{groupId ? (papers.length ? "Select paper" : "No papers in this group") : "Pick a group first"}</option>
              {papers.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </Field>
          <Field label="Class">
            <select value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(""); }}>
              <option value="">All classes</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={!classId}>
              <option value="">All sections</option>
              {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!paperId}>Load students</Button>
        </Form>
      </Panel>
      {sheet && (
        <Panel
          title={<Row>{(paper?.label || sheet.exam) + " · max " + sheet.maxMarks + ", pass " + sheet.minMarks}{sheet.finalized && <span className="ck-badge">Finalized</span>}</Row>}
          actions={
            <Row>
              <Button variant="ghost" onClick={save} disabled={!sheet.data.length || overMax > 0 || badNumber > 0}>Save draft</Button>
              <Button onClick={finalize} disabled={!sheet.data.length || overMax > 0 || badNumber > 0}>Finalize</Button>
            </Row>
          }
        >
          {(overMax > 0 || badNumber > 0) && <p className="ck-notice ck-notice-error" role="alert">{overMax ? overMax + " mark(s) are above the maximum of " + sheet.maxMarks + ". " : ""}{badNumber ? badNumber + " mark(s) are not numbers." : ""}</p>}
          <DataTable
            rows={sheet.data}
            rowKey={(row) => row.studentId}
            empty="No active students match this class and section for the group's session."
            columns={[
              { key: "admissionNo", label: "Admission no" },
              { key: "rollNo", label: "Roll", render: (row) => row.rollNo || "-" },
              { key: "name", label: "Name", render: (row) => <Row>{row.name}{row.isBlocked && <span className="ck-badge ck-badge-warn">Result blocked</span>}</Row> },
              { key: "where", label: "Class", render: (row) => [row.class, row.section].filter(Boolean).join(" ") },
              { key: "leave", label: "Leave %", render: (row) => (row.leavePercent == null ? "-" : row.leavePercent + "%") },
              { key: "absent", label: "Absent", render: (row) => {
                const index = sheet.data.indexOf(row);
                return <input type="checkbox" aria-label={"Absent: " + row.name} checked={row.isAbsent} onChange={(event) => patch(index, { isAbsent: event.target.checked, marks: event.target.checked ? "" : row.marks })} />;
              } },
              { key: "marks", label: "Marks", render: (row) => {
                const index = sheet.data.indexOf(row);
                return <input aria-label={"Marks: " + row.name} inputMode="decimal" style={{ width: 80 }} value={row.marks} disabled={row.isAbsent} onChange={(event) => patch(index, { marks: event.target.value.trim() })} />;
              } },
            ]}
          />
        </Panel>
      )}
    </Screen>
  );
}

/* ------------------------------------------------------------ Marks grade */

export function Grades() {
  const { data, error, reload } = useLoad(["/v1/grades"]);
  const grades = rowsOf(data["/v1/grades"]);
  const [editing, setEditing] = useState(null);
  const [status, run] = useStatus();

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const body = {
      letter: v.letter,
      name: v.name,
      minPct: Number(v.minPct),
      maxPct: Number(v.maxPct),
      points: v.points === "" ? undefined : Number(v.points),
    };
    if (body.minPct > body.maxPct) { run(() => Promise.reject(new Error("Minimum % cannot be above maximum %."))); return; }
    const clash = grades.find((row) => row.id !== editing?.id && body.minPct <= Number(row.maxPct) && body.maxPct >= Number(row.minPct));
    if (clash && !window.confirm("This range overlaps grade " + clash.letter + " (" + clash.minPct + "–" + clash.maxPct + "%). Save anyway?")) return;
    const { ok } = await run(
      () => (editing ? apiCall("PATCH", "/v1/grades/" + editing.id, body) : apiCall("POST", "/v1/grades", body)),
      editing ? "Grade updated" : "Grade saved"
    );
    if (ok) { form.reset(); setEditing(null); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/grades/" + id), "Grade removed");
    if (ok) reload();
  }

  return (
    <Screen title="Marks grade" hint="Percentage bands and the letter grade each one earns.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={editing ? "Edit grade " + editing.letter : "New grade"}>
        <Form onSubmit={submit} key={editing?.id || "new"}>
          <Field label="Letter"><input name="letter" defaultValue={editing?.letter} placeholder="A+" required /></Field>
          <Field label="Name"><input name="name" defaultValue={editing?.name} placeholder="Outstanding" required /></Field>
          <Field label="Min %"><input name="minPct" type="number" step="any" min="0" max="100" defaultValue={editing?.minPct} required /></Field>
          <Field label="Max %"><input name="maxPct" type="number" step="any" min="0" max="100" defaultValue={editing?.maxPct} required /></Field>
          <Field label="Grade points"><input name="points" type="number" step="0.01" defaultValue={editing?.points ?? ""} /></Field>
          <Button type="submit">{editing ? "Save grade" : "Add grade"}</Button>
          {editing && <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>}
        </Form>
      </Panel>
      <DataTable
        rows={grades}
        empty="No grades yet."
        columns={[
          { key: "letter", label: "Grade" },
          { key: "name", label: "Name" },
          { key: "range", label: "Range", render: (row) => row.minPct + "% – " + row.maxPct + "%" },
          { key: "points", label: "Points", render: (row) => row.points ?? "-" },
          { key: "act", label: "", render: (row) => <Row><Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button><RemoveButton onRemove={() => remove(row.id)} /></Row> },
        ]}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------ Result block */

export function ResultBlock() {
  const { data, error } = useLoad(["/v1/exam-groups"]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();

  async function submit(event) {
    event.preventDefault();
    if (!student) { run(() => Promise.reject(new Error("Select a student first."))); return; }
    const v = formObject(event);
    const blocked = v.blocked === "true";
    const group = groups.find((row) => row.id === v.examGroupId);
    await run(() => apiCall("POST", "/v1/students/" + student.id + "/result-block", {
      examGroupId: v.examGroupId,
      blocked,
      reason: v.reason || undefined,
    }), (json) => (json.count
      ? (blocked ? "Result withheld" : "Result released") + " for " + student.name + " in " + (group?.name || "the group") + " (" + plural(json.count, "paper") + ")"
      : (group?.name || "This group") + " has no papers yet, so nothing changed."));
  }

  return (
    <Screen title="Result block / unblock" hint="Withhold a student's result for an exam group (for example, for unpaid fees), or release it again.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={submit}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label="Exam group"><GroupSelect groups={groups} name="examGroupId" /></Field>
          <Field label="Action">
            <select name="blocked" defaultValue="true">
              <option value="true">Block (withhold result)</option>
              <option value="false">Unblock (release result)</option>
            </select>
          </Field>
          <Field label="Reason" wide><input name="reason" placeholder="Fees pending" /></Field>
          <Button type="submit" disabled={!student}>Save</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

/* ----------------------------------------------------- ATKT / reval forms */

const KIND_TEXT = {
  ATKT: { form: "ATKT form", window: "ATKT / regular exam form window", hint: "Students apply to re-sit papers they did not clear." },
  REVAL: { form: "Revaluation form", window: "Revaluation form window", hint: "Students ask for papers to be re-checked. The group must have revaluation turned on." },
};

function windowLabel(row) {
  return row.examGroup?.name + " · " + money(row.feeAmount) + " · closes " + new Date(row.closesAt).toLocaleString();
}

function windowOpen(row, now = Date.now()) {
  return new Date(row.opensAt).getTime() <= now && now <= new Date(row.closesAt).getTime();
}

function FormWindows({ kind }) {
  const text = KIND_TEXT[kind];
  const { data, error, reload } = useLoad(["/v1/exam-groups", "/v1/exam-forms/windows?kind=" + kind]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const windows = rowsOf(data["/v1/exam-forms/windows?kind=" + kind]);
  const [status, run] = useStatus();
  const eligible = kind === "REVAL" ? groups.filter((row) => row.revaluationOn) : groups;

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    if (new Date(v.closesAt) <= new Date(v.opensAt)) { run(() => Promise.reject(new Error("The window must close after it opens."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/exam-forms/windows", {
      kind,
      examGroupId: v.examGroupId,
      opensAt: v.opensAt,
      closesAt: v.closesAt,
      feeAmount: v.feeAmount,
    }), "Window saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/exam-forms/windows/" + id), "Window removed");
    if (ok) reload();
  }

  return (
    <Screen title={text.window} hint={"When students can submit the form, and the fee charged. " + text.hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Open a window">
        {kind === "REVAL" && groups.length > 0 && !eligible.length && <p className="ck-notice ck-notice-error">No exam group has revaluation turned on. Turn it on from the Exam group screen first.</p>}
        <Form onSubmit={submit}>
          <Field label="Exam group"><GroupSelect groups={eligible} name="examGroupId" /></Field>
          <Field label="Opens"><input name="opensAt" type="datetime-local" required /></Field>
          <Field label="Closes"><input name="closesAt" type="datetime-local" required /></Field>
          <Field label={moneyLabel("Fee")}><input name="feeAmount" type="number" min="0" step="0.01" required /></Field>
          <Button type="submit">Open window</Button>
        </Form>
      </Panel>
      <DataTable
        rows={windows}
        empty="No windows yet."
        columns={[
          { key: "group", label: "Exam group", render: (row) => row.examGroup?.name || "-" },
          { key: "fee", label: "Fee", render: (row) => money(row.feeAmount) },
          { key: "opens", label: "Opens", render: (row) => new Date(row.opensAt).toLocaleString() },
          { key: "closes", label: "Closes", render: (row) => new Date(row.closesAt).toLocaleString() },
          { key: "state", label: "", render: (row) => (windowOpen(row) ? <span className="ck-badge">Open now</span> : <span className="ck-badge ck-badge-warn">Closed</span>) },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function AtktWindows() { return <FormWindows kind="ATKT" />; }
export function RevalWindows() { return <FormWindows kind="REVAL" />; }

function PaperChecklist({ papers, picked, onToggle }) {
  if (!papers.length) return <div className="ck-empty">This exam group has no papers.</div>;
  return (
    <div className="ck-checklist">
      {papers.map((row) => <Check key={row.id} label={row.label} checked={picked.has(row.id)} onChange={(event) => onToggle(row.id, event.target.checked)} />)}
    </div>
  );
}

function toggleIn(set, id, on) {
  const next = new Set(set);
  if (on) next.add(id); else next.delete(id);
  return next;
}

function ApplyForm({ kind }) {
  const text = KIND_TEXT[kind];
  const { data, error } = useLoad(["/v1/exam-forms/windows?kind=" + kind, "/v1/exam-groups", "/v1/subjects"]);
  const windows = rowsOf(data["/v1/exam-forms/windows?kind=" + kind]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const [windowId, setWindowId] = useState("");
  const [student, setStudent] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [status, run] = useStatus();
  const openWindows = windows.filter((row) => windowOpen(row));
  const chosen = windows.find((row) => row.id === windowId);
  const papers = papersOf(groups.find((row) => row.id === chosen?.examGroupId), subjects);

  useEffect(() => { setPicked(new Set()); }, [windowId]);

  async function submit(event) {
    event.preventDefault();
    if (!student || !chosen || !picked.size) return;
    if (!window.confirm("Submit " + text.form.toLowerCase() + " for " + student.name + " with " + plural(picked.size, "paper") + "? A fee of " + money(chosen.feeAmount) + " will be charged to the student.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/exam-forms", { windowId, studentId: student.id, subjectIds: [...picked] }),
      (json) => "Form submitted. Fee " + money(json.feeAmount) + " charged.");
    if (ok) { setStudent(null); setPicked(new Set()); }
  }

  return (
    <Screen title={text.form} hint={"Submit a form for a student while its window is open. " + text.hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {windows.length > 0 && !openWindows.length && <p className="ck-notice ck-notice-error">No {text.form.toLowerCase()} window is open right now.</p>}
      {!windows.length && <p className="ck-notice ck-notice-error">No {text.form.toLowerCase()} window has been set up yet.</p>}
      <Panel>
        <Form onSubmit={submit}>
          <Field label="Window" wide>
            <select value={windowId} onChange={(event) => setWindowId(event.target.value)} required>
              <option value="" disabled>Select window</option>
              {openWindows.map((row) => <option key={row.id} value={row.id}>{windowLabel(row)}</option>)}
            </select>
          </Field>
          <StudentPicker value={student} onPick={setStudent} />
          {chosen && (
            <Field label={"Papers (" + picked.size + " selected)"} wide>
              <PaperChecklist papers={papers} picked={picked} onToggle={(id, on) => setPicked((current) => toggleIn(current, id, on))} />
            </Field>
          )}
          <Button type="submit" disabled={!student || !chosen || !picked.size}>Submit form</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function AtktForm() { return <ApplyForm kind="ATKT" />; }
export function RevalForm() { return <ApplyForm kind="REVAL" />; }

function SubmittedForms({ kind, editable }) {
  const formsPath = "/v1/exam-forms" + (kind ? "?kind=" + kind : "");
  const { data, error, reload } = useLoad([formsPath, "/v1/exam-groups", "/v1/subjects"]);
  const forms = rowsOf(data[formsPath]);
  const groups = rowsOf(data["/v1/exam-groups"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [status, run] = useStatus();

  const papersFor = (form) => papersOf(groups.find((row) => row.id === form.examGroup?.id), subjects);
  const paperNames = (form) => {
    const papers = papersFor(form);
    return (form.subjectIds || []).map((id) => papers.find((row) => row.id === id)?.label || "Removed paper").join(", ");
  };
  const term = filter.trim().toLowerCase();
  const rows = term ? forms.filter((row) => [row.student?.name, row.student?.admissionNo, row.examGroup?.name].some((value) => String(value || "").toLowerCase().includes(term))) : forms;

  function startEdit(row) {
    setEditing(row);
    setPicked(new Set(row.subjectIds || []));
  }
  async function saveEdit() {
    const { ok } = await run(() => apiCall("PATCH", "/v1/exam-forms/" + editing.id, { subjectIds: [...picked] }), "Form updated");
    if (ok) { setEditing(null); reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/exam-forms/" + row.id), "Form removed. Its fee invoice is still on the student's account.");
    if (ok) reload();
  }

  return (
    <>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Search" wide><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Student, admission no or exam group" /></Field>
        </Form>
      </Panel>
      {editing && (
        <Panel title={"Papers for " + editing.student?.name + " · " + editing.examGroup?.name} actions={<Row><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit} disabled={!picked.size}>Save papers</Button></Row>}>
          <PaperChecklist papers={papersFor(editing)} picked={picked} onToggle={(id, on) => setPicked((current) => toggleIn(current, id, on))} />
        </Panel>
      )}
      <DataTable
        rows={rows}
        empty="No forms submitted yet."
        columns={[
          ...(kind ? [] : [{ key: "kind", label: "Form", render: (row) => (row.kind === "REVAL" ? "Revaluation" : "ATKT") }]),
          { key: "admissionNo", label: "Admission no", render: (row) => row.student?.admissionNo },
          { key: "name", label: "Student", render: (row) => row.student?.name },
          { key: "group", label: "Exam group", render: (row) => row.examGroup?.name },
          { key: "papers", label: "Papers", render: paperNames },
          { key: "fee", label: "Fee", render: (row) => money(row.feeAmount) },
          { key: "date", label: "Submitted", render: (row) => dateOnly(row.createdAt) },
          ...(editable ? [{ key: "act", label: "", render: (row) => (
            <Row>
              <Button variant="ghost" onClick={() => startEdit(row)}>Edit papers</Button>
              <RemoveButton onRemove={() => remove(row)} />
            </Row>
          ) }] : []),
        ]}
      />
    </>
  );
}

export function EditAtktForms() {
  return (
    <Screen title="Edit ATKT form" hint="Change the papers on a submitted ATKT form, or remove it.">
      <SubmittedForms kind="ATKT" editable />
    </Screen>
  );
}

export function AtktFormReport() {
  return (
    <Screen title="ATKT form report" hint="Every submitted ATKT form with its papers and fee.">
      <SubmittedForms kind="ATKT" />
    </Screen>
  );
}
