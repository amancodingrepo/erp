import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiCall, apiGet, formObject, rowsOf, staffName, useStatus
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/academics-hub.tsx
// (ClassesPanel, SubjectsPanel, TimetablePanel, PromotionPanel) with the same endpoints.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function useMasters(paths) {
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const key = paths.join("|");
  async function reload() {
    try {
      const results = await Promise.all(paths.map((path) => apiGet(path)));
      const next = {};
      paths.forEach((path, index) => { next[path] = results[index]; });
      setData(next);
      setError("");
      return next;
    } catch (reason) {
      setError(reason.message || "Could not load this screen.");
      return {};
    }
  }
  useEffect(() => { reload(); }, [key]);
  return { data, error, reload };
}

function ClassSelect({ classes, name = "classId", value, onChange, required = true, placeholder = "Select class" }) {
  const controlled = value !== undefined;
  return (
    <select name={name} required={required} {...(controlled ? { value, onChange } : { defaultValue: "" })}>
      <option value="" disabled={required}>{placeholder}</option>
      {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
    </select>
  );
}

function sectionLabel(row) {
  return row.name + (row.classTeacher?.name ? " (" + row.classTeacher.name + ")" : "");
}

/* ------------------------------------------------------------------ Class */

export function Classes() {
  const { data, error, reload } = useMasters(["/v1/programs", "/v1/classes", "/v1/report-templates", "/v1/staff"]);
  const programs = rowsOf(data["/v1/programs"]);
  const classes = rowsOf(data["/v1/classes"]);
  const templates = rowsOf(data["/v1/report-templates"]);
  const staff = rowsOf(data["/v1/staff"]);
  const sessionId = data["/v1/classes"]?.sessionId ?? null;
  const programName = (id) => programs.find((row) => row.id === id)?.name || "-";
  const [status, run] = useStatus();
  const [roster, setRoster] = useState(null);

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/classes", {
      programId: v.programId,
      name: v.name,
      yearNo: v.yearNo ? Number(v.yearNo) : undefined,
      sequenceNo: v.sequenceNo ? Number(v.sequenceNo) : undefined,
      sectionNames: String(v.sections || "").split(",").map((s) => s.trim()).filter(Boolean),
      sendAbsentSms: v.sendAbsentSms === "on",
      virtualClassroom: v.virtualClassroom === "on",
    }), "Class saved");
    if (ok) { form.reset(); reload(); }
  }
  async function edit(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiCall("PATCH", "/v1/classes/" + v.classId, {
      name: v.name || undefined,
      yearNo: v.yearNo ? Number(v.yearNo) : undefined,
      programId: v.programId || undefined,
    }), "Class updated");
    if (ok) { event.target.reset(); reload(); }
  }
  async function saveDate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const path = "/v1/classes/" + v.classId + (v.kind === "opening" ? "/opening-dates" : "/result-dates");
    const { ok } = await run(() => apiCall("PUT", path, { name: v.name, date: v.date }), "Date saved");
    if (ok) { form.reset(); reload(); }
  }
  async function assignTemplate(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/classes/" + v.classId + "/report-template", { template_id: v.templateId }), "Report template assigned");
    if (ok) reload();
  }
  async function assignTeacher(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok } = await run(() => apiCall("PUT", "/v1/classes/" + v.classId + "/teachers", { staffId: v.staffId || null }),
      v.staffId ? "Class teacher set on every section" : "Class teachers cleared");
    if (ok) reload();
  }
  async function loadRoster(event) {
    event.preventDefault();
    const v = formObject(event);
    const { ok, result } = await run(() => apiCall("GET", "/v1/classes/" + v.classId + "/students"), (json) => rowsOf(json).length + " students");
    if (ok) setRoster(rowsOf(result));
  }
  async function setFlags(row, flags) {
    const { ok } = await run(() => apiCall("POST", "/v1/class-flags", {
      classId: row.id,
      sendAbsentSms: Boolean(row.sendAbsentSms),
      virtualClassroom: Boolean(row.virtualClassroom),
      ...flags,
    }), "Class settings saved");
    if (ok) reload();
  }
  async function clearFlags(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/class-flags/" + row.id), "Flags cleared");
    if (ok) reload();
  }
  async function move(index, delta) {
    const ids = classes.map((row) => row.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    const { ok } = await run(() => apiCall("POST", "/v1/classes/reorder", { classIds: ids }), "Order saved");
    if (ok) reload();
  }
  async function deactivate(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/classes/" + row.id), "Class deactivated");
    if (ok) reload();
  }

  return (
    <Screen title="Class" hint={"Classes, their sections and class settings for the current session" + (sessionId ? "." : " (no current session set).")}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New class">
        <Form onSubmit={add}>
          <Field label="Program">
            <select name="programId" required defaultValue="">
              <option value="" disabled>Select program</option>
              {programs.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Name"><input name="name" placeholder="FY BCom" required /></Field>
          <Field label="Year"><input name="yearNo" type="number" min="1" /></Field>
          <Field label="Order"><input name="sequenceNo" type="number" /></Field>
          <Field label="Sections" wide><input name="sections" placeholder="A, B" /></Field>
          <Check name="sendAbsentSms" label="Send absent SMS" />
          <Check name="virtualClassroom" label="Enable virtual classroom" />
          <Button type="submit">Add class</Button>
        </Form>
      </Panel>

      <DataTable
        rows={classes}
        empty="No classes yet."
        columns={[
          { key: "name", label: "Class", render: (row) => <>{row.name} {row.isActive === false && <span className="ck-badge ck-badge-warn">Inactive</span>}</> },
          { key: "program", label: "Program", render: (row) => programName(row.programId) },
          { key: "yearNo", label: "Year", render: (row) => row.yearNo ?? "-" },
          { key: "sections", label: "Sections", render: (row) => (row.sections || []).map(sectionLabel).join(", ") || "-" },
          { key: "dates", label: "Dates", render: (row) => [
            ...(row.resultDates || []).map((d) => "Result " + d.name + " " + d.date),
            ...(row.openingDates || []).map((d) => "Opening " + d.name + " " + d.date),
          ].join("; ") || "-" },
          { key: "flags", label: "Settings", render: (row) => (
            <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => setFlags(row, { sendAbsentSms: !row.sendAbsentSms })}>Absent SMS: {row.sendAbsentSms ? "on" : "off"}</Button>
              <Button variant="ghost" onClick={() => setFlags(row, { virtualClassroom: !row.virtualClassroom })}>Virtual class: {row.virtualClassroom ? "on" : "off"}</Button>
              {(row.sendAbsentSms || row.virtualClassroom) && <Button variant="ghost" onClick={() => clearFlags(row)}>Clear</Button>}
            </span>
          ) },
          { key: "act", label: "", render: (row) => {
            const index = classes.indexOf(row);
            return (
              <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={"Move " + row.name + " up"}>↑</Button>
                <Button variant="ghost" disabled={index === classes.length - 1} onClick={() => move(index, 1)} aria-label={"Move " + row.name + " down"}>↓</Button>
                <RemoveButton label="Deactivate" onRemove={() => deactivate(row)} />
              </span>
            );
          } },
        ]}
      />

      <Panel title="Edit class">
        <Form onSubmit={edit}>
          <Field label="Class"><ClassSelect classes={classes} /></Field>
          <Field label="Program">
            <select name="programId" defaultValue="">
              <option value="">Keep program</option>
              {programs.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="New name"><input name="name" placeholder="Leave blank to keep" /></Field>
          <Field label="Year"><input name="yearNo" type="number" min="1" /></Field>
          <Button type="submit">Save class</Button>
        </Form>
      </Panel>

      <Panel title="Class teacher (all sections)">
        <Form onSubmit={assignTeacher}>
          <Field label="Class"><ClassSelect classes={classes} /></Field>
          <Field label="Teacher">
            <select name="staffId" defaultValue="">
              <option value="">Clear class teacher</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Button type="submit">Assign to sections</Button>
        </Form>
      </Panel>

      <Panel title="Result and opening dates">
        <Form onSubmit={saveDate}>
          <Field label="Class"><ClassSelect classes={classes} /></Field>
          <Field label="Kind">
            <select name="kind" defaultValue="result">
              <option value="result">Result date</option>
              <option value="opening">School opening date</option>
            </select>
          </Field>
          <Field label="Name"><input name="name" placeholder="Term 1" required /></Field>
          <Field label="Date"><input name="date" type="date" required /></Field>
          <Button type="submit">Save date</Button>
        </Form>
      </Panel>

      <Panel title="Report template">
        <Form onSubmit={assignTemplate}>
          <Field label="Class"><ClassSelect classes={classes} /></Field>
          <Field label="Marksheet">
            <select name="templateId" required defaultValue="">
              <option value="" disabled>Select template</option>
              {templates.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Button type="submit">Assign to class</Button>
        </Form>
      </Panel>

      <Panel title="Class roster">
        <Form onSubmit={loadRoster}>
          <Field label="Class"><ClassSelect classes={classes} /></Field>
          <Button type="submit">Load students</Button>
        </Form>
        {roster && (
          <DataTable
            rows={roster}
            empty="No active students in this class."
            columns={[
              { key: "admissionNo", label: "Admission no", render: (row) => row.admissionNo ?? row.student?.admissionNo ?? "" },
              { key: "name", label: "Name", render: (row) => row.name ?? [row.student?.firstName, row.student?.lastName].filter(Boolean).join(" ") },
              { key: "section", label: "Section", render: (row) => row.section?.name ?? row.section ?? "-" },
              { key: "rollNo", label: "Roll", render: (row) => row.rollNo ?? "-" },
            ]}
          />
        )}
      </Panel>

      <ClassMarks classes={classes} />
    </Screen>
  );
}

function ClassMarks({ classes }) {
  const [classId, setClassId] = useState("");
  const [desk, setDesk] = useState(null);
  const [cells, setCells] = useState({});
  const [status, run] = useStatus();

  async function load() {
    if (!classId) return;
    setDesk(null);
    const { ok, result } = await run(() => apiCall("GET", "/v1/classes/" + classId + "/marks"),
      (json) => (json.students || []).length + " students · " + (json.papers || []).length + " papers");
    if (!ok) return;
    const next = {};
    for (const student of result.students || []) {
      for (const mark of student.marks || []) {
        next[student.id + ":" + mark.examSubjectId] = { marks: mark.marks == null ? "" : String(mark.marks), isAbsent: mark.isAbsent === true };
      }
    }
    setCells(next);
    setDesk({ papers: result.papers || [], students: result.students || [] });
  }
  function patch(key, value) {
    setCells((current) => ({ ...current, [key]: { marks: "", isAbsent: false, ...current[key], ...value } }));
  }
  async function save() {
    const entries = [];
    for (const [key, cell] of Object.entries(cells)) {
      const [studentId, examSubjectId] = key.split(":");
      const marks = String(cell.marks ?? "").trim();
      if (!marks && !cell.isAbsent) continue;
      entries.push({ examSubjectId, studentId, marks: cell.isAbsent ? null : marks, isAbsent: cell.isAbsent });
    }
    await run(() => apiCall("PUT", "/v1/classes/" + classId + "/marks", { entries }), "Marks saved");
  }

  return (
    <Panel title="Class marks" actions={desk && <Button onClick={save}>Save marks</Button>}>
      <Notice status={status} />
      <Form onSubmit={(event) => { event.preventDefault(); load(); }}>
        <Field label="Class"><ClassSelect classes={classes} value={classId} onChange={(event) => setClassId(event.target.value)} /></Field>
        <Button type="submit">Load marks</Button>
      </Form>
      {desk && (
        <DataTable
          rows={desk.students}
          empty="No students in this class."
          columns={[
            { key: "student", label: "Student", render: (row) => row.admissionNo + " · " + row.name },
            ...desk.papers.map((paper) => ({
              key: paper.examSubjectId,
              label: paper.exam + " · " + paper.subject + " (" + paper.maxMarks + ")",
              render: (row) => {
                const key = row.id + ":" + paper.examSubjectId;
                const cell = cells[key] || { marks: "", isAbsent: false };
                return (
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      aria-label={"Marks for " + row.name + " in " + paper.subject}
                      style={{ width: 72 }}
                      inputMode="decimal"
                      value={cell.marks}
                      disabled={cell.isAbsent}
                      onChange={(event) => patch(key, { marks: event.target.value })}
                    />
                    <Check label="AB" checked={cell.isAbsent} onChange={(event) => patch(key, { isAbsent: event.target.checked })} />
                  </span>
                );
              },
            })),
          ]}
        />
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- Subjects */

function subjectLabel(row) {
  return row.parentName ? row.parentName + " - " + row.name : row.name;
}

export function Subjects() {
  const { data, error, reload } = useMasters(["/v1/subjects", "/v1/classes", "/v1/subject-categories", "/v1/subject-types"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const classes = rowsOf(data["/v1/classes"]);
  const categories = rowsOf(data["/v1/subject-categories"]);
  const types = rowsOf(data["/v1/subject-types"]);
  const nameIn = (list, id) => list.find((row) => row.id === id)?.name || "-";
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/subjects", {
      name: v.name,
      code: v.code,
      kind: v.kind || "theory",
      categoryId: v.categoryId || undefined,
      typeId: v.typeId || undefined,
      parentSubjectId: v.parentSubjectId || undefined,
    }), "Subject saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/subjects/" + id), "Subject removed");
    if (ok) reload();
  }

  return (
    <Screen title="Subjects" hint="The subject master, and which subjects each class studies this session.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New subject">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" placeholder="Accountancy" required /></Field>
          <Field label="Code"><input name="code" placeholder="ACC101" /></Field>
          <Field label="Kind">
            <select name="kind" defaultValue="theory">
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="optional">Optional</option>
            </select>
          </Field>
          <Field label="Category">
            <select name="categoryId" defaultValue="">
              <option value="">None</option>
              {categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select name="typeId" defaultValue="">
              <option value="">None</option>
              {types.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Main subject">
            <select name="parentSubjectId" defaultValue="">
              <option value="">None (this is a main subject)</option>
              {subjects.filter((row) => !row.parentSubjectId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Button type="submit">Add subject</Button>
        </Form>
      </Panel>
      <DataTable
        rows={subjects}
        empty="No subjects yet."
        columns={[
          { key: "name", label: "Subject", render: subjectLabel },
          { key: "code", label: "Code", render: (row) => row.code || "-" },
          { key: "kind", label: "Kind", render: (row) => row.kind || "-" },
          { key: "category", label: "Category", render: (row) => (row.categoryId ? nameIn(categories, row.categoryId) : "-") },
          { key: "type", label: "Type", render: (row) => (row.typeId ? nameIn(types, row.typeId) : "-") },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
      <ClassSubjects classes={classes} subjects={subjects} />
    </Screen>
  );
}

function ClassSubjects({ classes, subjects }) {
  const [classId, setClassId] = useState("");
  const [offerings, setOfferings] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [status, run] = useStatus();

  useEffect(() => {
    if (!classId) return;
    let live = true;
    apiCall("GET", "/v1/classes/" + classId + "/subjects")
      .then((json) => {
        if (!live) return;
        const rows = rowsOf(json);
        setOfferings(rows);
        setPicked(new Set(rows.map((row) => row.subjectId)));
      })
      .catch((reason) => live && run(() => Promise.reject(reason)));
    return () => { live = false; };
  }, [classId]);

  function toggle(id, on) {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  async function save() {
    // Keep each kept subject's existing section/teacher rows; the endpoint replaces everything it is not sent.
    const kept = offerings
      .filter((row) => picked.has(row.subjectId))
      .map((row) => ({ subjectId: row.subjectId, sectionId: row.sectionId ?? null, staffId: row.staffId ?? null }));
    const added = [...picked]
      .filter((id) => !offerings.some((row) => row.subjectId === id))
      .map((subjectId) => ({ subjectId }));
    const dropped = offerings.filter((row) => !picked.has(row.subjectId) && row.staffId).length;
    if (dropped && !window.confirm(dropped + " teacher assignment(s) on unticked subjects will be removed. Continue?")) return;
    const { ok, result } = await run(() => apiCall("PUT", "/v1/classes/" + classId + "/subjects", { offerings: [...kept, ...added] }), "Class subjects saved");
    if (ok) {
      const rows = rowsOf(result);
      setOfferings(rows);
      setPicked(new Set(rows.map((row) => row.subjectId)));
    }
  }

  return (
    <Panel title="Class subjects" actions={classId && <Button onClick={save}>Save class subjects</Button>}>
      <Notice status={status} />
      <Form onSubmit={(event) => event.preventDefault()}>
        <Field label="Class"><ClassSelect classes={classes} value={classId} onChange={(event) => setClassId(event.target.value)} /></Field>
      </Form>
      {classId && (
        <div className="ck-checklist">
          {subjects.map((row) => (
            <Check key={row.id} label={subjectLabel(row)} checked={picked.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} />
          ))}
          {!subjects.length && <div className="ck-empty">Add subjects above first.</div>}
        </div>
      )}
    </Panel>
  );
}

export function SubjectTeachers() {
  const { data, error } = useMasters(["/v1/subjects", "/v1/classes", "/v1/staff"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const classes = rowsOf(data["/v1/classes"]);
  const staff = rowsOf(data["/v1/staff"]);
  const sessionId = data["/v1/classes"]?.sessionId ?? null;
  const [classId, setClassId] = useState("");
  const [offerings, setOfferings] = useState([]);
  const [status, run] = useStatus();
  const sections = useMemo(() => classes.find((row) => row.id === classId)?.sections || [], [classes, classId]);

  async function loadOfferings(id = classId) {
    if (!id) return;
    const query = new URLSearchParams({ classId: id });
    if (sessionId) query.set("sessionId", sessionId);
    try {
      setOfferings(rowsOf(await apiCall("GET", "/v1/class-subjects?" + query)));
    } catch (reason) {
      run(() => Promise.reject(reason));
    }
  }
  useEffect(() => { loadOfferings(); }, [classId, sessionId]);

  async function assign(payload, message) {
    const { ok } = await run(() => apiCall("POST", "/v1/class-subjects", { ...payload, classId, sessionId }), message);
    if (ok) loadOfferings();
    return ok;
  }
  async function submit(event) {
    event.preventDefault();
    const v = formObject(event);
    await assign({ sectionId: v.sectionId || undefined, subjectId: v.subjectId, staffId: v.staffId || undefined }, "Teacher assigned");
  }

  const sectionName = (id) => (id ? sections.find((row) => row.id === id)?.name || "-" : "All sections");
  return (
    <Screen title="Assign subject teacher" hint="Who teaches each subject in a class, for all sections or one section.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Assign">
        <Form onSubmit={submit}>
          <Field label="Class"><ClassSelect classes={classes} value={classId} onChange={(event) => setClassId(event.target.value)} /></Field>
          <Field label="Section">
            <select name="sectionId" defaultValue="" key={classId}>
              <option value="">All sections</option>
              {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <select name="subjectId" required defaultValue="">
              <option value="" disabled>Select subject</option>
              {subjects.map((row) => <option key={row.id} value={row.id}>{subjectLabel(row)}</option>)}
            </select>
          </Field>
          <Field label="Teacher">
            <select name="staffId" defaultValue="">
              <option value="">Unassigned</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!classId}>Assign</Button>
        </Form>
      </Panel>
      {classId && (
        <DataTable
          rows={offerings}
          empty="No subjects on this class yet."
          columns={[
            { key: "subject", label: "Subject", render: (row) => row.subject?.name || subjects.find((s) => s.id === row.subjectId)?.name || row.subjectId },
            { key: "section", label: "Section", render: (row) => sectionName(row.sectionId) },
            { key: "teacher", label: "Teacher", render: (row) => (
              <select
                aria-label={"Teacher for " + (row.subject?.name || "subject")}
                value={row.staffId || ""}
                onChange={(event) => assign({ sectionId: row.sectionId ?? undefined, subjectId: row.subjectId, staffId: event.target.value || undefined }, "Teacher updated")}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}
              </select>
            ) },
          ]}
        />
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------- Timetable */

export function ClassTimetable() {
  const { data, error, reload } = useMasters(["/v1/classes", "/v1/periods", "/v1/subjects", "/v1/staff"]);
  const classes = rowsOf(data["/v1/classes"]);
  const periods = rowsOf(data["/v1/periods"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const staff = rowsOf(data["/v1/staff"]);
  const sessionId = data["/v1/classes"]?.sessionId ?? null;
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [grid, setGrid] = useState({});
  const [status, run] = useStatus();
  const sections = useMemo(() => classes.find((row) => row.id === classId)?.sections || [], [classes, classId]);

  useEffect(() => {
    if (!sectionId) { setGrid({}); return; }
    let live = true;
    const query = new URLSearchParams({ sectionId });
    if (sessionId) query.set("sessionId", sessionId);
    apiCall("GET", "/v1/timetable?" + query)
      .then((json) => {
        if (!live) return;
        const next = {};
        for (const slot of rowsOf(json)) next[slot.weekday + ":" + slot.periodId] = slot;
        setGrid(next);
      })
      .catch((reason) => live && run(() => Promise.reject(reason)));
    return () => { live = false; };
  }, [sectionId, sessionId]);

  function cell(weekday, periodId) {
    return grid[weekday + ":" + periodId] || { weekday, periodId };
  }
  function update(weekday, periodId, patch) {
    const key = weekday + ":" + periodId;
    setGrid((current) => ({ ...current, [key]: { ...(current[key] || { weekday, periodId }), ...patch } }));
  }
  async function addPeriod(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/periods", { name: v.name, startTime: v.startTime, endTime: v.endTime }), "Period saved");
    if (ok) { form.reset(); reload(); }
  }
  async function removePeriod(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/periods/" + id), "Period removed");
    if (ok) reload();
  }
  async function save() {
    const slots = Object.values(grid)
      .filter((slot) => slot.subjectId || slot.staffId || (slot.room && slot.room.trim()))
      .map((slot) => ({
        weekday: slot.weekday,
        periodId: slot.periodId,
        subjectId: slot.subjectId || null,
        staffId: slot.staffId || null,
        room: slot.room?.trim() || null,
      }));
    await run(() => apiCall("PUT", "/v1/timetable", { sectionId, sessionId: sessionId || undefined, slots }), "Timetable saved");
  }

  return (
    <Screen title="Class timetable" hint="Periods for the day, then the weekly grid for one section. Saving checks for teacher and room clashes across sections.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Periods">
        <Form onSubmit={addPeriod}>
          <Field label="Name"><input name="name" placeholder="Period 1" required /></Field>
          <Field label="Starts"><input name="startTime" type="time" required /></Field>
          <Field label="Ends"><input name="endTime" type="time" required /></Field>
          <Button type="submit">Add period</Button>
        </Form>
        <DataTable
          rows={periods}
          empty="No periods yet. Add them before building a timetable."
          columns={[
            { key: "name", label: "Period" },
            { key: "time", label: "Time", render: (row) => row.startTime + "–" + row.endTime },
            { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => removePeriod(row.id)} /> },
          ]}
        />
      </Panel>
      <Panel title="Weekly grid" actions={sectionId && periods.length > 0 && <Button onClick={save}>Save timetable</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Class">
            <ClassSelect classes={classes} value={classId} onChange={(event) => {
              setClassId(event.target.value);
              setSectionId(classes.find((row) => row.id === event.target.value)?.sections?.[0]?.id || "");
            }} />
          </Field>
          <Field label="Section">
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} required>
              <option value="" disabled>Select section</option>
              {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
        </Form>
        {sectionId && periods.length > 0 && (
          <DataTable
            rows={WEEKDAYS.map((label, weekday) => ({ id: weekday, label, weekday }))}
            columns={[
              { key: "label", label: "Day" },
              ...periods.map((period) => ({
                key: period.id,
                label: period.name + " · " + period.startTime + "–" + period.endTime,
                render: (row) => {
                  const slot = cell(row.weekday, period.id);
                  return (
                    <span style={{ display: "grid", gap: 4, minWidth: 140 }}>
                      <select aria-label={row.label + " " + period.name + " subject"} value={slot.subjectId || ""} onChange={(event) => update(row.weekday, period.id, { subjectId: event.target.value || null })}>
                        <option value="">Subject</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select aria-label={row.label + " " + period.name + " teacher"} value={slot.staffId || ""} onChange={(event) => update(row.weekday, period.id, { staffId: event.target.value || null })}>
                        <option value="">Teacher</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}
                      </select>
                      <input aria-label={row.label + " " + period.name + " room"} placeholder="Room" value={slot.room || ""} onChange={(event) => update(row.weekday, period.id, { room: event.target.value })} />
                    </span>
                  );
                },
              })),
            ]}
          />
        )}
      </Panel>
    </Screen>
  );
}

/** Read-only week for one teacher, built from every section's timetable. */
export function TeacherTimetable() {
  const { data, error } = useMasters(["/v1/classes", "/v1/periods", "/v1/subjects", "/v1/staff"]);
  const classes = rowsOf(data["/v1/classes"]);
  const periods = rowsOf(data["/v1/periods"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  const staff = rowsOf(data["/v1/staff"]);
  const sessionId = data["/v1/classes"]?.sessionId ?? null;
  const [staffId, setStaffId] = useState("");
  const [slots, setSlots] = useState(null);
  const [status, run] = useStatus();

  useEffect(() => {
    if (!staffId) { setSlots(null); return; }
    let live = true;
    const sectionList = classes.flatMap((klass) => (klass.sections || []).map((section) => ({ klass, section })));
    run(async () => {
      const found = [];
      for (let start = 0; start < sectionList.length; start += 6) {
        const chunk = sectionList.slice(start, start + 6);
        const results = await Promise.all(chunk.map(({ section }) => {
          const query = new URLSearchParams({ sectionId: section.id });
          if (sessionId) query.set("sessionId", sessionId);
          return apiCall("GET", "/v1/timetable?" + query);
        }));
        results.forEach((json, index) => {
          for (const slot of rowsOf(json)) {
            if (slot.staffId === staffId) found.push({ ...slot, where: chunk[index].klass.name + " " + chunk[index].section.name });
          }
        });
      }
      if (live) setSlots(found);
      return found;
    }, (found) => found.length + (found.length === 1 ? " period" : " periods") + " this week");
    return () => { live = false; };
  }, [staffId, sessionId, classes.length]);

  const subjectName = (id) => subjects.find((row) => row.id === id)?.name || "";
  const at = (weekday, periodId) => (slots || []).filter((slot) => slot.weekday === weekday && slot.periodId === periodId);
  return (
    <Screen title="Teachers timetable" hint="A teacher's week across every class, from the class timetables.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Teacher">
            <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Select teacher</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {slots && (
        <DataTable
          rows={WEEKDAYS.map((label, weekday) => ({ id: weekday, label, weekday })).filter((row) => slots.some((slot) => slot.weekday === row.weekday) || (row.weekday >= 1 && row.weekday <= 5))}
          columns={[
            { key: "label", label: "Day" },
            ...periods.map((period) => ({
              key: period.id,
              label: period.name + " · " + period.startTime + "–" + period.endTime,
              render: (row) => at(row.weekday, period.id).map((slot) => (
                <div key={slot.id || slot.sectionId}>
                  <strong>{slot.where}</strong>
                  {slot.subjectId && <div>{subjectName(slot.subjectId)}</div>}
                  {slot.room && <div>Room {slot.room}</div>}
                </div>
              )),
            })),
          ]}
        />
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- Promote */

async function allStudents(classId, sectionId) {
  const rows = [];
  for (let page = 1; page < 200; page += 1) {
    const query = new URLSearchParams({ classId, sectionId, page: String(page), pageSize: "100" });
    const json = await apiCall("GET", "/v1/students?" + query);
    const batch = rowsOf(json);
    rows.push(...batch);
    if (!batch.length || rows.length >= Number(json.total ?? rows.length)) break;
  }
  return rows;
}

function nextSessionId(sessions, currentId) {
  const current = sessions.find((row) => row.id === currentId);
  if (!current) return currentId || sessions[0]?.id || "";
  const later = sessions
    .filter((row) => Number(row.sequenceNo ?? 0) > Number(current.sequenceNo ?? 0))
    .sort((a, b) => Number(a.sequenceNo ?? 0) - Number(b.sequenceNo ?? 0));
  return later[0]?.id || current.id;
}

const PROCEDURES = {
  promote: { kind: "promote", button: "Promote selected", done: "Promoted" },
  change: { kind: "change-class", button: "Change class", done: "Changed class for" },
  alumni: { kind: "alumni", button: "Mark alumni", done: "Marked alumni:" },
};

export function PromoteStudents() {
  const { data, error } = useMasters(["/v1/sessions", "/v1/classes"]);
  const sessions = rowsOf(data["/v1/sessions"]);
  const classes = rowsOf(data["/v1/classes"]);
  const currentSessionId = data["/v1/sessions"]?.currentSessionId ?? null;
  const [procedure, setProcedure] = useState("promote");
  const [fromClass, setFromClass] = useState("");
  const [fromSection, setFromSection] = useState("");
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [toSessionId, setToSessionId] = useState("");
  const [students, setStudents] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [status, run] = useStatus();

  useEffect(() => {
    if (sessions.length && !toSessionId) setToSessionId(nextSessionId(sessions, currentSessionId));
  }, [sessions.length, currentSessionId]);

  async function loadStudents(classId = fromClass, sectionId = fromSection) {
    if (!classId || !sectionId) { setStudents([]); setPicked(new Set()); return; }
    setLoading(true);
    try {
      const rows = await allStudents(classId, sectionId);
      setStudents(rows);
      setPicked(new Set(rows.map((row) => row.id)));
    } catch (reason) {
      run(() => Promise.reject(reason));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadStudents(); }, [fromClass, fromSection]);

  const sectionsOf = (id) => classes.find((row) => row.id === id)?.sections || [];
  const chosen = PROCEDURES[procedure];
  const needsTarget = procedure !== "alumni";
  const ready = picked.size > 0 && fromSection && (!needsTarget || (toSection && toSessionId));

  async function submit() {
    const target = needsTarget
      ? " to " + (classes.find((row) => row.id === toClass)?.name || "") + " " + (sectionsOf(toClass).find((row) => row.id === toSection)?.name || "") + " (" + (sessions.find((row) => row.id === toSessionId)?.name || "") + ")"
      : " as alumni";
    if (!window.confirm(chosen.button + ": " + picked.size + " student(s)" + target + "?")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/year-end/" + chosen.kind, {
      fromSectionId: fromSection,
      toSectionId: needsTarget ? toSection : undefined,
      toSessionId: needsTarget ? toSessionId : undefined,
      studentIds: [...picked],
    }), (json) => chosen.done + " " + (json.promoted ?? 0) + " student(s)");
    if (ok) loadStudents();
  }
  function toggle(id, on) {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  return (
    <Screen title="Promote students" hint="Move a section's students to their next class and session, change their class, or mark them alumni.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Procedure">
            <select value={procedure} onChange={(event) => setProcedure(event.target.value)}>
              <option value="promote">Promote</option>
              <option value="change">Change class</option>
              <option value="alumni">Alumni</option>
            </select>
          </Field>
          <Field label="From class">
            <ClassSelect classes={classes} value={fromClass} onChange={(event) => {
              setFromClass(event.target.value);
              setFromSection(sectionsOf(event.target.value)[0]?.id || "");
            }} />
          </Field>
          <Field label="From section">
            <select value={fromSection} onChange={(event) => setFromSection(event.target.value)}>
              <option value="" disabled>Select section</option>
              {sectionsOf(fromClass).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          {needsTarget && (
            <>
              <Field label="To class">
                <ClassSelect classes={classes} value={toClass} onChange={(event) => {
                  setToClass(event.target.value);
                  setToSection(sectionsOf(event.target.value)[0]?.id || "");
                }} />
              </Field>
              <Field label="To section">
                <select value={toSection} onChange={(event) => setToSection(event.target.value)}>
                  <option value="" disabled>Select section</option>
                  {sectionsOf(toClass).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </Field>
              <Field label="To session">
                <select value={toSessionId} onChange={(event) => setToSessionId(event.target.value)}>
                  <option value="" disabled>Select session</option>
                  {sessions.map((row) => <option key={row.id} value={row.id}>{row.name}{row.id === currentSessionId ? " (current)" : ""}</option>)}
                </select>
              </Field>
            </>
          )}
        </Form>
      </Panel>
      <Panel
        title={fromSection ? (loading ? "Loading students…" : picked.size + " of " + students.length + " selected") : "Students"}
        actions={
          <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
            {students.length > 0 && <Button variant="ghost" onClick={() => setPicked(picked.size === students.length ? new Set() : new Set(students.map((row) => row.id)))}>{picked.size === students.length ? "Select none" : "Select all"}</Button>}
            <Button onClick={submit} disabled={!ready || loading}>{chosen.button}</Button>
          </span>
        }
      >
        <DataTable
          rows={students}
          empty={fromSection ? "No students in this section." : "Pick a class and section to list its students."}
          columns={[
            { key: "pick", label: "", render: (row) => <input type="checkbox" aria-label={"Select " + row.name} checked={picked.has(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} /> },
            { key: "admissionNo", label: "Admission no" },
            { key: "name", label: "Name" },
            { key: "rollNo", label: "Roll", render: (row) => row.rollNo || "-" },
            { key: "status", label: "Status", render: (row) => row.status || "-" },
          ]}
        />
      </Panel>
    </Screen>
  );
}
