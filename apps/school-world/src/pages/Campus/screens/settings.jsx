import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Row, Screen,
  apiCall, formObject, plural, rowsOf, useLoad, useStatus
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/campus-ops.tsx (settings, SMTP, letterhead, modules,
// custom fields), payment-ops.tsx, and app/(staff)/staff/roles + users pages, with the same endpoints.
// Secrets (SMTP password, gateway key secret and webhook secret) are write-only: the API never returns them.

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD MMM YYYY"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Loads /v1/settings and saves only the fields this screen owns. */
function useCampusSettings() {
  const { data, error, reload, loaded } = useLoad(["/v1/settings"]);
  const [status, run] = useStatus();
  const settings = data["/v1/settings"] || null;
  async function save(patch, message) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/settings", patch), message || "Settings saved");
    if (ok) reload();
    return ok;
  }
  return { settings, error, status, loaded, save };
}

/* ------------------------------------------------------- General setting */

function MyAccount() {
  const [status, run] = useStatus();
  async function saveEmail(event) {
    event.preventDefault();
    const v = formObject(event);
    await run(() => apiCall("PATCH", "/v1/users/me", { email: v.email }), "Your email was saved");
  }
  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    if (v.next !== v.again) { run(() => Promise.reject(new Error("The two new passwords do not match."))); return; }
    if (v.next === v.current) { run(() => Promise.reject(new Error("Choose a new password that is different from the current one."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/users/me/password", { current: v.current, next: v.next }), "Your password was changed");
    if (ok) form.reset();
  }
  return (
    <Panel title="My account">
      <Notice status={status} />
      <Form onSubmit={saveEmail}>
        <Field label="My email" wide><input name="email" type="email" required autoComplete="email" /></Field>
        <Button type="submit">Save email</Button>
      </Form>
      <Form onSubmit={changePassword}>
        <Field label="Current password"><input name="current" type="password" required autoComplete="current-password" /></Field>
        <Field label="New password"><input name="next" type="password" minLength={8} required autoComplete="new-password" /></Field>
        <Field label="New password again"><input name="again" type="password" minLength={8} required autoComplete="new-password" /></Field>
        <Button type="submit">Change password</Button>
      </Form>
    </Panel>
  );
}

export function GeneralSettings() {
  const { settings, error, status, save } = useCampusSettings();
  const { data } = useLoad(["/v1/sessions"]);
  const sessions = rowsOf(data["/v1/sessions"]);
  async function submit(event) {
    event.preventDefault();
    const v = formObject(event);
    await save({
      name: v.name.trim(),
      code: v.code.trim() || null,
      address: v.address.trim() || null,
      phone: v.phone.trim() || null,
      email: v.email.trim(),
      dateFormat: v.dateFormat,
      timezone: v.timezone.trim(),
      startWeek: Number(v.startWeek),
      attendanceMode: v.attendanceMode,
    }, "General settings saved");
  }
  return (
    <Screen title="General setting" hint="The institute's details and how dates, weeks and attendance work.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {settings && (
        <Panel title="Institute">
          <Form onSubmit={submit} key={JSON.stringify(settings)}>
            <Field label="Institute name" wide><input name="name" defaultValue={settings.name || ""} required /></Field>
            <Field label="Code"><input name="code" defaultValue={settings.code || ""} /></Field>
            <Field label="Phone"><input name="phone" type="tel" defaultValue={settings.phone || ""} /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={settings.email || ""} /></Field>
            <Field label="Address" wide><input name="address" defaultValue={settings.address || ""} /></Field>
            <Field label="Date format">
              <select name="dateFormat" defaultValue={settings.dateFormat || "DD/MM/YYYY"}>
                {[...new Set([settings.dateFormat, ...DATE_FORMATS].filter(Boolean))].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Timezone"><input name="timezone" defaultValue={settings.timezone || "Asia/Kolkata"} placeholder="Asia/Kolkata" required /></Field>
            <Field label="Week starts on">
              <select name="startWeek" defaultValue={String(settings.startWeek ?? 1)}>
                {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </Field>
            <Field label="Attendance taken">
              <select name="attendanceMode" defaultValue={settings.attendanceMode || "daily"}>
                <option value="daily">Once a day</option>
                <option value="subject">Per subject / period</option>
              </select>
            </Field>
            <Button type="submit">Save</Button>
          </Form>
          <p style={{ margin: "8px 0 0" }}>Current session: <strong>{sessions.find((row) => row.id === settings.sessionId)?.name || "not set"}</strong>. Change it on the Session Setting screen.</p>
        </Panel>
      )}
      <MyAccount />
    </Screen>
  );
}

export function CurrencySettings() {
  const { settings, error, status, save } = useCampusSettings();
  const [symbol, setSymbol] = useState(null);
  const [place, setPlace] = useState(null);
  const shownSymbol = symbol ?? settings?.currencyFormat ?? "₹";
  const shownPlace = place ?? settings?.currencyPlace ?? "before";
  const sample = shownPlace === "after" ? "12,500.00 " + shownSymbol : shownSymbol + "12,500.00";
  return (
    <Screen title="Currency" hint="How money is shown on receipts and reports.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {settings && (
        <Panel>
          <Form onSubmit={(event) => { event.preventDefault(); save({ currencyFormat: shownSymbol.trim() || null, currencyPlace: shownPlace }, "Currency saved"); }}>
            <Field label="Currency symbol"><input value={shownSymbol} onChange={(event) => setSymbol(event.target.value)} maxLength={8} /></Field>
            <Field label="Symbol goes">
              <select value={shownPlace} onChange={(event) => setPlace(event.target.value)}>
                <option value="before">Before the amount</option>
                <option value="after">After the amount</option>
              </select>
            </Field>
            <Button type="submit">Save</Button>
          </Form>
          <p style={{ margin: "8px 0 0" }}>Looks like: <strong>{sample}</strong></p>
        </Panel>
      )}
    </Screen>
  );
}

export function FileTypes() {
  const { settings, error, status, save } = useCampusSettings();
  const [draft, setDraft] = useState("");
  const types = String(settings?.uploadTypes || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  async function write(next, message) {
    return save({ uploadTypes: [...new Set(next)].join(",") }, message);
  }
  async function add(event) {
    event.preventDefault();
    const ext = draft.trim().toLowerCase().replace(/^\./, "");
    if (!/^[a-z0-9]{1,10}$/.test(ext)) return;
    if (types.includes(ext)) return;
    if (["exe", "bat", "cmd", "sh", "js", "html", "htm", "svg", "php"].includes(ext) && !window.confirm("." + ext + " files can run code in a browser or on a computer. Allow uploads of this type anyway?")) return;
    if (await write([...types, ext], "." + ext + " allowed")) setDraft("");
  }
  return (
    <Screen title="File types" hint="The kinds of files staff and students may upload.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Allow a file type">
        <Form onSubmit={add}>
          <Field label="Extension"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="docx" pattern="\.?[A-Za-z0-9]{1,10}" required /></Field>
          <Button type="submit">Allow</Button>
        </Form>
      </Panel>
      <DataTable rows={types.map((ext) => ({ id: ext, ext }))} empty="No file types allowed. Uploads will be refused." columns={[
        { key: "ext", label: "Extension", render: (row) => "." + row.ext },
        { key: "act", label: "", render: (row) => <RemoveButton label="Disallow" onRemove={() => write(types.filter((t) => t !== row.ext), "." + row.ext + " no longer allowed")} /> },
      ]} />
    </Screen>
  );
}

export function PrintHeaderFooter() {
  const { settings, error, status, save } = useCampusSettings();
  const [header, setHeader] = useState(null);
  const [footer, setFooter] = useState(null);
  const shownHeader = header ?? settings?.printHeader ?? "";
  const shownFooter = footer ?? settings?.printFooter ?? "";
  return (
    <Screen title="Print header and footer" hint="The text printed at the top and bottom of receipts, marksheets and reports.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {settings && (
        <>
          <Panel>
            <Form onSubmit={(event) => { event.preventDefault(); save({ printHeader: shownHeader, printFooter: shownFooter }, "Print header and footer saved"); }}>
              <Field label="Header" wide><textarea rows={3} value={shownHeader} onChange={(event) => setHeader(event.target.value)} style={{ height: "auto", padding: 10 }} /></Field>
              <Field label="Footer" wide><textarea rows={2} value={shownFooter} onChange={(event) => setFooter(event.target.value)} style={{ height: "auto", padding: 10 }} /></Field>
              <Button type="submit">Save</Button>
            </Form>
          </Panel>
          <Panel title="Preview">
            <div style={{ border: "1px solid var(--sd-border, #dfe7f1)", borderRadius: 8, padding: 16, display: "grid", gap: 24 }}>
              <div style={{ textAlign: "center", fontWeight: 700, whiteSpace: "pre-wrap" }}>{shownHeader || "(no header)"}</div>
              <div style={{ color: "var(--sd-muted, #6c7c90)", textAlign: "center" }}>… page content …</div>
              <div style={{ textAlign: "center", fontSize: 12, whiteSpace: "pre-wrap" }}>{shownFooter || "(no footer)"}</div>
            </div>
          </Panel>
        </>
      )}
    </Screen>
  );
}

/* --------------------------------------------------------- Email setting */

export function EmailSettings() {
  const { data, error, reload } = useLoad(["/v1/settings/smtp"]);
  const smtp = data["/v1/settings/smtp"] || null;
  const [status, run] = useStatus();
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const body = { host: v.host.trim(), port: Number(v.port || 587), user: v.user.trim(), from: v.from.trim(), secure: v.secure === "on" };
    if (v.pass) body.pass = v.pass;
    const { ok } = await run(() => apiCall("PATCH", "/v1/settings/smtp", body), "Email settings saved");
    if (ok) { form.querySelector("[name=pass]").value = ""; reload(); }
  }
  return (
    <Screen title="Email setting" hint="The mail server used to send email from School World, such as portal logins and notices.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {smtp && (
        <Panel title={smtp.configured ? "Email is set up" : "Email is not set up yet"} actions={smtp.configured ? <span className="ck-badge">Configured</span> : <span className="ck-badge ck-badge-warn">Not configured</span>}>
          {!smtp.configured && <p style={{ margin: "0 0 10px" }}>Until this is set, emails are only written to the log and portal logins are shown on screen instead.</p>}
          <Form onSubmit={submit} key={JSON.stringify(smtp)}>
            <Field label="Mail server (host)"><input name="host" defaultValue={smtp.host} placeholder="smtp.gmail.com" required /></Field>
            <Field label="Port"><input name="port" type="number" min="1" max="65535" defaultValue={smtp.port || 587} /></Field>
            <Field label="Username"><input name="user" defaultValue={smtp.user} autoComplete="off" /></Field>
            <Field label="Password"><input name="pass" type="password" autoComplete="new-password" placeholder={smtp.hasPassword ? "Saved. Leave blank to keep it." : "Not set"} /></Field>
            <Field label="Send from" wide><input name="from" type="email" defaultValue={smtp.from} placeholder="office@school.edu" /></Field>
            <Check name="secure" defaultChecked={smtp.secure} label="Use TLS (usually port 465)" />
            <Button type="submit">Save</Button>
          </Form>
        </Panel>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------- Payment methods */

export function PaymentMethods() {
  const { data, error, reload, loaded } = useLoad(["/v1/payment-merchants", "/v1/fee-types"]);
  const merchants = rowsOf(data["/v1/payment-merchants"]);
  const feeTypes = rowsOf(data["/v1/fee-types"]);
  const [status, run] = useStatus();
  const typeName = (id) => feeTypes.find((row) => row.id === id)?.name || "All fees";
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/payment-merchants", {
      name: v.name.trim(), provider: v.provider, keyId: v.keyId.trim(), keySecret: v.keySecret, webhookSecret: v.webhookSecret,
      isDefault: v.isDefault === "on", feeTypeId: v.feeTypeId || undefined,
    }), "Payment account saved. Its secrets are stored and will not be shown again.");
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Payment methods" hint="Razorpay or Cashfree accounts that collect online fee payments. You can send one fee type, such as hostel fees, to a different account.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add payment account">
        <Form onSubmit={submit}>
          <Field label="Label"><input name="name" placeholder="Tuition Razorpay" required /></Field>
          <Field label="Provider">
            <select name="provider" defaultValue="razorpay">
              <option value="razorpay">Razorpay</option>
              <option value="cashfree">Cashfree</option>
            </select>
          </Field>
          <Field label="Key ID"><input name="keyId" required autoComplete="off" /></Field>
          <Field label="Key secret"><input name="keySecret" type="password" required autoComplete="new-password" /></Field>
          <Field label="Webhook secret"><input name="webhookSecret" type="password" required autoComplete="new-password" /></Field>
          <Field label="Fee type">
            <select name="feeTypeId" defaultValue="">
              <option value="">All fees</option>
              {feeTypes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Check name="isDefault" label="Default account for this provider" />
          <Button type="submit">Save account</Button>
        </Form>
        <p style={{ margin: "8px 0 0" }}>Point the provider's webhook at <code>/api/v1/webhooks/razorpay</code> or <code>/api/v1/webhooks/cashfree</code> on this site.</p>
      </Panel>
      <DataTable rows={merchants} empty={loaded ? "No payment accounts yet." : "Loading…"} columns={[
        { key: "name", label: "Account", render: (row) => <Row>{row.name}{row.isDefault && <span className="ck-badge">Default</span>}</Row> },
        { key: "provider", label: "Provider", render: (row) => (row.provider === "cashfree" ? "Cashfree" : "Razorpay") },
        { key: "keyId", label: "Key ID" },
        { key: "fee", label: "Collects", render: (row) => typeName(row.feeTypeId) },
      ]} />
    </Screen>
  );
}

/* --------------------------------------------------------------- Modules */

export function ModulesSetting() {
  const { data, error, reload, loaded } = useLoad(["/v1/modules"]);
  const rows = rowsOf(data["/v1/modules"]);
  const [status, run] = useStatus();
  async function toggle(row, enabled) {
    const { ok } = await run(() => apiCall("PATCH", "/v1/modules", { key: row.id, enabled }), row.id.replaceAll("-", " ") + (enabled ? " turned on" : " turned off"));
    if (ok) reload();
  }
  return (
    <Screen title="Modules" hint="Optional modules that can be switched on or off for this campus. System Update is always off.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <DataTable rows={rows} empty={loaded ? "No optional modules." : "Loading…"} columns={[
        { key: "id", label: "Module", render: (row) => { const t = row.id.replaceAll("-", " "); return t[0].toUpperCase() + t.slice(1); } },
        { key: "state", label: "", render: (row) => (row.id === "updater"
          ? <span className="ck-badge ck-badge-warn">Locked off</span>
          : <Check label={row.enabled ? "On" : "Off"} checked={row.enabled} onChange={(event) => toggle(row, event.target.checked)} />) },
      ]} />
    </Screen>
  );
}

/* ----------------------------------------------------------- Custom fields */

const FIELD_BELONG = ["Student", "Staff", "Admission", "Enquiry", "Documents", "Liberal Art"];
const FIELD_TYPES = ["Input", "Number", "Textarea", "Dropdown", "Date", "Checkbox"];

function CustomFieldForm({ row, onSave, onCancel }) {
  const [type, setType] = useState(row?.type || "Input");
  return (
    <Form onSubmit={(event) => { event.preventDefault(); onSave(formObject(event), type); }}>
      <Field label="Question"><input name="name" defaultValue={row?.name} required /></Field>
      <Field label="Shown on">
        <select name="belongTo" defaultValue={row?.belongTo || "Student"}>
          {FIELD_BELONG.map((value) => <option key={value} value={value}>{value === "Liberal Art" ? "Other course form" : value + " form"}</option>)}
        </select>
      </Field>
      <Field label="Answer type">
        <select value={type} onChange={(event) => setType(event.target.value)}>
          {FIELD_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </Field>
      {type === "Dropdown" && <Field label="Choices" wide><input name="values" defaultValue={row?.values || ""} placeholder="A+, A-, B+, B-" required /></Field>}
      <Check name="required" defaultChecked={row?.required} label="Required" />
      <Check name="visible" defaultChecked={row ? row.visible !== false : true} label="Visible" />
      <Check name="onTable" defaultChecked={row?.onTable} label="Show as a column in lists" />
      <Button type="submit">{row ? "Save field" : "Add field"}</Button>
      {row && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
    </Form>
  );
}

export function CustomFields() {
  const { data, error, reload, loaded } = useLoad(["/v1/custom-fields?includeHidden=1"]);
  const rows = rowsOf(data["/v1/custom-fields?includeHidden=1"]);
  const [editing, setEditing] = useState(null);
  const [belong, setBelong] = useState("");
  const [status, run] = useStatus();
  const shown = belong ? rows.filter((row) => row.belongTo === belong) : rows;

  async function save(v, type, row) {
    const choices = String(v.values || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (type === "Dropdown" && choices.length < 2) { run(() => Promise.reject(new Error("Give at least two choices, separated by commas."))); return; }
    const body = {
      name: v.name.trim(), belongTo: v.belongTo, type,
      values: type === "Dropdown" ? [...new Set(choices)].join(",") : (row ? "" : undefined),
      required: v.required === "on", visible: v.visible === "on", onTable: v.onTable === "on",
    };
    const { ok } = await run(() => (row ? apiCall("PATCH", "/v1/custom-fields/" + row.id, body) : apiCall("POST", "/v1/custom-fields", body)), row ? "Field saved" : "Field added");
    if (ok) { setEditing(null); reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/custom-fields/" + row.id), "Field deleted");
    if (ok) reload();
  }

  return (
    <Screen title="Custom fields" hint="Extra questions on the student, staff, admission and enquiry forms. A field that already has answers cannot be deleted; hide it instead.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={editing ? "Edit " + editing.name : "New field"}>
        <CustomFieldForm key={editing?.id || "new"} row={editing} onSave={(v, type) => save(v, type, editing)} onCancel={() => setEditing(null)} />
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Show fields on">
            <select value={belong} onChange={(event) => setBelong(event.target.value)}>
              <option value="">Every form</option>
              {FIELD_BELONG.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? "No custom fields yet." : "Loading…"} columns={[
        { key: "name", label: "Question", render: (row) => <Row>{row.name}{row.visible === false && <span className="ck-badge ck-badge-warn">Hidden</span>}{row.required && <span className="ck-badge">Required</span>}</Row> },
        { key: "belongTo", label: "Form" },
        { key: "type", label: "Type", render: (row) => row.type + (row.type === "Dropdown" && row.values ? ": " + row.values : "") },
        { key: "act", label: "", render: (row) => (
          <Row>
            <Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button>
            <RemoveButton label="Delete" onRemove={() => remove(row)} />
          </Row>
        ) },
      ]} />
    </Screen>
  );
}

/* --------------------------------------------------------- Roles and users */

export function RolesPermissions() {
  const { data, error, reload, loaded } = useLoad(["/v1/roles"]);
  const roles = rowsOf(data["/v1/roles"]);
  const permissions = data["/v1/roles"]?.permissions || [];
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [status, run] = useStatus();
  const role = roles.find((row) => row.id === selected) || roles[0];
  const locked = role?.name === "SuperAdmin";

  useEffect(() => { if (role) { setChecked(new Set(role.permissionIds || [])); setDirty(false); } }, [role?.id, roles]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const perm of permissions) {
      const list = map.get(perm.module) || [];
      list.push(perm);
      map.set(perm.module, list);
    }
    return [...map.entries()];
  }, [permissions]);

  function pick(id) {
    if (dirty && !window.confirm("You have unsaved changes on " + role.name + ". Discard them?")) return;
    setSelected(id);
  }
  function toggle(id, on) {
    setChecked((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });
    setDirty(true);
  }
  async function save() {
    const before = new Set(role.permissionIds || []);
    const added = [...checked].filter((id) => !before.has(id)).length;
    const removed = [...before].filter((id) => !checked.has(id)).length;
    if (!window.confirm("Change " + role.name + ": " + added + " permission(s) added, " + removed + " removed? This affects everyone with the role.")) return;
    const { ok } = await run(() => apiCall("PUT", "/v1/roles/" + role.id + "/permissions", { permissionIds: [...checked] }), role.name + " permissions saved");
    if (ok) { setDirty(false); reload(); }
  }
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const name = v.name.trim();
    if (roles.some((row) => row.name.toLowerCase() === name.toLowerCase())) { run(() => Promise.reject(new Error("A role called " + name + " already exists."))); return; }
    const { ok, result } = await run(() => apiCall("POST", "/v1/roles", { name, cloneFromId: v.cloneFromId || undefined }), "Role " + name + " created");
    if (ok) { form.reset(); await reload(); if (result?.id) setSelected(result.id); }
  }

  return (
    <Screen title="Roles and permissions" hint="What each role may see and do. SuperAdmin always has everything and cannot be edited.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New role">
        <Form onSubmit={create}>
          <Field label="Role name"><input name="name" placeholder="Office staff" required /></Field>
          <Field label="Start from">
            <select name="cloneFromId" defaultValue="">
              <option value="">No permissions</option>
              {roles.map((row) => <option key={row.id} value={row.id}>Copy of {row.name}</option>)}
            </select>
          </Field>
          <Button type="submit">Create role</Button>
        </Form>
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Role">
            <select value={role?.id || ""} onChange={(event) => pick(event.target.value)}>
              {roles.map((row) => <option key={row.id} value={row.id}>{row.name}{row.isSystem ? " (built in)" : ""} · {(row.permissionIds || []).length} permissions</option>)}
            </select>
          </Field>
        </Form>
      </Panel>
      {!loaded && <p>Loading…</p>}
      {role && (
        <Panel title={role.name + " · " + plural(checked.size, "permission")} actions={!locked && <Button onClick={save} disabled={!dirty}>Save permissions</Button>}>
          {locked && <p className="ck-notice ck-notice-ok">SuperAdmin always has every permission. This cannot be changed.</p>}
          {grouped.map(([module, perms]) => {
            const on = perms.filter((p) => checked.has(p.id)).length;
            return (
              <div key={module} style={{ marginBottom: 14 }}>
                <Row>
                  <strong style={{ textTransform: "capitalize" }}>{module}</strong>
                  <span>{on} / {perms.length}</span>
                  {!locked && <Button variant="ghost" onClick={() => perms.forEach((p) => toggle(p.id, on < perms.length))}>{on < perms.length ? "Tick all" : "Untick all"}</Button>}
                </Row>
                <div className="ck-checklist" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", maxHeight: "none" }}>
                  {perms.map((perm) => <Check key={perm.id} label={perm.feature + " · " + perm.action} checked={locked || checked.has(perm.id)} disabled={locked} onChange={(event) => toggle(perm.id, event.target.checked)} />)}
                </div>
              </div>
            );
          })}
        </Panel>
      )}
    </Screen>
  );
}

const TABS = ["Staff", "Student", "Parent"];

export function UsersSetting() {
  const [tab, setTab] = useState("Staff");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const usersPath = "/v1/users?" + new URLSearchParams({ actorType: tab, ...(query ? { q: query } : {}) });
  const { data, error, reload, loaded } = useLoad([usersPath, "/v1/roles", "/v1/auth/me"]);
  const users = rowsOf(data[usersPath]);
  const roles = rowsOf(data["/v1/roles"]);
  const meId = data["/v1/auth/me"]?.user?.id;
  const [editing, setEditing] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [secret, setSecret] = useState(null);
  const [status, run] = useStatus();

  useEffect(() => { const timer = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(timer); }, [q]);

  const name = (row) => row.staff?.name || row.student?.name || row.guardian?.name || row.username;
  async function setActive(row, isActive) {
    if (!isActive && row.id === meId) { run(() => Promise.reject(new Error("You cannot disable your own login here."))); return; }
    if (!isActive && !window.confirm("Disable the login for " + name(row) + "? They will be signed out and cannot sign in.")) return;
    const { ok } = await run(() => apiCall("PATCH", "/v1/users/" + row.id, { isActive }), name(row) + (isActive ? " can sign in again" : " can no longer sign in"));
    if (ok) reload();
  }
  async function resetPassword(row) {
    if (!window.confirm("Reset the password for " + name(row) + "? Their current password stops working.")) return;
    const { ok, result } = await run(() => apiCall("POST", "/v1/users/" + row.id + "/reset-password"), "Password reset");
    if (ok && result?.temporaryPassword) setSecret({ who: name(row), label: "One-time password", value: result.temporaryPassword });
  }
  async function sendInvite(row) {
    const { ok, result } = await run(() => apiCall("POST", "/v1/users/" + row.id + "/invite"), "Password link created");
    if (ok && result?.token) setSecret({ who: name(row), label: "Password set-up token", value: result.token });
  }
  function openRoles(row) {
    setEditing(row);
    setPicked(new Set((row.roles || []).map((r) => r.id)));
  }
  async function saveRoles() {
    const nextNames = roles.filter((r) => picked.has(r.id)).map((r) => r.name);
    const wasSuper = (editing.roles || []).some((r) => r.name === "SuperAdmin");
    const giveSuper = !wasSuper && nextNames.includes("SuperAdmin");
    if (editing.id === meId && wasSuper && !nextNames.includes("SuperAdmin") && !window.confirm("You are removing SuperAdmin from your own login. You may lose access to this screen. Continue?")) return;
    if (giveSuper && !window.confirm("Give " + name(editing) + " SuperAdmin? They will be able to do everything, including managing users and roles.")) return;
    const { ok } = await run(() => apiCall("PATCH", "/v1/users/" + editing.id, { roleIds: [...picked] }), "Roles for " + name(editing) + " saved");
    if (ok) { setEditing(null); reload(); }
  }
  async function createLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const role = roles.find((r) => r.id === v.roleId);
    if (role?.name === "SuperAdmin" && !window.confirm("Create this login as a SuperAdmin? It will be able to do everything.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/users", { username: v.username.trim(), password: v.password, email: v.email || undefined, actorType: "STAFF", roleIds: [v.roleId] }), "Login " + v.username.trim() + " created");
    if (ok) { form.reset(); setTab("Staff"); reload(); }
  }

  return (
    <Screen title="Users" hint="Sign-in accounts for staff, students and parents. To add a staff member with their details, use Staff Directory.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {secret && (
        <p className="ck-notice ck-notice-ok" role="status">
          {secret.label} for {secret.who}: <strong style={{ userSelect: "all", wordBreak: "break-all" }}>{secret.value}</strong>. Share it once; it is not shown again. <Button variant="ghost" onClick={() => setSecret(null)}>Hide</Button>
        </p>
      )}
      <Panel title="New staff login">
        <Form onSubmit={createLogin}>
          <Field label="Username"><input name="username" required autoComplete="off" /></Field>
          <Field label="Password (min 8)"><input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Email"><input name="email" type="email" /></Field>
          <Field label="Role">
            <select name="roleId" required defaultValue="">
              <option value="" disabled>Select role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Button type="submit">Create login</Button>
        </Form>
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Accounts">
            <select value={tab} onChange={(event) => { setTab(event.target.value); setEditing(null); }}>
              {TABS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Search" wide><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Username or email" /></Field>
        </Form>
      </Panel>
      {editing && (
        <Panel title={"Roles for " + name(editing)} actions={<Row><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveRoles}>Save roles</Button></Row>}>
          <div className="ck-checklist">
            {roles.map((r) => <Check key={r.id} label={r.name} checked={picked.has(r.id)} onChange={(event) => setPicked((s) => { const next = new Set(s); if (event.target.checked) next.add(r.id); else next.delete(r.id); return next; })} />)}
          </div>
        </Panel>
      )}
      <DataTable rows={users} empty={loaded ? (query ? "No account matches." : "No accounts.") : "Loading…"} columns={[
        { key: "name", label: tab === "Parent" ? "Guardian" : "Name", render: (row) => <Row>{name(row)}{row.id === meId && <span className="ck-badge">You</span>}</Row> },
        ...(tab === "Staff" ? [{ key: "id", label: "Staff ID", render: (row) => row.staff?.employeeId || "-" }] : []),
        ...(tab === "Student" ? [{ key: "adm", label: "Admission no", render: (row) => row.student?.admissionNo || "-" }, { key: "class", label: "Class", render: (row) => row.student?.class || "-" }] : []),
        { key: "username", label: "Username" },
        { key: "contact", label: "Contact", render: (row) => row.email || row.staff?.phone || row.student?.mobile || row.guardian?.phone || "-" },
        ...(tab === "Staff" ? [{ key: "roles", label: "Roles", render: (row) => (row.roles || []).map((r) => r.name).join(", ") || "None" }] : []),
        { key: "last", label: "Last sign-in", render: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never") },
        { key: "state", label: "Status", render: (row) => (row.isActive ? <span className="ck-badge">Active</span> : <span className="ck-badge ck-badge-warn">Disabled</span>) },
        { key: "act", label: "", render: (row) => (
          <Row>
            {tab === "Staff" && <Button variant="ghost" onClick={() => openRoles(row)}>Roles</Button>}
            <Button variant="ghost" onClick={() => sendInvite(row)}>Password link</Button>
            <Button variant="ghost" onClick={() => resetPassword(row)}>Reset password</Button>
            {row.isActive
              ? <Button variant="danger" onClick={() => setActive(row, false)} disabled={row.id === meId}>Disable</Button>
              : <Button variant="ghost" onClick={() => setActive(row, true)}>Enable</Button>}
          </Row>
        ) },
      ]} />
    </Screen>
  );
}
