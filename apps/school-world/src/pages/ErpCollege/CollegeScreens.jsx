import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiRequest } from "../../api.js";

function rowsFrom(result) {
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
}

export function NotConnected({ name }) {
  return (
    <section className="module-card">
      <h2>{name}</h2>
      <p>This screen is not connected yet. The ERP database can store it, and a route still has to be added before this page can save.</p>
    </section>
  );
}

export function ErpListScreen({ title, listPath, createPath, fields, columns, activatePath, buildBody }) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const result = await apiGet(listPath);
    setRows(rowsFrom(result));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason.message || "Could not load this list."));
  }, [listPath]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost(createPath || listPath, buildBody ? buildBody(draft) : draft);
      setDraft({});
      setMessage("Saved.");
      await load();
    } catch (reason) {
      setError(reason.message || "Save failed.");
    }
  }

  async function activate(id) {
    setError("");
    try {
      await apiPost(activatePath(id), {});
      setMessage("Marked as the current session.");
      await load();
    } catch (reason) {
      setError(reason.message || "Could not activate that session.");
    }
  }

  return (
    <section className="module-card">
      <div className="module-card-title"><h3>{title}</h3></div>
      {error && <p className="fees-settings-warning">{error}</p>}
      {message && <p>{message}</p>}
      <form className="module-form-grid" onSubmit={save}>
        {fields.map((field) => (
          <label key={field.name}>{field.label}
            <input value={draft[field.name] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} />
          </label>
        ))}
        <button type="submit" className="primary-button">Save</button>
      </form>
      <div className="fees-table-scroll">
        <table className="fees-table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{activatePath && <th>Current</th>}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "")}</td>)}
                {activatePath && <td><button type="button" onClick={() => activate(row.id)}>Make current</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="fees-empty">No rows yet.</div>}
      </div>
    </section>
  );
}

const nameCode = [
  { name: "name", label: "Name", required: true },
  { name: "code", label: "Code" },
];
const nameCodeCols = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
];

export function DepartmentsScreen() {
  return <ErpListScreen title="Departments" listPath="/v1/departments" fields={nameCode} columns={nameCodeCols} />;
}
export function ProgramsScreen() {
  return <ErpListScreen title="Programs" listPath="/v1/programs" fields={[...nameCode, { name: "departmentId", label: "Department id", required: true }]} columns={[...nameCodeCols, { key: "level", label: "Level" }]} />;
}
export function SessionsScreen() {
  return <ErpListScreen title="Academic sessions" listPath="/v1/sessions" fields={[{ name: "name", label: "Session name", required: true }, { name: "code", label: "Code" }]} columns={[{ key: "name", label: "Name" }, { key: "isCurrent", label: "Current" }]} activatePath={(id) => "/v1/sessions/" + encodeURIComponent(id) + "/activate"} />;
}
export function FeeMastersScreen() {
  return <ErpListScreen title="Fee masters" listPath="/v1/fee-masters" fields={[{ name: "sessionId", label: "Session id", required: true }, { name: "groupId", label: "Fee group id", required: true }, { name: "feeTypeId", label: "Fee type id", required: true }, { name: "amount", label: "Amount", required: true }]} columns={[{ key: "name", label: "Name" }, { key: "id", label: "Id" }]} buildBody={(draft) => ({ sessionId: draft.sessionId, groupId: draft.groupId, lines: [{ feeTypeId: draft.feeTypeId, amount: Number(draft.amount) }] })} />;
}
export function StaffScreen() {
  return <ErpListScreen title="Staff" listPath="/v1/staff" fields={[{ name: "employeeId", label: "Employee id", required: true }, { name: "firstName", label: "First name", required: true }, { name: "lastName", label: "Last name" }]} columns={[{ key: "employeeId", label: "Employee id" }, { key: "firstName", label: "First name" }, { key: "lastName", label: "Last name" }]} />;
}
export function RolesScreen() {
  return <ErpListScreen title="Roles" listPath="/v1/roles" fields={[{ name: "name", label: "Role name", required: true }]} columns={[{ key: "name", label: "Role" }, { key: "isSystem", label: "System" }]} />;
}
export function UsersScreen() {
  return <ErpListScreen title="Users" listPath="/v1/users" fields={[{ name: "username", label: "Username", required: true }, { name: "email", label: "Email" }]} columns={[{ key: "username", label: "Username" }, { key: "email", label: "Email" }]} />;
}

export function MarksheetScreen() {
  const [studentId, setStudentId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  function load(event) {
    event.preventDefault();
    setError("");
    apiGet("/v1/students/" + encodeURIComponent(studentId) + "/marksheet")
      .then((result) => setText(JSON.stringify(result, null, 2)))
      .catch((reason) => setError(reason.message));
  }
  return (
    <section className="module-card">
      <h3>Marksheet</h3>
      <p>Uses the ERP student id, the same id stored on a student as metadata.erpStudentId.</p>
      {error && <p className="fees-settings-warning">{error}</p>}
      <form className="module-form-grid" onSubmit={load}>
        <label>ERP student id<input value={studentId} onChange={(event) => setStudentId(event.target.value)} required /></label>
        <button type="submit" className="primary-button">Load marksheet</button>
      </form>
      {text && <pre>{text}</pre>}
    </section>
  );
}

export function ExamsScreen() {
  return (
    <>
      <ErpListScreen title="Exam groups" listPath="/v1/exam-groups" fields={[{ name: "name", label: "Exam group", required: true }, { name: "sessionId", label: "Session id", required: true }]} columns={[{ key: "name", label: "Name" }, { key: "examType", label: "Type" }]} buildBody={(draft) => ({ ...draft, examType: "SCHOOL_GRADE" })} />
      <MarksheetScreen />
    </>
  );
}

export function SettingsScreen() {
  const [draft, setDraft] = useState({ name: "", timezone: "" });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    apiGet("/v1/settings").then((result) => {
      setText(JSON.stringify(result, null, 2));
      setDraft({ name: result.name || "", timezone: result.timezone || "" });
    }).catch((reason) => setError(reason.message));
  }, []);
  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/v1/settings", { method: "PATCH", body: { name: draft.name, timezone: draft.timezone } });
      setText(JSON.stringify(result, null, 2));
      setMessage("Campus settings saved.");
    } catch (reason) {
      setError(reason.message || "Settings could not be saved.");
    }
  }
  return (
    <section className="module-card">
      <h3>Campus settings</h3>
      {error && <p className="fees-settings-warning">{error}</p>}
      {message && <p>{message}</p>}
      <form className="module-form-grid" onSubmit={save}>
        <label>Campus name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
        <label>Timezone<input value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} required /></label>
        <button type="submit" className="primary-button">Save</button>
      </form>
      <pre>{text}</pre>
    </section>
  );
}

export function TimetableScreen() {
  const [sectionId, setSectionId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  function load(event) {
    event.preventDefault();
    setError("");
    apiGet("/v1/timetable?sectionId=" + encodeURIComponent(sectionId)).then((result) => setText(JSON.stringify(result, null, 2))).catch((reason) => setError(reason.message));
  }
  return (
    <section className="module-card">
      <h3>Timetable</h3>
      <p>Enter a section id. The ERP timetable route requires one.</p>
      {error && <p className="fees-settings-warning">{error}</p>}
      <form className="module-form-grid" onSubmit={load}>
        <label>Section id<input value={sectionId} onChange={(event) => setSectionId(event.target.value)} required /></label>
        <button type="submit" className="primary-button">Load timetable</button>
      </form>
      {text && <pre>{text}</pre>}
    </section>
  );
}

export function PromotionScreen() {
  const [draft, setDraft] = useState({ fromSectionId: "", toSectionId: "", toSessionId: "", studentIds: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const studentIds = draft.studentIds.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
    try {
      const result = await apiPost("/v1/promotions", {
        fromSectionId: draft.fromSectionId,
        toSectionId: draft.toSectionId,
        toSessionId: draft.toSessionId,
        studentIds,
      });
      setMessage("Promotion saved. " + JSON.stringify(result));
    } catch (reason) {
      setError(reason.message || "Promotion failed.");
    }
  }
  function setField(name) {
    return (event) => setDraft((current) => ({ ...current, [name]: event.target.value }));
  }
  return (
    <section className="module-card">
      <h3>Promote students</h3>
      <p>Moves the selected ERP student ids from one section into another section and session.</p>
      {error && <p className="fees-settings-warning">{error}</p>}
      {message && <p>{message}</p>}
      <form className="module-form-grid" onSubmit={save}>
        <label>From section id<input value={draft.fromSectionId} onChange={setField("fromSectionId")} required /></label>
        <label>To section id<input value={draft.toSectionId} onChange={setField("toSectionId")} required /></label>
        <label>To session id<input value={draft.toSessionId} onChange={setField("toSessionId")} required /></label>
        <label>Student ids<textarea value={draft.studentIds} onChange={setField("studentIds")} required /></label>
        <button type="submit" className="primary-button">Promote</button>
      </form>
    </section>
  );
}

export function CollectFeeScreen() {
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function pay(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/v1/fees/payments", {
        method: "POST",
        body: { invoiceId, amount: Number(amount), method },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      setMessage("Receipt " + (result.receiptNo || result.payment?.receiptNo || "saved") + ".");
    } catch (reason) {
      setError(reason.message || "Payment failed.");
    }
  }
  return (
    <section className="module-card">
      <h3>Collect fee</h3>
      <p>Pays an existing ERP invoice. The request sends an idempotency key so a double click does not collect twice. This updates the invoice. Fee rows on the Fees screen change when you use Pay installment there.</p>
      {error && <p>{error}</p>}
      {message && <p>{message}</p>}
      <form className="module-form-grid" onSubmit={pay}>
        <label>Invoice id<input value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} required /></label>
        <label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
        <label>Method
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {["CASH", "UPI", "CARD", "CHEQUE", "DD", "BANK_TRANSFER", "GATEWAY", "SCHOLARSHIP", "WAIVER"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit" className="primary-button">Collect</button>
      </form>
    </section>
  );
}
