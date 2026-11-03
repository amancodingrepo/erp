import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen, StudentPicker,
  apiCall, dateOnly, formObject, money, rowsOf, staffName, useStatus, useLoad, useStudentNames, Row, plural, titleCase
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/campus-ops.tsx (StaffPanel, NamedMaster),
// payroll-ops.tsx and the HR entries of remaining-screens.tsx, with the same endpoints.

const STAFF_MODULE_KEYS = ["fees", "transport", "uniforms", "library", "academics", "others"];
const STAFF_ROLE_NAMES = ["Teacher", "PlatformAdmin", "SuperAdmin", "Principal", "Registrar", "Accountant", "HOD"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];



function toggleIn(set, id, on) {
  const next = new Set(set);
  if (on) next.add(id); else next.delete(id);
  return next;
}

function CheckGroup({ items, picked, onToggle, empty = "Nothing to pick." }) {
  if (!items.length) return <div className="ck-empty">{empty}</div>;
  return (
    <div className="ck-checklist">
      {items.map((item) => <Check key={item.id} label={item.name} checked={picked.has(item.id)} onChange={(event) => onToggle(item.id, event.target.checked)} />)}
    </div>
  );
}


/* ------------------------------------------------------- Staff directory */

function StaffForm({ row, roles, departments, designations, categories, classes, subjects, onDone, onCancel }) {
  const [status, run] = useStatus();
  const [modules, setModules] = useState(new Set(row?.modules || []));
  const [classIds, setClassIds] = useState(new Set(row?.classIds || []));
  const [subjectIds, setSubjectIds] = useState(new Set(row?.subjectIds || []));
  const roleChoices = roles.filter((role) => STAFF_ROLE_NAMES.includes(role.name));

  async function submit(event) {
    event.preventDefault();
    const v = formObject(event);
    const payload = {
      employeeId: v.employeeId,
      firstName: v.firstName,
      lastName: v.lastName || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      departmentId: v.departmentId || (row ? null : undefined),
      designationId: v.designationId || (row ? null : undefined),
      username: v.username || undefined,
      password: v.password || undefined,
      roleId: v.roleId || undefined,
      category: v.category || undefined,
      licenseNo: v.licenseNo || undefined,
      licenseExpiry: v.licenseExpiry || undefined,
      modules: [...modules],
      classIds: [...classIds],
      subjectIds: [...subjectIds],
    };
    if (row) delete payload.employeeId;
    const { ok, result } = await run(() => (row ? apiCall("PATCH", "/v1/staff/" + row.id, payload) : apiCall("POST", "/v1/staff", payload)), row ? "Staff saved" : "Staff added");
    if (ok) onDone(row ? null : result, row ? "Staff saved" : "Staff added");
  }

  return (
    <Panel title={row ? "Edit " + staffName(row) : "Add staff"} actions={<Button variant="ghost" onClick={onCancel}>Back to list</Button>}>
      <Notice status={status} />
      <Form onSubmit={submit}>
        <Field label="Staff ID"><input name="employeeId" defaultValue={row?.employeeId} required={!row} disabled={Boolean(row)} /></Field>
        <Field label="First name"><input name="firstName" defaultValue={row?.firstName} required /></Field>
        <Field label="Last name"><input name="lastName" defaultValue={row?.lastName || ""} /></Field>
        <Field label="Phone"><input name="phone" type="tel" defaultValue={row?.phone || ""} required={!row} /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={row?.email || ""} /></Field>
        {!row && <Field label="Login username"><input name="username" placeholder="Phone or staff ID if blank" autoComplete="off" /></Field>}
        {!row && <Field label="Password (min 8)"><input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Blank = one-time password" /></Field>}
        <Field label="Role">
          <select name="roleId" defaultValue={row?.login?.roles?.[0]?.id || ""} required={!row}>
            <option value="" disabled={!row}>{row ? "Keep role" : "Select role"}</option>
            {(roleChoices.length ? roleChoices : roles).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select name="departmentId" defaultValue={row?.departmentId || ""}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Designation">
          <select name="designationId" defaultValue={row?.designationId || ""}>
            <option value="">None</option>
            {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Staff category">
          <select name="category" defaultValue={row?.extra?.category || ""}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Licence no (drivers)"><input name="licenseNo" defaultValue={row?.extra?.licenseNo || ""} /></Field>
        <Field label="Licence expiry"><input name="licenseExpiry" type="date" defaultValue={row?.extra?.licenseExpiry || ""} /></Field>
        <Field label="Modules" wide><CheckGroup items={STAFF_MODULE_KEYS.map((key) => ({ id: key, name: key[0].toUpperCase() + key.slice(1) }))} picked={modules} onToggle={(id, on) => setModules((s) => toggleIn(s, id, on))} /></Field>
        <Field label={"Classes (" + classIds.size + ")"} wide><CheckGroup items={classes} picked={classIds} onToggle={(id, on) => setClassIds((s) => toggleIn(s, id, on))} empty="No classes yet." /></Field>
        <Field label={"Subjects (" + subjectIds.size + ")"} wide><CheckGroup items={subjects} picked={subjectIds} onToggle={(id, on) => setSubjectIds((s) => toggleIn(s, id, on))} empty="No subjects yet." /></Field>
        <Button type="submit">{row ? "Save staff" : "Add staff"}</Button>
      </Form>
    </Panel>
  );
}

function StaffDocuments({ row, onChange }) {
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const { ok } = await run(async () => {
      let url = String(data.get("url") || "").trim();
      if (file instanceof File && file.size > 0) {
        const upload = new FormData();
        upload.append("file", file);
        upload.append("kind", "staff");
        upload.append("ownerId", row.id);
        const response = await fetch("/api/v1/files", { method: "POST", body: upload, credentials: "same-origin" });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.url) throw new Error(json.fields?.file || json.message || "Upload failed.");
        url = json.url;
      }
      if (!url) throw new Error("Choose a file or paste an https:// link.");
      return apiCall("POST", "/v1/staff/" + row.id + "/documents", { name: data.get("name"), url });
    }, "Document saved");
    if (ok) { form.reset(); onChange(); }
  }
  async function remove(doc) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/staff/" + row.id + "/documents/" + doc.id), "Document removed");
    if (ok) onChange();
  }
  return (
    <Panel title={"Documents · " + staffName(row)}>
      <Notice status={status} />
      <Form onSubmit={add}>
        <Field label="Name"><input name="name" placeholder="Appointment letter" required /></Field>
        <Field label="File"><input name="file" type="file" /></Field>
        <Field label="Or link"><input name="url" type="url" placeholder="https://" /></Field>
        <Button type="submit">Save document</Button>
      </Form>
      <DataTable
        rows={row.documents || []}
        empty="No documents yet."
        columns={[
          { key: "name", label: "Document" },
          { key: "open", label: "", render: (doc) => <a href={doc.url} target="_blank" rel="noreferrer">Open</a> },
          { key: "act", label: "", render: (doc) => <RemoveButton onRemove={() => remove(doc)} /> },
        ]}
      />
    </Panel>
  );
}

function StaffDirectoryScreen({ inactiveOnly }) {
  const [listStatus, setListStatus] = useState(inactiveOnly ? "inactive" : "active");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const staffPath = "/v1/staff?" + new URLSearchParams({ status: listStatus, ...(query ? { q: query } : {}) });
  const { data, error, reload, loaded } = useLoad([staffPath, "/v1/departments", "/v1/designations", "/v1/staff-categories", "/v1/roles", "/v1/classes", "/v1/subjects"]);
  const rows = rowsOf(data[staffPath]);
  const [mode, setMode] = useState(null); // null | "add" | { edit: row } | { docs: id }
  const [issued, setIssued] = useState(null);
  const [status, run, setStatus] = useStatus();
  const masters = {
    departments: rowsOf(data["/v1/departments"]),
    designations: rowsOf(data["/v1/designations"]),
    categories: rowsOf(data["/v1/staff-categories"]),
    roles: rowsOf(data["/v1/roles"]),
    classes: rowsOf(data["/v1/classes"]),
    subjects: rowsOf(data["/v1/subjects"]),
  };

  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  async function resetPassword(row) {
    if (!row.login?.id) { run(() => Promise.reject(new Error(staffName(row) + " has no login yet."))); return; }
    if (!window.confirm("Reset the password for " + staffName(row) + "? Their current password stops working.")) return;
    const { ok, result } = await run(() => apiCall("POST", "/v1/users/" + row.login.id + "/reset-password"), "Password reset");
    if (ok) setIssued(result?.temporaryPassword ? { who: staffName(row), secret: result.temporaryPassword } : null);
  }
  async function setActive(row, isActive) {
    if (!isActive && !window.confirm("Deactivate " + staffName(row) + "? They will not be able to sign in.")) return;
    const { ok } = await run(() => apiCall("PATCH", "/v1/staff/" + row.id, { isActive }), isActive ? "Staff enabled" : "Staff deactivated");
    if (ok) reload();
  }

  const docsRow = mode?.docs ? rows.find((row) => row.id === mode.docs) : null;
  const title = inactiveOnly ? "Disabled staff" : "Staff directory";
  return (
    <Screen title={title} hint={inactiveOnly ? "Staff whose login is switched off. Enable them to restore access." : "Add staff with their login and role in one save, then edit, reset passwords or deactivate from the list."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {issued && (
        <p className="ck-notice ck-notice-ok" role="status">
          One-time password for {issued.who}: <strong style={{ userSelect: "all" }}>{issued.secret}</strong>. Share it once; it is not shown again. <Button variant="ghost" onClick={() => setIssued(null)}>Hide</Button>
        </p>
      )}
      {mode === "add" || mode?.edit ? (
        <StaffForm
          key={mode?.edit?.id || "new"}
          row={mode?.edit || null}
          {...masters}
          onCancel={() => setMode(null)}
          onDone={(created, message) => {
            setMode(null);
            setStatus({ message });
            reload();
            if (created?.temporaryPassword) setIssued({ who: staffName(created), secret: created.temporaryPassword });
          }}
        />
      ) : (
        <>
          <Panel actions={!inactiveOnly && <Button onClick={() => setMode("add")}>Add staff</Button>}>
            <Form onSubmit={(event) => event.preventDefault()}>
              <Field label="Search" wide><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, staff ID, phone or login" /></Field>
              {!inactiveOnly && (
                <Field label="Show">
                  <select value={listStatus} onChange={(event) => setListStatus(event.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All</option>
                  </select>
                </Field>
              )}
            </Form>
          </Panel>
          <DataTable
            rows={rows}
            empty={!loaded ? "Loading…" : query ? "No staff match that search." : "No staff here."}
            columns={[
              { key: "employeeId", label: "Staff ID" },
              { key: "name", label: "Name", render: (row) => <Row>{[row.firstName, row.lastName].filter(Boolean).join(" ")}{row.isActive === false && <span className="ck-badge ck-badge-warn">Inactive</span>}</Row> },
              { key: "role", label: "Role", render: (row) => (row.login?.roles || []).map((r) => r.name).join(", ") || "-" },
              { key: "dept", label: "Department", render: (row) => row.department?.name || "-" },
              { key: "designation", label: "Designation", render: (row) => row.designation?.name || "-" },
              { key: "login", label: "Login", render: (row) => row.login?.username || "-" },
              { key: "phone", label: "Phone", render: (row) => row.phone || "-" },
              { key: "act", label: "", render: (row) => (
                <Row>
                  <Button variant="ghost" onClick={() => setMode({ edit: row })}>Edit</Button>
                  <Button variant="ghost" onClick={() => setMode({ docs: row.id })}>Documents ({(row.documents || []).length})</Button>
                  {row.login && <Button variant="ghost" onClick={() => resetPassword(row)}>Reset password</Button>}
                  <a className="ck-btn ck-btn-ghost" href={"/api/v1/staff/" + row.id + "/id-card?format=pdf"} target="_blank" rel="noreferrer">ID card</a>
                  {row.isActive === false
                    ? <Button variant="ghost" onClick={() => setActive(row, true)}>Enable</Button>
                    : <Button variant="danger" onClick={() => setActive(row, false)}>Deactivate</Button>}
                </Row>
              ) },
            ]}
          />
          {docsRow && <StaffDocuments row={docsRow} onChange={reload} />}
        </>
      )}
    </Screen>
  );
}

export function StaffDirectory() { return <StaffDirectoryScreen />; }
export function DisabledStaff() { return <StaffDirectoryScreen inactiveOnly />; }

/* ----------------------------------------------------------- Designation */

export function Designations() {
  const { data, error, reload } = useLoad(["/v1/designations"]);
  const rows = rowsOf(data["/v1/designations"]);
  const [status, run] = useStatus();
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/designations", { name: v.name }), "Designation saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/designations/" + id), "Designation removed");
    if (ok) reload();
  }
  return (
    <Screen title="Designation" hint="Job titles used on staff records, such as Teacher, Clerk or Principal.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New designation">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" placeholder="Assistant Professor" required /></Field>
          <Button type="submit">Add designation</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No designations yet." columns={[
        { key: "name", label: "Designation" },
        { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
      ]} />
    </Screen>
  );
}

/* --------------------------------------------------- Mentors and projects */

export function AssignMentor() {
  const { data, error, reload } = useLoad(["/v1/ops/mentors", "/v1/staff"]);
  const rows = rowsOf(data["/v1/ops/mentors"]);
  const staff = rowsOf(data["/v1/staff"]);
  const studentNames = useStudentNames(rows.map((row) => row.studentId));
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    if (!student) return;
    const v = formObject(event);
    if (rows.some((row) => row.studentId === student.id && row.staffId === v.staffId)) { run(() => Promise.reject(new Error("That mentor is already assigned to " + student.name + "."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/ops/mentors", { staffId: v.staffId, studentId: student.id }), "Mentor assigned");
    if (ok) { setStudent(null); reload(); }
  }
  const mentor = (id) => staffName(staff.find((row) => row.id === id)) || "Unknown staff";
  return (
    <Screen title="Assign mentor" hint="Link a student to a staff mentor.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Assign">
        <Form onSubmit={submit}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label="Mentor">
            <select name="staffId" required defaultValue="">
              <option value="" disabled>Select staff</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!student}>Assign mentor</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No mentors assigned yet." columns={[
        { key: "student", label: "Student", render: (row) => studentNames[row.studentId] || "Loading…" },
        { key: "mentor", label: "Mentor", render: (row) => mentor(row.staffId) },
      ]} />
    </Screen>
  );
}

const PROJECT_SCREENS = {
  projects: { title: "Project list", kind: "PROJECT", hint: "Student projects and who is guiding them." },
  ojt: { title: "OJT / SIP list", kind: "OJT", hint: "On-the-job training and summer internship records." },
  chapters: { title: "Project chapters", kind: "PROJECT", chapter: true, hint: "Chapters submitted for student projects." },
  ojtDetails: { title: "OJT details", kind: "OJT", hint: "Details of each student's on-the-job training." },
};

function MentorProjects({ variant }) {
  const config = PROJECT_SCREENS[variant];
  const { data, error, reload } = useLoad(["/v1/ops/mentor-projects", "/v1/staff"]);
  const all = rowsOf(data["/v1/ops/mentor-projects"]);
  const rows = all.filter((row) => (row.kind || "PROJECT") === config.kind && (!config.chapter || row.chapter));
  const staff = rowsOf(data["/v1/staff"]);
  const studentNames = useStudentNames(rows.map((row) => row.studentId));
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    if (!student) return;
    const form = event.currentTarget;
    const v = formObject(event);
    // The record type is fixed per screen; the old form left it as free text, so blank OJT entries were saved as PROJECT.
    const { ok } = await run(() => apiCall("POST", "/v1/ops/mentor-projects", {
      studentId: student.id,
      title: v.title,
      staffId: v.staffId || undefined,
      kind: config.kind,
      chapter: v.chapter || undefined,
    }), "Saved");
    if (ok) { form.reset(); setStudent(null); reload(); }
  }
  return (
    <Screen title={config.title} hint={config.hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add">
        <Form onSubmit={submit}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label={config.kind === "OJT" ? "Organisation / role" : "Project title"} wide><input name="title" required /></Field>
          {config.chapter && <Field label="Chapter"><input name="chapter" placeholder="Chapter 2: Literature review" required /></Field>}
          <Field label="Guide">
            <select name="staffId" defaultValue="">
              <option value="">Not assigned</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!student}>Save</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="Nothing recorded yet." columns={[
        { key: "student", label: "Student", render: (row) => studentNames[row.studentId] || "Loading…" },
        { key: "title", label: config.kind === "OJT" ? "Organisation / role" : "Title" },
        ...(config.chapter ? [{ key: "chapter", label: "Chapter" }] : []),
        { key: "guide", label: "Guide", render: (row) => staffName(staff.find((s) => s.id === row.staffId)) || "-" },
        { key: "status", label: "Status", render: (row) => titleCase(row.status) },
      ]} />
    </Screen>
  );
}

export function ProjectList() { return <MentorProjects variant="projects" />; }
export function OjtList() { return <MentorProjects variant="ojt" />; }
export function ProjectChapters() { return <MentorProjects variant="chapters" />; }
export function OjtDetails() { return <MentorProjects variant="ojtDetails" />; }

/* ------------------------------------------------------------ Recruitment */

export function Recruitment() {
  const { data, error, reload } = useLoad(["/v1/ops/jobs", "/v1/departments"]);
  const rows = rowsOf(data["/v1/ops/jobs"]);
  const departments = rowsOf(data["/v1/departments"]);
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/ops/jobs", { title: v.title, department: v.department || undefined, closesOn: v.closesOn || undefined }), "Job posted");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Recruitment" hint="Open positions and how many people have applied.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New opening">
        <Form onSubmit={submit}>
          <Field label="Job title" wide><input name="title" placeholder="Physics teacher" required /></Field>
          <Field label="Department">
            <select name="department" defaultValue="">
              <option value="">Any</option>
              {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Closes on"><input name="closesOn" type="date" /></Field>
          <Button type="submit">Post job</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No openings yet." columns={[
        { key: "title", label: "Job" },
        { key: "department", label: "Department", render: (row) => row.department || "-" },
        { key: "closesOn", label: "Closes", render: (row) => dateOnly(row.closesOn) || "-" },
        { key: "applicants", label: "Applicants", render: (row) => row._count?.applicants ?? 0 },
      ]} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- Payroll */

export function PayElements() {
  const { data, error, reload } = useLoad(["/v1/payroll/elements"]);
  const rows = rowsOf(data["/v1/payroll/elements"]);
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const code = v.code.trim().toUpperCase();
    if (rows.some((row) => String(row.code).toUpperCase() === code)) { run(() => Promise.reject(new Error("Code " + code + " already exists."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/payroll/elements", { code, name: v.name, kind: v.kind }), "Pay element saved");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Pay elements" hint="Earnings and deductions that make up a salary. PF, ESI, PT and TDS are worked out automatically.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New pay element">
        <Form onSubmit={submit}>
          <Field label="Code"><input name="code" placeholder="HRA" required /></Field>
          <Field label="Name"><input name="name" placeholder="House rent allowance" required /></Field>
          <Field label="Kind">
            <select name="kind" defaultValue="EARNING">
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </Field>
          <Button type="submit">Add element</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No pay elements yet." columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "kind", label: "Kind", render: (row) => (row.kind === "DEDUCTION" ? "Deduction" : "Earning") },
        { key: "statutory", label: "", render: (row) => (row.isStatutory ? <span className="ck-badge">Statutory</span> : null) },
      ]} />
    </Screen>
  );
}

export function PayStructure() {
  const { data, error, reload } = useLoad(["/v1/staff", "/v1/payroll/elements", "/v1/payroll/structure"]);
  const staff = rowsOf(data["/v1/staff"]);
  const elements = rowsOf(data["/v1/payroll/elements"]).filter((row) => !row.isStatutory);
  const rows = rowsOf(data["/v1/payroll/structure"]);
  const [staffId, setStaffId] = useState("");
  const [status, run] = useStatus();
  const shown = staffId ? rows.filter((row) => row.staff?.id === staffId) : rows;
  const totals = useMemo(() => {
    const sum = (kind) => shown.filter((row) => row.element?.kind === kind).reduce((total, row) => total + Number(row.amount || 0), 0);
    return { earning: sum("EARNING"), deduction: sum("DEDUCTION") };
  }, [shown]);

  async function submit(event) {
    event.preventDefault();
    const v = formObject(event);
    const amount = Number(v.amount);
    if (!Number.isFinite(amount) || amount < 0) { run(() => Promise.reject(new Error("Enter a monthly amount of 0 or more."))); return; }
    const existing = rows.find((row) => row.staff?.id === v.staffId && row.element?.id === v.elementId);
    const { ok } = await run(() => apiCall("POST", "/v1/payroll/structure", { staffId: v.staffId, elementId: v.elementId, amount: v.amount }), existing ? "Amount updated" : "Element added to salary");
    if (ok) { event.target.reset?.(); reload(); }
  }

  return (
    <Screen title="Staff pay structure" hint="The monthly amount of each pay element for each staff member. Saving an element that is already on the salary replaces its amount.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Set amount">
        <Form onSubmit={submit}>
          <Field label="Staff">
            <select name="staffId" required value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="" disabled>Select staff</option>
              {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
            </select>
          </Field>
          <Field label="Pay element">
            <select name="elementId" required defaultValue="">
              <option value="" disabled>{elements.length ? "Select element" : "Add pay elements first"}</option>
              {elements.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
            </select>
          </Field>
          <Field label="Monthly amount (₹)"><input name="amount" type="number" min="0" step="0.01" required /></Field>
          <Button type="submit">Save</Button>
        </Form>
      </Panel>
      <Panel title={staffId ? "Salary of " + staffName(staff.find((row) => row.id === staffId)) + " · earnings " + money(totals.earning) + ", deductions " + money(totals.deduction) : "All staff"} actions={staffId && <Button variant="ghost" onClick={() => setStaffId("")}>Show all staff</Button>}>
        <DataTable rows={shown} empty="No pay elements set yet." columns={[
          { key: "staff", label: "Staff", render: (row) => staffName(row.staff) },
          { key: "element", label: "Element", render: (row) => (row.element ? row.element.code + " · " + row.element.name : "-") },
          { key: "kind", label: "Kind", render: (row) => (row.element?.kind === "DEDUCTION" ? "Deduction" : "Earning") },
          { key: "amount", label: "Monthly", render: (row) => money(row.amount) },
        ]} />
      </Panel>
    </Screen>
  );
}

export function TaxSlabs() {
  const { data, error, reload } = useLoad(["/v1/payroll/slabs"]);
  const rows = rowsOf(data["/v1/payroll/slabs"])
    .slice()
    .sort((a, b) => String(a.kind).localeCompare(String(b.kind)) || Number(a.minAmount) - Number(b.minAmount));
  const [kind, setKind] = useState("PT");
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const min = Number(v.minAmount);
    const max = v.maxAmount === "" ? null : Number(v.maxAmount);
    if (max !== null && max < min) { run(() => Promise.reject(new Error("The upper limit must be above the lower limit."))); return; }
    const clash = rows.find((row) => row.kind === kind && min <= (row.maxAmount == null ? Infinity : Number(row.maxAmount)) && (max == null ? Infinity : max) >= Number(row.minAmount));
    if (clash && !window.confirm("This band overlaps the " + kind + " band " + money(clash.minAmount) + " – " + (clash.maxAmount == null ? "no limit" : money(clash.maxAmount)) + ". Overlapping bands can charge tax twice. Save anyway?")) return;
    const body = { kind, minAmount: v.minAmount, maxAmount: v.maxAmount === "" ? null : v.maxAmount };
    if (kind === "PT") body.taxAmount = v.taxAmount; else body.rate = String(Number(v.ratePct) / 100);
    const { ok } = await run(() => apiCall("POST", "/v1/payroll/slabs", body), "Slab saved");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Tax slabs" hint="Professional tax (a fixed amount per salary band) and TDS (a percentage per income band), used when payroll is generated.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New slab">
        <Form onSubmit={submit}>
          <Field label="Tax">
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="PT">Professional tax (PT)</option>
              <option value="TDS">TDS</option>
            </select>
          </Field>
          <Field label="From (₹)"><input name="minAmount" type="number" min="0" step="0.01" required /></Field>
          <Field label="Up to (₹)"><input name="maxAmount" type="number" min="0" step="0.01" placeholder="No upper limit" /></Field>
          {kind === "PT"
            ? <Field label="PT amount (₹)"><input name="taxAmount" type="number" min="0" step="0.01" required key="pt" /></Field>
            : <Field label="TDS rate (%)"><input name="ratePct" type="number" min="0" max="100" step="0.01" placeholder="5" required key="tds" /></Field>}
          <Button type="submit">Add slab</Button>
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No slabs yet." columns={[
        { key: "kind", label: "Tax" },
        { key: "band", label: "Band", render: (row) => money(row.minAmount) + " – " + (row.maxAmount == null ? "no limit" : money(row.maxAmount)) },
        { key: "value", label: "Charge", render: (row) => (row.taxAmount != null ? money(row.taxAmount) : row.rate != null ? +(Number(row.rate) * 100).toFixed(4) + "%" : "-") },
      ]} />
    </Screen>
  );
}

export function PayrollRun() {
  const { data, error, reload } = useLoad(["/v1/payroll/runs", "/v1/staff?status=all"]);
  const runs = rowsOf(data["/v1/payroll/runs"]);
  const staff = rowsOf(data["/v1/staff?status=all"]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [openId, setOpenId] = useState(null);
  const [status, run] = useStatus();
  const exists = runs.some((row) => row.year === Number(year) && row.month === Number(month));

  async function generate(event) {
    event.preventDefault();
    const label = MONTHS[month - 1] + " " + year;
    if (!window.confirm("Generate payroll for " + label + "? This can be done once per month and cannot be undone here.")) return;
    const { ok, result } = await run(() => apiCall("POST", "/v1/payroll/runs", { year: Number(year), month: Number(month) }), (json) => "Payroll generated for " + label + ": " + plural((json.slips || []).length, "payslip"));
    if (ok) { await reload(); setOpenId(result.id); }
  }
  const who = (slip) => staffName(staff.find((row) => row.id === slip.staffId)) || slip.employeeId || "Staff";
  const total = (slips, key) => slips.reduce((sum, slip) => sum + Number(slip[key] || 0), 0);
  const open = runs.find((row) => row.id === openId);

  return (
    <Screen title="Generate staff payroll" hint="Works out gross pay, PF, ESI, PT, TDS and net pay for every staff member with a pay structure.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Generate">
        <Form onSubmit={generate}>
          <Field label="Month">
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </Field>
          <Field label="Year"><input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} /></Field>
          <Button type="submit" disabled={exists}>{exists ? "Already generated" : "Generate payroll"}</Button>
        </Form>
      </Panel>
      <DataTable rows={runs} empty="No payroll generated yet." columns={[
        { key: "month", label: "Month", render: (row) => MONTHS[row.month - 1] + " " + row.year },
        { key: "slips", label: "Payslips", render: (row) => (row.slips || []).length },
        { key: "gross", label: "Gross", render: (row) => money(total(row.slips || [], "gross")) },
        { key: "net", label: "Net", render: (row) => money(total(row.slips || [], "net")) },
        { key: "status", label: "Status", render: (row) => titleCase(row.status) },
        { key: "act", label: "", render: (row) => <Button variant="ghost" onClick={() => setOpenId(openId === row.id ? null : row.id)}>{openId === row.id ? "Hide" : "Payslips"}</Button> },
      ]} />
      {open && (
        <Panel title={"Payslips · " + MONTHS[open.month - 1] + " " + open.year}>
          <DataTable rows={open.slips || []} rowKey={(slip, index) => slip.id || index} empty="No payslips in this run." columns={[
            { key: "who", label: "Staff", render: who },
            { key: "gross", label: "Gross", render: (slip) => money(slip.gross) },
            { key: "pf", label: "PF", render: (slip) => money(slip.pf) },
            { key: "esi", label: "ESI", render: (slip) => money(slip.esi) },
            { key: "pt", label: "PT", render: (slip) => money(slip.pt) },
            { key: "tds", label: "TDS", render: (slip) => money(slip.tds) },
            { key: "net", label: "Net", render: (slip) => <strong>{money(slip.net)}</strong> },
            { key: "pdf", label: "", render: (slip) => (slip.id ? <a href={"/api/v1/payroll/slips/" + slip.id + "?format=pdf"} target="_blank" rel="noreferrer">Payslip PDF</a> : null) },
          ]} />
        </Panel>
      )}
    </Screen>
  );
}
