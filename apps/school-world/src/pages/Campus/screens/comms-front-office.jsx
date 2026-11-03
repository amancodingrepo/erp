import React, { useEffect, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiCall, dateOnly, formObject, rowsOf, useStatus, useLoad, Row, plural, titleCase
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/comms-ops.tsx and front-office-ops.tsx,
// with the same endpoints.

const when = (value) => (value ? new Date(value).toLocaleString() : "-");




/* ------------------------------------------------------------- Templates */

// Only these are filled in when a message is sent (see composeToClass in apps/erp).
const PLACEHOLDERS = ["{{name}}", "{{admissionNo}}", "{{campus}}"];

function Templates({ channel }) {
  const path = "/v1/message-templates?channel=" + channel;
  const { data, error, reload } = useLoad([path]);
  const rows = rowsOf(data[path]);
  const [editing, setEditing] = useState(null);
  const [status, run] = useStatus();
  const isEmail = channel === "EMAIL";

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    // Fee reminders also fill {{balance}}, but only in the template named fee_due.
    const allowed = v.name.trim() === "fee_due" ? [...PLACEHOLDERS, "{{balance}}"] : PLACEHOLDERS;
    const unknown = [...String(v.body + " " + (v.subject || "")).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => "{{" + m[1] + "}}").filter((tag) => !allowed.includes(tag));
    if (unknown.length && !window.confirm([...new Set(unknown)].join(", ") + " will not be filled in when sending and will reach students as written. Save anyway?")) return;
    const body = { channel, name: v.name.trim(), subject: isEmail ? v.subject || undefined : undefined, body: v.body };
    const { ok } = await run(
      () => (editing ? apiCall("PATCH", "/v1/message-templates/" + editing.id, body) : apiCall("POST", "/v1/message-templates", body)),
      editing ? "Template updated" : "Template saved"
    );
    if (ok) { form.reset(); setEditing(null); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/message-templates/" + id), "Template removed");
    if (ok) reload();
  }

  return (
    <Screen title={isEmail ? "Email templates" : "SMS templates"} hint={"Reusable messages. Placeholders that are filled in: " + PLACEHOLDERS.join(" ") + ". A template named fee_due is used by Fees Reminder, which also fills {{balance}}."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={editing ? "Edit " + editing.name : "New template"}>
        <Form onSubmit={submit} key={editing?.id || "new"}>
          <Field label="Name"><input name="name" placeholder="fee_due" defaultValue={editing?.name} required readOnly={Boolean(editing)} /></Field>
          {isEmail && <Field label="Subject" wide><input name="subject" defaultValue={editing?.subject || ""} /></Field>}
          <Field label={isEmail ? "Body" : "Message"} wide>
            <textarea name="body" rows={5} required defaultValue={editing?.body} maxLength={isEmail ? undefined : 1000} style={{ height: "auto", padding: 10 }} />
          </Field>
          <Button type="submit">{editing ? "Save template" : "Add template"}</Button>
          {editing && <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>}
        </Form>
      </Panel>
      <DataTable rows={rows} empty="No templates yet." columns={[
        { key: "name", label: "Name" },
        ...(isEmail ? [{ key: "subject", label: "Subject", render: (row) => row.subject || "-" }] : []),
        { key: "body", label: "Message", render: (row) => String(row.body || "").slice(0, 120) + (String(row.body || "").length > 120 ? "…" : "") },
        { key: "act", label: "", render: (row) => <Row><Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button><RemoveButton onRemove={() => remove(row.id)} /></Row> },
      ]} />
    </Screen>
  );
}

export function EmailTemplates() { return <Templates channel="EMAIL" />; }
export function SmsTemplates() { return <Templates channel="SMS" />; }

/* --------------------------------------------------------------- Compose */

function Compose({ channel }) {
  const { data, error } = useLoad(["/v1/message-templates?channel=" + channel, "/v1/classes"]);
  const templates = rowsOf(data["/v1/message-templates?channel=" + channel]);
  const classes = rowsOf(data["/v1/classes"]);
  const [templateId, setTemplateId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, run] = useStatus();
  const isEmail = channel === "EMAIL";
  const template = templates.find((row) => row.id === templateId);

  async function send(event) {
    event.preventDefault();
    // No recipient count here: the student list is limited to the session being viewed, but sending reaches
    // every active student (or every current one in the class), so a count would understate who gets it.
    const target = classId ? "every current student of " + classes.find((row) => row.id === classId)?.name : "every active student in the school";
    if (!window.confirm("Send \"" + template.name + "\" to " + target + "? Only students with " + (isEmail ? "an email address" : "a mobile number") + " receive it. This cannot be undone.")) return;
    await run(() => apiCall("POST", "/v1/messages/compose", { templateId, classId: classId || undefined }),
      (json) => plural(Number(json.sent ?? 0), "message") + " queued" + (Number(json.sent ?? 0) === 0 ? ". No student in this group has " + (isEmail ? "an email address." : "a mobile number.") : "."));
  }

  return (
    <Screen title={isEmail ? "Send email" : "Send SMS"} hint={"Send a saved " + (isEmail ? "email" : "SMS") + " template to the students of one class or the whole school."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {data["/v1/message-templates?channel=" + channel] && !templates.length && <p className="ck-notice ck-notice-error">No {isEmail ? "email" : "SMS"} templates yet. Add one on the {isEmail ? "Email" : "SMS"} Template screen first.</p>}
      <Panel>
        <Form onSubmit={send}>
          <Field label="Template">
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} required>
              <option value="" disabled>Select template</option>
              {templates.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Send to">
            <select value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">All active students</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!template}>Send</Button>
        </Form>
      </Panel>
      {template && (
        <Panel title="Preview">
          {isEmail && <p style={{ margin: "0 0 6px" }}><strong>{template.subject || "(no subject)"}</strong></p>}
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{template.body}</p>
        </Panel>
      )}
    </Screen>
  );
}

export function SendEmail() { return <Compose channel="EMAIL" />; }
export function SendSms() { return <Compose channel="SMS" />; }

export function MessageLog() {
  const { data, error, reload, loaded } = useLoad(["/v1/message-logs"]);
  const rows = rowsOf(data["/v1/message-logs"]);
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = rows.filter((row) => (!channel || row.channel === channel) && (!term || [row.toAddress, row.body, row.subject].some((v) => String(v || "").toLowerCase().includes(term))));
  return (
    <Screen title="Email / SMS log" hint="The latest 200 messages and whether each one was delivered.">
      <Notice status={{ error }} />
      <Panel actions={<Button variant="ghost" onClick={reload}>Refresh</Button>}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Channel">
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="">All</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </Field>
          <Field label="Search" wide><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Recipient or text" /></Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No messages yet." : "Loading…"} columns={[
        { key: "when", label: "Sent", render: (row) => when(row.createdAt) },
        { key: "channel", label: "Channel", render: (row) => (row.channel === "EMAIL" ? "Email" : "SMS") },
        { key: "toAddress", label: "To" },
        { key: "body", label: "Message", render: (row) => (row.subject ? row.subject + ": " : "") + String(row.body || "").slice(0, 100) },
        { key: "status", label: "Status", render: (row) => <span className={"ck-badge" + (/FAIL|ERROR/i.test(row.status) ? " ck-badge-warn" : "")}>{titleCase(row.status)}</span> },
      ]} />
    </Screen>
  );
}

/* ----------------------------------------------------- Admission enquiry */

function ExtraField({ field }) {
  const name = "extra-" + field.id;
  if (field.control === "select") {
    return (
      <Field label={field.name}>
        <select name={name} required={field.required} defaultValue="">
          <option value="" disabled={field.required}>Select</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Field>
    );
  }
  if (field.control === "textarea") return <Field label={field.name} wide><textarea name={name} rows={3} required={field.required} style={{ height: "auto", padding: 10 }} /></Field>;
  return <Field label={field.name}><input name={name} type={field.control === "number" ? "number" : field.control === "date" ? "date" : "text"} required={field.required} /></Field>;
}

const ENQUIRY_STATUSES = ["UNASSIGNED", "ASSIGNED", "WON", "LOST"];

export function AdmissionEnquiry() {
  const enquiriesPath = "/v1/enquiries";
  const { data, error, reload, loaded } = useLoad([enquiriesPath, "/v1/front-office-types?kind=source", "/v1/admission/forms?kind=enquiry&open=1"]);
  const rows = rowsOf(data[enquiriesPath]);
  const sources = rowsOf(data["/v1/front-office-types?kind=source"]);
  const form = rowsOf(data["/v1/admission/forms?kind=enquiry&open=1"])[0] || null;
  const [filter, setFilter] = useState("");
  const [status, run] = useStatus();
  const shown = filter ? rows.filter((row) => row.status === filter) : rows;

  async function submit(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const v = formObject(event);
    const answers = {};
    for (const field of form?.fields || []) answers[field.id] = v["extra-" + field.id] ?? "";
    const { ok } = await run(() => apiCall("POST", "/v1/enquiries", {
      name: v.name,
      phone: v.phone || undefined,
      email: v.email || undefined,
      source: v.source || undefined,
      classInterested: v.classInterested || undefined,
      followUpOn: v.followUpOn || undefined,
      remarks: v.remarks || undefined,
      formId: form?.id,
      answers,
    }), "Enquiry saved");
    if (ok) { target.reset(); reload(); }
  }
  async function setStatus(row, next) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/enquiries/" + row.id, { status: next }), "Status changed to " + titleCase(next));
    if (ok) reload();
  }
  async function convert(row) {
    if (!window.confirm("Create an admission application for " + row.name + " from this enquiry?")) return;
    const { ok } = await run(() => apiCall("PATCH", "/v1/enquiries/" + row.id, { convert: true }), (json) => "Application " + (json.applicationNo || "") + " created");
    if (ok) reload();
  }

  return (
    <Screen title="Admission enquiry" hint="Record enquiries, follow them up, and turn the promising ones into admission applications.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New enquiry">
        <Form onSubmit={submit}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Phone"><input name="phone" type="tel" /></Field>
          <Field label="Email"><input name="email" type="email" /></Field>
          <Field label="Source">
            <select name="source" defaultValue="">
              <option value="">Not recorded</option>
              {sources.map((row) => <option key={row.id || row.name} value={row.name}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Class / program wanted"><input name="classInterested" /></Field>
          <Field label="Follow up on"><input name="followUpOn" type="date" /></Field>
          <Field label="Remarks" wide><input name="remarks" /></Field>
          {(form?.fields || []).map((field) => <ExtraField key={field.id} field={field} />)}
          <Button type="submit">Add enquiry</Button>
        </Form>
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Show">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">All enquiries</option>
              {ENQUIRY_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No enquiries yet." : "Loading…"} columns={[
        { key: "date", label: "Date", render: (row) => dateOnly(row.createdAt) },
        { key: "name", label: "Name" },
        { key: "contact", label: "Contact", render: (row) => [row.phone, row.email].filter(Boolean).join(" · ") || "-" },
        { key: "classInterested", label: "Wants", render: (row) => row.classInterested || "-" },
        { key: "source", label: "Source", render: (row) => row.source || "-" },
        { key: "followUpOn", label: "Follow up", render: (row) => dateOnly(row.followUpOn) || "-" },
        { key: "status", label: "Status", render: (row) => (row.applicationId ? <span className="ck-badge">Application created</span> : (
          <select aria-label={"Status of " + row.name} value={row.status} onChange={(event) => setStatus(row, event.target.value)}>
            {ENQUIRY_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
          </select>
        )) },
        { key: "act", label: "", render: (row) => (row.applicationId ? null : <Button variant="ghost" onClick={() => convert(row)}>Convert to application</Button>) },
      ]} />
    </Screen>
  );
}

/* --------------------------------------------------------- Visitor book */

export function VisitorBook() {
  const { data, error, reload, loaded } = useLoad(["/v1/visitors", "/v1/front-office-types?kind=purpose"]);
  const rows = rowsOf(data["/v1/visitors"]);
  const purposes = rowsOf(data["/v1/front-office-types?kind=purpose"]);
  const [onlyInside, setOnlyInside] = useState(false);
  const [status, run] = useStatus();
  const inside = rows.filter((row) => !row.outAt);
  const shown = onlyInside ? inside : rows;

  async function checkIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/visitors", {
      name: v.name, phone: v.phone || undefined, purpose: v.purpose || undefined, toMeet: v.toMeet || undefined, note: v.note || undefined,
    }), v.name + " checked in");
    if (ok) { form.reset(); reload(); }
  }
  async function checkOut(row) {
    const { ok } = await run(() => apiCall("POST", "/v1/visitors/" + row.id + "/checkout"), row.name + " checked out");
    if (ok) reload();
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/visitors/" + row.id), "Visitor removed");
    if (ok) reload();
  }

  return (
    <Screen title="Visitor book" hint="Check visitors in at the gate and out when they leave.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Check in">
        <Form onSubmit={checkIn}>
          <Field label="Visitor name"><input name="name" required /></Field>
          <Field label="Phone"><input name="phone" type="tel" /></Field>
          <Field label="To meet"><input name="toMeet" /></Field>
          <Field label="Purpose">
            <select name="purpose" defaultValue="">
              <option value="">Not recorded</option>
              {purposes.map((row) => <option key={row.id || row.name} value={row.name}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Note" wide><input name="note" /></Field>
          <Button type="submit">Check in</Button>
        </Form>
      </Panel>
      <Panel title={plural(inside.length, "visitor") + " inside now"} actions={<Check label="Show only visitors inside" checked={onlyInside} onChange={(event) => setOnlyInside(event.target.checked)} />}>
        <DataTable rows={shown} empty={loaded ? "No visitors." : "Loading…"} columns={[
          { key: "name", label: "Visitor" },
          { key: "phone", label: "Phone", render: (row) => row.phone || "-" },
          { key: "toMeet", label: "To meet", render: (row) => row.toMeet || "-" },
          { key: "purpose", label: "Purpose", render: (row) => row.purpose || "-" },
          { key: "inAt", label: "In", render: (row) => when(row.inAt) },
          { key: "outAt", label: "Out", render: (row) => (row.outAt ? when(row.outAt) : <Button variant="ghost" onClick={() => checkOut(row)}>Check out</Button>) },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row)} /> },
        ]} />
      </Panel>
    </Screen>
  );
}

/* ------------------------------------------------------- Front office setup */

const SETUP_KINDS = [["source", "Enquiry source"], ["purpose", "Visit purpose"], ["complaint", "Complaint type"]];

export function FrontOfficeSetup() {
  const { data, error, reload, loaded } = useLoad(["/v1/front-office-types"]);
  const rows = rowsOf(data["/v1/front-office-types"]);
  const [status, run] = useStatus();
  const label = (kind) => SETUP_KINDS.find(([key]) => key === kind)?.[1] || kind;

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const name = v.name.trim();
    if (rows.some((row) => row.kind === v.kind && String(row.name).toLowerCase() === name.toLowerCase())) { run(() => Promise.reject(new Error(label(v.kind) + " \"" + name + "\" already exists."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/front-office-types", { kind: v.kind, name }), label(v.kind) + " saved");
    if (ok) { form.querySelector("[name=name]").value = ""; reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/front-office-types/" + row.id), label(row.kind) + " removed");
    if (ok) reload();
  }

  return (
    <Screen title="Setup front office" hint="The choices offered on the enquiry, visitor and complaint forms.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add">
        <Form onSubmit={add}>
          <Field label="List">
            <select name="kind" defaultValue="source">
              {SETUP_KINDS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </Field>
          <Field label="Name"><input name="name" placeholder="Walk-in" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      {SETUP_KINDS.map(([kind, text]) => (
        <Panel key={kind} title={text}>
          <DataTable rows={rows.filter((row) => row.kind === kind)} empty={loaded ? "None yet." : "Loading…"} columns={[
            { key: "name", label: "Name" },
            { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row)} /> },
          ]} />
        </Panel>
      ))}
    </Screen>
  );
}
