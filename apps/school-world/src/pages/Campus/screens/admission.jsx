import React, { useEffect, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiDelete, apiGet, apiPatch, apiPost, dateOnly, formObject, lineProblem, money, uploadForm, useList, useStatus
} from "../kit.jsx";

const DOT = " · ";

function EnrollForm({ classes, onEnroll }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const sections = classes.find((row) => row.id === classId)?.sections ?? [];
  return (
    <form className="ck-form" onSubmit={onEnroll}>
      <select name="classId" value={classId} onChange={(event) => setClassId(event.target.value)} required aria-label="Class">
        {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>
      <select name="sectionId" required aria-label="Section">
        {sections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>
      <input name="admissionNo" placeholder="Admission no (optional)" aria-label="Admission no" />
      <Button type="submit">Enroll</Button>
    </form>
  );
}

export function OnlineApplications() {
  const [q, setQ] = useState("");
  const [path, setPath] = useState("/v1/applications?q=");
  const apps = useList(path);
  const classes = useList("/v1/classes");
  const [status, run] = useStatus();
  const [issued, setIssued] = useState(null);

  async function markPaid(id) {
    const { ok } = await run(() => apiPost("/v1/applications/" + id + "/pay", { method: "CASH" }), "Fee marked paid");
    if (ok) apps.reload();
  }
  async function enroll(event, id) {
    event.preventDefault();
    const values = formObject(event);
    const { ok, result } = await run(() => apiPost("/v1/applications/" + id + "/convert-to-student", {
      class_id: values.classId, section_id: values.sectionId, admission_no: values.admissionNo || undefined,
    }), (json) => "Enrolled " + json.admissionNo + (json.portals?.student ? ". Portal logins are shown once below." : ""));
    if (ok) {
      if (result?.portals?.student) {
        setIssued({ admissionNo: result.admissionNo, campusCode: result.portals.campusCode, student: result.portals.student, parent: result.portals.parent, mail: result.portals.mail });
      }
      apps.reload();
    }
  }

  return (
    <Screen title="Online applications" hint="Applications from the public form. Mark the fee paid, then enroll the applicant.">
      <Notice status={{ error: apps.error || classes.error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={(event) => { event.preventDefault(); setPath("/v1/applications?q=" + encodeURIComponent(q)); }}>
          <Field label="Search"><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, mobile, or application no" /></Field>
          <Button type="submit">Find</Button>
        </Form>
      </Panel>
      {issued && (
        <Panel title="Portal logins (shown once, copy now)">
          <p>Campus {issued.campusCode}. Sign in as Student or Parent.</p>
          <p>Student: <code>{issued.student.username}</code> / <code>{issued.student.password}</code></p>
          {issued.parent
            ? <p>Parent: <code>{issued.parent.username}</code> / <code>{issued.parent.password}</code></p>
            : <p>No parent login (no father name on the application).</p>}
          <p>Email student: {issued.mail?.student ?? "n/a"}{issued.parent ? DOT + "parent: " + (issued.mail?.parent ?? "n/a") : ""}. "sent" means delivered; "logged" means SMTP is not set up yet, so copy the passwords here.</p>
        </Panel>
      )}
      <DataTable
        rows={apps.rows}
        empty="No applications yet. The public form is at /apply."
        columns={[
          { key: "applicationNo", label: "Reference" },
          { key: "name", label: "Name", render: (row) => <>{row.name}<div style={{ opacity: 0.7 }}>{row.mobile}</div></> },
          { key: "program", label: "Program", render: (row) => row.program ?? "-" },
          { key: "fee", label: "Fee", render: (row) => row.paymentStatus + DOT + money(row.feeAmount) },
          { key: "status", label: "Status", render: (row) => (row.enrolled ? "Enrolled " + row.admissionNo : row.status) },
          { key: "act", label: "", render: (row) => {
            if (row.enrolled) return null;
            if (row.paymentStatus !== "PAID") return <Button onClick={() => markPaid(row.id)}>Mark fee paid</Button>;
            return <EnrollForm key={row.id + ":" + classes.rows.length} classes={classes.rows} onEnroll={(event) => enroll(event, row.id)} />;
          } },
        ]}
      />
    </Screen>
  );
}

export function CutoffSetup() {
  const programs = useList("/v1/programs");
  const cutoffs = useList("/v1/admission/cutoffs");
  const [status, run] = useStatus();

  async function save(event) {
    event.preventDefault();
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/admission/cutoffs", {
      programId: values.programId, roundNo: Number(values.roundNo), categoryCode: values.categoryCode, minScore: values.minScore,
    }), "Cutoff saved");
    if (ok) cutoffs.reload();
  }

  return (
    <Screen title="Cutoff setup" hint="Minimum score a category needs in each round of a program.">
      <Notice status={{ error: programs.error || cutoffs.error || status.error, message: status.message }} />
      <Panel title="Set cutoff">
        <Form onSubmit={save}>
          <Field label="Program"><select name="programId" required>{programs.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
          <Field label="Round"><input name="roundNo" type="number" min="1" defaultValue="1" required /></Field>
          <Field label="Category"><input name="categoryCode" placeholder="GEN / OBC / SC / ST / EWS" required /></Field>
          <Field label="Minimum score"><input name="minScore" required /></Field>
          <Button type="submit">Save cutoff</Button>
        </Form>
      </Panel>
      <DataTable
        rows={cutoffs.rows}
        empty="No cutoffs yet."
        columns={[
          { key: "program", label: "Program" },
          { key: "roundNo", label: "Round" },
          { key: "categoryCode", label: "Category" },
          { key: "minScore", label: "Minimum score" },
        ]}
      />
    </Screen>
  );
}

export function ImportApplicants() {
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setStatus({}); setErrors([]);
    try {
      const { ok, json } = await uploadForm("/v1/admission/import", new FormData(form));
      if (ok) {
        setStatus({ message: "Imported " + json.inserted + " applicants." });
        form.reset();
      } else {
        const lines = json.errors ?? [];
        setErrors(lines);
        setStatus({ error: lines.length ? "Nothing was imported. Fix the lines below and upload again." : json.message || json.error || "Import failed." });
      }
    } catch (reason) {
      setStatus({ error: reason.message || "Import failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Import applicants" hint="CSV columns: First Name, Last Name, Category, Score, Program, Mobile, Email. One bad row rejects the whole file.">
      <Notice status={status} />
      <Panel>
        <Form onSubmit={upload}>
          <Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" required /></Field>
          <Button type="submit" disabled={busy}>{busy ? "Importing..." : "Import"}</Button>
        </Form>
      </Panel>
      {errors.length > 0 && (
        <DataTable
          rows={errors}
          rowKey={(row, index) => row.line ?? index}
          columns={[
            { key: "line", label: "Line" },
            { key: "fields", label: "Problem", render: lineProblem },
          ]}
        />
      )}
    </Screen>
  );
}

export function GenerateMerit() {
  const programs = useList("/v1/programs");
  const [status, run] = useStatus();

  async function generate(event) {
    event.preventDefault();
    const values = formObject(event);
    await run(
      () => apiPost("/v1/admission/merit", { programId: values.programId, roundNo: Number(values.roundNo) }),
      (json) => "Ranked " + json.ranked + ", rejected " + json.rejected
    );
  }

  return (
    <Screen title="Generate merit list" hint="Ranks applicants who meet the category cutoff for the chosen round.">
      <Notice status={{ error: programs.error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={generate}>
          <Field label="Program"><select name="programId" required>{programs.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
          <Field label="Round"><input name="roundNo" type="number" min="1" defaultValue="1" required /></Field>
          <Button type="submit">Generate</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function ManageAdmission() {
  const { rows, error, reload } = useList("/v1/admission/merit");
  const [status, run] = useStatus();

  async function setSelection(id, value) {
    const { ok } = await run(() => apiPatch("/v1/applications/" + id + "/selection", { status: value }), "Marked " + value);
    if (ok) reload();
  }

  return (
    <Screen title="Manage admission" hint="Select, waitlist or reject applicants from the merit list.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <DataTable
        rows={rows}
        empty="No merit list yet. Generate one first."
        columns={[
          { key: "meritRank", label: "Rank", render: (row) => row.meritRank ?? "-" },
          { key: "name", label: "Applicant", render: (row) => <>{row.name}<div style={{ opacity: 0.7 }}>{row.applicationNo}{DOT}{row.categoryCode}</div></> },
          { key: "score", label: "Score", render: (row) => row.score ?? "-" },
          { key: "selectionStatus", label: "Status", render: (row) => <span className="ck-badge">{row.selectionStatus}</span> },
          { key: "act", label: "", render: (row) => (row.selectionStatus === "MERIT" || row.selectionStatus === "WAITLISTED" ? (
            <span style={{ display: "inline-flex", gap: 8 }}>
              <Button onClick={() => setSelection(row.id, "SELECTED")}>Select</Button>
              <Button variant="ghost" onClick={() => setSelection(row.id, "WAITLISTED")}>Waitlist</Button>
              <Button variant="danger" onClick={() => setSelection(row.id, "REJECTED")}>Reject</Button>
            </span>
          ) : null) },
        ]}
      />
    </Screen>
  );
}

export function AdmissionTests() {
  const [tests, setTests] = useState([]);
  const [sits, setSits] = useState([]);
  const [loadError, setLoadError] = useState("");
  const apps = useList("/v1/applications");
  const classes = useList("/v1/classes");
  const [status, run] = useStatus();

  async function load() {
    try {
      const json = await apiGet("/v1/admission-tests");
      setTests(json?.data ?? []);
      setSits(json?.sits ?? []);
      setLoadError("");
    } catch (reason) {
      setLoadError(reason.message || "Could not load tests.");
    }
  }
  useEffect(() => { load(); }, []);

  async function addTest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/admission-tests", {
      name: values.name, date: values.date, classId: values.classId || undefined, venue: values.venue || undefined,
    }), "Test saved");
    if (ok) { form.reset(); load(); }
  }
  async function addScore(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const { ok } = await run(() => apiPost("/v1/admission-tests/sits", {
      testId: data.get("testId"), applicationId: data.get("applicationId"),
      score: data.get("score") || undefined, appeared: data.get("appeared") === "on",
    }), "Score saved");
    if (ok) { form.reset(); load(); }
  }
  async function removeTest(id) {
    const { ok } = await run(() => apiDelete("/v1/admission-tests/" + id), "Test removed");
    if (ok) load();
  }

  const appLabel = new Map(apps.rows.map((row) => [row.id, row.applicationNo + DOT + row.name]));
  const testName = new Map(tests.map((row) => [row.id, row.name]));

  return (
    <Screen title="Admission tests" hint="Named entrance tests. Scores of applicants who appeared feed the merit list.">
      <Notice status={{ error: loadError || apps.error || classes.error || status.error, message: status.message }} />
      <Panel title="New test">
        <Form onSubmit={addTest}>
          <Field label="Name"><input name="name" placeholder="Entrance" required /></Field>
          <Field label="Date"><input name="date" type="date" required /></Field>
          <Field label="Class">
            <select name="classId"><option value="">Any class</option>{classes.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Field label="Venue"><input name="venue" /></Field>
          <Button type="submit">Save test</Button>
        </Form>
      </Panel>
      <Panel title="Record a score">
        <Form onSubmit={addScore}>
          <Field label="Test">
            <select name="testId" required><option value="">Select test</option>{tests.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Field label="Applicant">
            <select name="applicationId" required>
              <option value="">Select applicant</option>
              {apps.rows.map((row) => <option key={row.id} value={row.id}>{row.applicationNo + DOT + row.name}</option>)}
            </select>
          </Field>
          <Field label="Score"><input name="score" type="number" min="0" step="0.01" /></Field>
          <Check name="appeared" label="Appeared" defaultChecked />
          <Button type="submit">Save score</Button>
        </Form>
      </Panel>
      <DataTable
        rows={tests}
        empty="No tests yet."
        columns={[
          { key: "name", label: "Test" },
          { key: "date", label: "Date", render: (row) => dateOnly(row.date) },
          { key: "className", label: "Class" },
          { key: "venue", label: "Venue" },
          { key: "sitCount", label: "Sits" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => removeTest(row.id)} /> },
        ]}
      />
      {sits.length > 0 && (
        <DataTable
          rows={sits}
          columns={[
            { key: "test", label: "Test", render: (row) => testName.get(row.testId) ?? row.testId },
            { key: "applicant", label: "Applicant", render: (row) => appLabel.get(row.applicationId) ?? row.applicationId },
            { key: "score", label: "Result", render: (row) => (row.appeared ? row.score ?? "-" : "absent") },
          ]}
        />
      )}
    </Screen>
  );
}
