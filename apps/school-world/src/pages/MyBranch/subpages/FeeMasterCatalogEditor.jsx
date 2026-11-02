import React from "react";
import { Check } from "lucide-react";

export default function FeeMasterCatalogEditor({ context }) {
  const { text, fields, draft, setDraft, save, saving, loadError, setPage } = context;
  return (<form className="fees-setup-form-card" onSubmit={save}>
      <div className="fees-setup-form-grid">
        {fields.map(field => <label key={field.key} className={field.wide ? "fees-setup-wide-field" : ""}>{text(field.label)}
          {field.options
            ? <select value={draft[field.key] ?? ""} required={Boolean(field.required)} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))}>{field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{text(option.label ?? option)}</option>)}</select>
            : field.type === "textarea"
              ? <textarea value={draft[field.key] ?? ""} maxLength={field.maxLength || 500} required={Boolean(field.required)} rows={3} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} placeholder={field.placeholder ? text(field.placeholder) : ""}/>
              : <input type={field.type === "number" ? "number" : "text"} min={field.type === "number" ? (field.min ?? 0) : undefined} max={field.type === "number" ? (field.key === "value" && draft.calculationType === "Percentage" ? 100 : field.max) : undefined} step={field.type === "number" ? (field.step || "0.01") : undefined} required={Boolean(field.required)} value={draft[field.key] ?? ""} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} placeholder={field.placeholder ? text(field.placeholder) : ""}/>}
        </label>)}
      </div>
      <div className="fees-setup-form-actions"><button type="submit" className="fees-setup-primary" disabled={saving || Boolean(loadError)}>{saving ? text("Saving…") : <><Check size={15}/>{text("Save")}</>}</button><button type="button" className="fees-setup-secondary" onClick={() => setPage("list")} disabled={saving}>{text("Cancel")}</button></div>
    </form>);
}
