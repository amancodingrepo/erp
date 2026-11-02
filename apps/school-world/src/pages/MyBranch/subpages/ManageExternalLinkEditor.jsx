import React, { useState } from "react";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock3, ExternalLink, Save } from "lucide-react";

const initialForm = link => ({
  url: link?.url || "",
  description: link?.description || "",
  onlyDaycareStudent: Boolean(link?.onlyDaycareStudent),
  onlyDaycareTiming: Boolean(link?.onlyDaycareTiming),
  availableToAllGrades: link ? Boolean(link.availableToAllGrades) : true,
  gradeIds: Array.isArray(link?.gradeIds) ? link.gradeIds.map(String) : [],
  availableFrom: link?.availableFrom || "05:00",
  availableTo: link?.availableTo || "23:00",
  isCctvCameraLink: Boolean(link?.isCctvCameraLink)
});

export default function ManageExternalLinkEditor({ link, grades = [], saving = false, onCancel, onSave, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [form, setForm] = useState(() => initialForm(link));
  const [error, setError] = useState("");
  const editing = Boolean(link?.id);

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }));
    setError("");
  }
  function toggleGrade(id, checked) {
    setForm(current => ({
      ...current,
      gradeIds: checked
        ? [...new Set([...current.gradeIds, String(id)])]
        : current.gradeIds.filter(value => value !== String(id))
    }));
    setError("");
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.url.trim()) return setError("Link is required.");
    try {
      const parsed = new URL(form.url.trim());
      if (!["https:", "http:"].includes(parsed.protocol)) return setError("Use a link beginning with http:// or https://.");
    } catch {
      return setError("Enter a valid external link URL.");
    }
    if (!form.availableToAllGrades && form.gradeIds.length === 0) {
      return setError("Select at least one saved grade, or choose Available to all grades.");
    }
    await onSave({
      ...form,
      url: form.url.trim(),
      description: form.description.trim(),
      gradeIds: form.availableToAllGrades ? [] : form.gradeIds
    });
  }

  return (
    <section className="mel-editor">
      <header className="mel-editor-heading">
        <div className="mel-editor-heading-icon"><ExternalLink size={18} /></div>
        <div><span className="mel-eyebrow">ADMINISTRATIVE · LINKS</span><h2>{text(editing ? "Edit Link" : "Add Link")}</h2><p>{text("Save link details and availability settings to the school database.")}</p></div>
        <button type="button" className="mel-button mel-button-light mel-back-to-list" onClick={onCancel} disabled={saving}><ArrowLeft size={14}/>{text("Back to List")}</button>
      </header>

      {error && <div className="mel-alert mel-alert-error" role="alert"><AlertCircle size={16}/><span>{text(error)}</span></div>}

      <form className="mel-form" onSubmit={submit}>
        <section className="mel-form-card">
          <header><h3>{text("Link Details")}</h3><p>{text("Enter the external website or resource link.")}</p></header>
          <div className="mel-fields">
            <label className="mel-field mel-field-full"><span>{text("Link")} <b>*</b></span><input type="url" required maxLength={2000} value={form.url} onChange={event => update("url", event.target.value)} placeholder="https://example.com" disabled={saving}/></label>
            <label className="mel-field mel-field-full"><span>{text("Description")}</span><textarea rows={3} maxLength={1000} value={form.description} onChange={event => update("description", event.target.value)} placeholder={text("Description")} disabled={saving}/></label>
          </div>
        </section>

        <section className="mel-form-card">
          <header><h3>{text("Access Rules")}</h3><p>{text("Choose whether the link is limited to daycare students, a time window, or selected grades.")}</p></header>
          <div className="mel-check-grid">
            <label className="mel-check-row"><input type="checkbox" checked={form.onlyDaycareStudent} onChange={event => update("onlyDaycareStudent", event.target.checked)} disabled={saving}/><span><strong>{text("Only Allow Daycare Student")}</strong><small>{text("Limit this link to daycare students.")}</small></span></label>
            <label className="mel-check-row"><input type="checkbox" checked={form.onlyDaycareTiming} onChange={event => update("onlyDaycareTiming", event.target.checked)} disabled={saving}/><span><strong>{text("Only Allow Daycare Timing")}</strong><small>{text("Apply the availability time window below.")}</small></span></label>
          </div>

          <div className="mel-grade-section">
            <div className="mel-grade-heading"><div><h4>{text("Available to grades")}</h4><p>{text("Grade choices are loaded from saved relational class records.")}</p></div>
              <label className="mel-check-all"><input type="checkbox" checked={form.availableToAllGrades} onChange={event => update("availableToAllGrades", event.target.checked)} disabled={saving}/>{text("Available to all grades")}</label>
            </div>
            {grades.length ? <div className={"mel-grade-grid" + (form.availableToAllGrades ? " is-disabled" : "")}>
              {grades.map(grade => <label className="mel-grade-option" key={grade.id}>
                <input type="checkbox" checked={form.gradeIds.includes(String(grade.id))} onChange={event => toggleGrade(grade.id, event.target.checked)} disabled={saving || form.availableToAllGrades}/>
                <span>{grade.className}{grade.isActive === false ? " (Inactive)" : ""}</span>
              </label>)}
            </div> : <div className="mel-empty-grades"><AlertCircle size={16}/><span>{text("No saved classes were found in the relational database. No sample class options have been added.")}</span></div>}
          </div>

          <div className="mel-time-grid">
            <label className="mel-field"><span><Clock3 size={14}/>{text("Available From")}</span><input type="time" value={form.availableFrom} onChange={event => update("availableFrom", event.target.value)} required disabled={saving}/></label>
            <label className="mel-field"><span><Clock3 size={14}/>{text("Available To")}</span><input type="time" value={form.availableTo} onChange={event => update("availableTo", event.target.value)} required disabled={saving}/></label>
          </div>

          <label className="mel-check-row mel-cctv-check"><input type="checkbox" checked={form.isCctvCameraLink} onChange={event => update("isCctvCameraLink", event.target.checked)} disabled={saving}/><span><strong>{text("CCTV Camera Link")}</strong><small>{text("Mark this link as a CCTV camera link.")}</small></span></label>
        </section>

        <footer className="mel-form-footer">
          <button type="button" className="mel-button mel-button-light" onClick={onCancel} disabled={saving}>{text("Cancel")}</button>
          <button type="submit" className="mel-button mel-button-primary" disabled={saving}>{saving ? <span className="mel-spinner"/> : <Save size={15}/>} {text(saving ? "Saving…" : "Save")}</button>
        </footer>
      </form>
      {link?.id && <div className="mel-record-meta"><CheckCircle2 size={13}/>{text("Editing a saved database record")}</div>}
    </section>
  );
}
