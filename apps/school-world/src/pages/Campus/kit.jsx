import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../api.js";
import "./campus-kit.css";

export { apiDelete, apiGet, apiPatch, apiPost, apiPut };

export function rowsOf(result) {
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
}

export function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function Screen({ title, hint, children }) {
  return (
    <section className="ck-screen">
      <header className="ck-head">
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Panel({ title, children, actions }) {
  return (
    <div className="ck-panel">
      {(title || actions) && (
        <div className="ck-panel-title">
          {title && <h3>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Notice({ status }) {
  if (!status?.error && !status?.message) return null;
  return (
    <p className={"ck-notice " + (status.error ? "ck-notice-error" : "ck-notice-ok")} role={status.error ? "alert" : "status"}>
      {status.error || status.message}
    </p>
  );
}

export function Field({ label, children, wide }) {
  return (
    <label className={"ck-field" + (wide ? " ck-field-wide" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Check({ label, ...props }) {
  return (
    <label className="ck-check">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Button({ variant = "primary", type = "button", ...props }) {
  return <button type={type} className={"ck-btn ck-btn-" + variant} {...props} />;
}

export function RemoveButton({ onRemove, label = "Remove" }) {
  return <Button variant="danger" onClick={() => { if (window.confirm("Remove this record?")) onRemove(); }}>{label}</Button>;
}

export function Form({ onSubmit, children, className = "" }) {
  return <form className={"ck-form " + className} onSubmit={onSubmit}>{children}</form>;
}

export function DataTable({ columns, rows, empty = "Nothing here yet.", rowKey = (row, index) => row.id ?? index }) {
  return (
    <div className="ck-table-wrap">
      <table className="ck-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="ck-empty">{empty}</div>}
    </div>
  );
}

/** Loads a list endpoint and keeps it fresh; `reload` refetches after a save. */
export function useList(path, options = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const pathRef = useRef(path);
  pathRef.current = path;
  useEffect(() => () => { alive.current = false; }, []);

  const reload = useCallback(async () => {
    if (!pathRef.current) return [];
    setLoading(true);
    try {
      const result = await apiGet(pathRef.current);
      const next = options.pick ? options.pick(result) : rowsOf(result);
      if (alive.current) { setRows(next); setError(""); }
      return next;
    } catch (reason) {
      if (alive.current) setError(reason.message || "Could not load this list.");
      return [];
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [path, reload]);
  return { rows, loading, error, reload, setRows };
}

/** Wraps a save/remove call: shows one success or error line and never throws. */
export function useStatus() {
  const [status, setStatus] = useState({});
  const run = useCallback(async (task, okMessage) => {
    setStatus({});
    try {
      const result = await task();
      setStatus({ message: typeof okMessage === "function" ? okMessage(result) : okMessage });
      return { ok: true, result };
    } catch (reason) {
      setStatus({ error: reason.message || "That did not work." });
      return { ok: false };
    }
  }, []);
  return [status, run, setStatus];
}

/** Multipart upload that keeps the server's per-line errors, which the JSON client would drop. */
export async function uploadForm(path, form) {
  const response = await fetch("/api" + path, { method: "POST", body: form, credentials: "same-origin" });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, json };
}

/** One readable line for a CSV import error, whichever shape the endpoint reports. */
export function lineProblem(row) {
  if (row?.message) return row.message;
  return Object.entries(row?.fields || {}).map(([key, value]) => key + " " + value).join(", ");
}

/**
 * JSON call that keeps the server's field reasons ("report template is not assigned"),
 * which the shared client reduces to "validation_error". Throws an Error with that text.
 */
export async function apiCall(method, path, body) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("Your session has ended. Sign in again to continue.");
  if (!response.ok) {
    // Long reasons read fine alone; short ones ("required") need the field name.
    const fields = Object.entries(json.fields || {})
      .map(([key, value]) => (String(value).includes(" ") ? String(value) : key + " " + value))
      .join(". ");
    throw new Error(fields || (json.message && json.message !== json.error ? json.message : "") || json.error || "Request failed (" + response.status + ").");
  }
  return json;
}

export function staffName(row) {
  if (!row) return "";
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
  return row.employeeId ? name + " · " + row.employeeId : name;
}

export function formObject(event) {
  return Object.fromEntries(new FormData(event.currentTarget).entries());
}

/** Search-as-you-type student finder; calls onPick(row) with a /v1/students list row. */
export function StudentPicker({ value, onPick }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); return; }
    let live = true;
    const timer = setTimeout(() => {
      apiCall("GET", "/v1/students?" + new URLSearchParams({ q: term, pageSize: "20" }))
        .then((json) => { if (live) { setRows(rowsOf(json)); setError(""); } })
        .catch((reason) => live && setError(reason.message));
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [q]);
  return (
    <>
      <Field label="Find student" wide>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, admission no or roll no" />
      </Field>
      {error && <p className="ck-notice ck-notice-error">{error}</p>}
      {value ? (
        <p className="ck-notice ck-notice-ok">Selected: {value.admissionNo} · {value.name} {value.class ? "(" + [value.class, value.section].filter(Boolean).join(" ") + ")" : ""} <Button variant="ghost" onClick={() => onPick(null)}>Change</Button></p>
      ) : rows.length > 0 && (
        <DataTable
          rows={rows}
          columns={[
            { key: "admissionNo", label: "Admission no" },
            { key: "name", label: "Name" },
            { key: "class", label: "Class", render: (row) => [row.class, row.section].filter(Boolean).join(" ") || "-" },
            { key: "act", label: "", render: (row) => <Button variant="ghost" onClick={() => { onPick(row); setQ(""); }}>Select</Button> },
          ]}
        />
      )}
    </>
  );
}

/** Loads several GET endpoints together; `data[path]` is each response. Reloads when the paths change. */
export function useLoad(paths) {
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const key = paths.join("|");
  const keyRef = useRef(key);
  keyRef.current = key;
  const reload = useCallback(async () => {
    const asked = keyRef.current;
    const list = asked.split("|").filter(Boolean);
    try {
      const results = await Promise.all(list.map((path) => apiCall("GET", path)));
      if (keyRef.current !== asked) return {};
      const next = {};
      list.forEach((path, index) => { next[path] = results[index]; });
      setData(next);
      setError("");
      return next;
    } catch (reason) {
      if (keyRef.current === asked) setError(reason.message || "Could not load this screen.");
      return {};
    } finally {
      if (keyRef.current === asked) setLoaded(true);
    }
  }, []);
  useEffect(() => { reload(); }, [key, reload]);
  return { data, error, reload, loaded };
}

export const plural = (count, word) => count + " " + word + (count === 1 ? "" : "s");
export const titleCase = (value) => (value ? String(value)[0].toUpperCase() + String(value).slice(1).toLowerCase() : "-");

export function Row({ children }) {
  return <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</span>;
}

/** Looks up student names for a set of ids, one request per id, cached for the screen. */
export function useStudentNames(ids) {
  const [names, setNames] = useState({});
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  useEffect(() => {
    const missing = key ? key.split(",").filter((id) => !(id in names)) : [];
    if (!missing.length) return;
    let live = true;
    (async () => {
      const found = {};
      for (let start = 0; start < missing.length; start += 8) {
        const chunk = missing.slice(start, start + 8);
        const rows = await Promise.all(chunk.map((id) => apiCall("GET", "/v1/students/" + id).catch(() => null)));
        rows.forEach((row, index) => {
          found[chunk[index]] = row ? [row.admissionNo, [row.firstName, row.lastName].filter(Boolean).join(" ")].filter(Boolean).join(" · ") : "Unknown student";
        });
      }
      if (live) setNames((current) => ({ ...current, ...found }));
    })();
    return () => { live = false; };
  }, [key]);
  return names;
}
