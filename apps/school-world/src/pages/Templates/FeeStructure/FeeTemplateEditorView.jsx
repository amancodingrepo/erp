function formatDateDDMMYYYY(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

import React from "react";
import { Check, CalendarDays, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { money, summarizeInstallment } from "./feeTemplateUtils.js";

export default function FeeTemplateEditorView({ context }) {
  const { text, draft, updateDraft, academicYears, startInstallmentAdd, saving, loadError, summarizeInstallment, feeTypes, money, startInstallmentEdit, removeInstallment, saveTemplate, goBackToList } = context;
  return (
    <form className="fees-setup-form-card fees-template-editor" onSubmit={saveTemplate}>
      <div className="fees-template-main-fields">
        <label className="fees-template-name-field">{text("Fee Template Name")}<input required maxLength={120} value={draft.name} onChange={event => updateDraft("name", event.target.value)} placeholder={text("e.g. Class 1 Fee Template")} /></label>
        <label>{text("Academic Year")}<select value={draft.academicYear} onChange={event => updateDraft("academicYear", event.target.value)}>{academicYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        <label>{text("Student Type")}<select value={draft.studentType} onChange={event => updateDraft("studentType", event.target.value)}><option>All Students</option><option>New Students</option><option>Existing Students</option></select></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.hasOptionalFees} onChange={event => updateDraft("hasOptionalFees", event.target.checked)}/><span><strong>{text("Has Optional Fees")}</strong><small>{text("Some students may opt out of selected fee items.")}</small></span></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.isMonthlyTemplate} onChange={event => updateDraft("isMonthlyTemplate", event.target.checked)}/><span><strong>{text("Is Monthly Template")}</strong><small>{text("Use monthly installments such as April, May, and June.")}</small></span></label>
      </div>
      <div className="fees-setup-divider"/>
      <div className="fees-template-installment-heading"><div><h3>{text("Fee Installments")}</h3><p>{text("Each installment can include several fee types, discount settings, taxes, notes and a due date.")}</p></div><button type="button" className="fees-setup-primary" onClick={startInstallmentAdd} disabled={saving || Boolean(loadError)}><Plus size={14}/>{text("Add Installment")}</button></div>
      <div className="fees-setup-table-scroll"><table className="fees-setup-table fees-installment-table"><thead><tr><th>{text("Installment")}</th><th>{text("Fee Type")}</th><th>{text("Amount")}</th><th>{text("Discount")}</th><th>{text("Applied Taxes")}</th><th>{text("Notes")}</th><th>{text("Due Date")}</th><th>{text("Actions")}</th></tr></thead><tbody>
        {(draft.installments || []).map(installment => {
          const summary = summarizeInstallment(installment, feeTypes);
          return <tr key={installment.id}><td><strong>{installment.installment}</strong></td><td>{summary.names.length ? summary.names.join(", ") : "—"}</td><td>{money(summary.amount)}</td><td>{summary.discount ? money(summary.discount) : "—"}</td><td>{summary.taxes.join(", ") || "—"}</td><td className="fees-template-note-cell">{installment.notes || "—"}</td><td>{formatDateDDMMYYYY(installment.dueDate) || "—"}</td><td><div className="fees-setup-row-actions"><button type="button" onClick={() => startInstallmentEdit(installment)}><Pencil size={13}/>{text("Edit")}</button><button type="button" className="danger" onClick={() => removeInstallment(installment)}><Trash2 size={13}/>{text("Remove")}</button></div></td></tr>;
        })}
        {!(draft.installments || []).length && <tr><td colSpan={8}><div className="fees-setup-empty"><ClipboardList size={22}/><strong>{text("No installments added yet.")}</strong><span>{text("Add an installment to choose fee types, discount, tax details and due date.")}</span></div></td></tr>}
      </tbody></table></div>
      <div className="fees-template-total-row"><span>{text("Total before discounts / taxes")}</span><strong>{money((draft.installments || []).reduce((sum, installment) => sum + summarizeInstallment(installment, feeTypes).amount, 0))}</strong><span>{text("Discount total")}</span><strong>{money((draft.installments || []).reduce((sum, installment) => sum + summarizeInstallment(installment, feeTypes).discount, 0))}</strong></div>
      <div className="fees-setup-form-actions"><button type="submit" className="fees-setup-primary" disabled={saving || Boolean(loadError)}>{saving ? text("Saving…") : <><Check size={15}/>{text("Submit / Save Template")}</>}</button><button type="button" className="fees-setup-secondary" onClick={goBackToList} disabled={saving}>{text("Back to List")}</button></div>
    </form>
  );
}
