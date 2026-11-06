import React from "react";
import { BadgeIndianRupee, ClipboardList } from "lucide-react";
import { AdmitField, AdmitSectionHeading } from "./AdmitStudentFields.jsx";
import { formatMoney } from "../../../school-locale.js";

export default function AdmitStudentFeesTab({ fees, setFeeField, templates = [] }) {
  const selected = templates.find(item => String(item.id) === String(fees.templateId)) || null;
  const amount = (selected?.installments || []).reduce((total, installment) =>
    total + (installment.fees || []).reduce((sum, line) => sum + Math.max(0, Number(line.amount) || 0), 0), 0);
  return <section className="admit-tab-panel">
    <AdmitSectionHeading title="Fees" description="Optionally select the fee template to be applied immediately after the student is created." />
    <div className="admit-form-grid two">
      <AdmitField label="Fee Template" value={fees.templateId || ""} options={templates.map(item => ({
        value: String(item.id), label: item.name + (item.academicYear ? " · " + item.academicYear : "")
      }))} onChange={value => setFeeField("templateId", value)} />
      <AdmitField label="Fee Notes" value={fees.notes || ""} onChange={value => setFeeField("notes", value)} placeholder="Optional fee setup notes" />
    </div>
    {selected ? <div className="admit-fee-template-summary">
      <div className="admit-fee-summary-icon"><BadgeIndianRupee size={21} /></div>
      <div className="admit-fee-summary-copy"><strong>{selected.name}</strong>
        <span>{(selected.installments || []).length} installment(s) · {selected.academicYear || "Academic year not set"}</span>
        <small>Base amount before discounts and taxes</small>
      </div>
      <strong className="admit-fee-summary-total">{formatMoney(amount, { maximumFractionDigits: 2 })}</strong>
    </div> : <div className="admit-tab-empty"><ClipboardList size={22} /><span>{templates.length ? "Select a fee template to review its installments." : "No fee templates are configured yet. You can continue and apply a template later from Manage Fee Templates."}</span></div>}
    <label className="admit-checkbox-row">
      <input type="checkbox" checked={Boolean(fees.applyTemplate)} disabled={!selected} onChange={event => setFeeField("applyTemplate", event.target.checked)} />
      <span><strong>Apply selected template after saving</strong><small>This creates fee installment records in the existing Fees module. Students with an existing template assignment cannot be assigned a second one.</small></span>
    </label>
  </section>;
}
