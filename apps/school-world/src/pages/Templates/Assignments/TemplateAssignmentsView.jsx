import React from "react";
import TemplateReceiptNotesEditor from "./TemplateReceiptNotesEditor.jsx";
import { CheckCircle2, FileText, GraduationCap, RefreshCw, AlertTriangle, Check } from "lucide-react";
import { appLocale } from "../../../school-locale.js";

const panelStyle = {
  marginTop: 22, padding: 22, border: "1px solid #dce5ef", borderRadius: 18,
  background: "linear-gradient(145deg,#ffffff 0%,#f8fbff 100%)",
  boxShadow: "0 12px 28px rgba(15,35,66,.07)", color: "#17304d"
};
const fieldStyle = { minWidth: 0, width: "100%", padding: "10px 11px", border: "1px solid #cbd7e5", borderRadius: 9, background: "#fff", color: "#1a3553", fontSize: 13 };
const applyButtonStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: 0, borderRadius: 9, padding: "10px 13px", background: "#155eac", color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
const labelStyle = { display: "block", color: "#526882", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 };
const cardStyle = { minWidth: 0, border: "1px solid #dfe7f0", borderRadius: 12, background: "#fff", padding: 14 };
const mutedStyle = { color: "#6b7e93", fontSize: 12, lineHeight: 1.45 };

function appliedLabel(assignment) {
  if (!assignment) return "Not applied yet";
  if (!assignment.appliedAt) return "Saved in database";
  const date = new Date(assignment.appliedAt);
  return "Applied " + (Number.isNaN(date.getTime()) ? "" : date.toLocaleString(appLocale(), { dateStyle: "medium", timeStyle: "short" }));
}

function AssignmentTemplateCard({ admin, type, options, selections, savingKey, changeSelection, apply }) {
  const assignment = type === "fee_receipt" ? admin.feeReceipt : admin.performanceReport;
  const key = admin.id + ":" + type;
  const selectedId = selections[key] || assignment?.templateId || options[0]?.id || "";
  const busy = savingKey === key;
  return <div style={cardStyle}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <span style={labelStyle}>{type === "fee_receipt" ? "Fee receipt template" : "Performance template"}</span>
      {assignment ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 99, background: "#e8f7ef", color: "#176b42", padding: "4px 7px", fontSize: 10, fontWeight: 800 }}><Check size={11} /> Applied v{assignment.version}</span> :
        <span style={{ borderRadius: 99, background: "#f1f4f8", color: "#61748b", padding: "4px 7px", fontSize: 10, fontWeight: 800 }}>Not applied</span>}
    </div>
    <select aria-label={(type === "fee_receipt" ? "Fee receipt" : "Performance") + " template for " + admin.email} style={fieldStyle} value={selectedId} onChange={event => changeSelection(admin.id, type, event.target.value)} disabled={!options.length || busy}>
      {options.length ? options.map(template => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>) : <option value="">No active templates</option>}
    </select>
    {assignment && <p style={{ ...mutedStyle, margin: "8px 0 10px" }}>{appliedLabel(assignment)}</p>}
    {!assignment && <p style={{ ...mutedStyle, margin: "8px 0 10px" }}>Choose a template, then apply it to this administrator only.</p>}
    <button type="button" style={{ ...applyButtonStyle, opacity: busy || !options.length ? .68 : 1 }} disabled={busy || !options.length} onClick={() => void apply(admin, type)}>
      {busy ? <RefreshCw size={14} className="db-template-spin" /> : <CheckCircle2 size={14} />}
      {busy ? "Saving…" : "Apply " + (type === "fee_receipt" ? "receipt" : "performance")}
    </button>
  </div>;
}

export default function TemplateAssignmentsView({ templates, admins, selections, loading, savingKey, error, message, load, changeSelection, apply, notesSavingId, saveReceiptNotes }) {
  const feeTemplates = templates.filter(item => item.templateType === "fee_receipt" && item.isActive);
  const performanceTemplates = templates.filter(item => item.templateType === "performance_report" && item.isActive);
  return <section style={panelStyle} aria-labelledby="db-template-assignments-title">
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#1765a9", fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}><FileText size={16} /> SUPER ADMIN CONTROLS</div>
        <h2 id="db-template-assignments-title" style={{ margin: "8px 0 6px", color: "#142f4d", fontSize: 22 }}>Template assignments</h2>
        <p style={{ margin: 0, ...mutedStyle, maxWidth: 780, fontSize: 13 }}>Apply a fee receipt format and a performance report template separately for every school administrator. Each apply action is saved in PostgreSQL with the template version, Super Admin account and applied time.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || Boolean(savingKey)} style={{ ...applyButtonStyle, background: "#eaf1f8", color: "#23486f", border: "1px solid #d5e0ec" }}><RefreshCw size={14} /> Refresh</button>
    </div>
    {error && <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", padding: 11, marginBottom: 12, borderRadius: 9, background: "#fff1f0", color: "#9b2c24", fontSize: 13 }}><AlertTriangle size={16} />{error}</div>}
    {message && <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: 11, marginBottom: 12, borderRadius: 9, background: "#e8f7ef", color: "#176b42", fontSize: 13 }}><CheckCircle2 size={16} />{message}</div>}
    {loading ? <p style={mutedStyle}>Loading school-admin accounts and saved assignments…</p> : admins.length ? <div style={{ display: "grid", gap: 13 }}>
      {admins.map(admin => <article key={admin.id} style={{ border: "1px solid #dce6f0", borderRadius: 14, padding: 14, background: "#fdfefe" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #e7edf4", paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ width: 39, height: 39, display: "grid", placeItems: "center", borderRadius: 12, background: "#edf4fc", color: "#2164a1" }}><GraduationCap size={20} /></div>
          <div style={{ minWidth: 220, flex: "1 1 260px" }}><strong style={{ display: "block", color: "#1b3656", fontSize: 14 }}>{admin.schoolName}</strong><span style={{ display: "block", color: "#60748b", fontSize: 12, marginTop: 3 }}>{admin.adminName} · {admin.email}</span></div>
          <span style={{ borderRadius: 99, padding: "5px 9px", fontSize: 11, fontWeight: 800, background: admin.isActive ? "#e8f7ef" : "#fff0ee", color: admin.isActive ? "#176b42" : "#a03b31" }}>{admin.isActive ? "Admin active" : "Admin inactive"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,330px),1fr))", gap: 12 }}>
          <AssignmentTemplateCard admin={admin} type="fee_receipt" options={feeTemplates} selections={selections} savingKey={savingKey} changeSelection={changeSelection} apply={apply} />
          <AssignmentTemplateCard admin={admin} type="performance_report" options={performanceTemplates} selections={selections} savingKey={savingKey} changeSelection={changeSelection} apply={apply} />
        </div>
        <TemplateReceiptNotesEditor admin={admin} saving={notesSavingId === admin.id} onSave={saveReceiptNotes} />
      </article>)}
    </div> : <p style={mutedStyle}>No school-admin accounts found. Create a school from the Super Admin account panel first.</p>}
  </section>;
}
