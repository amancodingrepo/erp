function formatDateForDisplay(value) {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return dmy ? raw : raw;
}

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return raw;
}

import React from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { blankLine, money, subtotalForLine, taxLabels } from "./feeTemplateUtils.js";
import { moneyLabel } from "../../../school-locale.js";

export default function FeeTemplateInstallmentDialog({ context }) {
  const { installmentModal, setInstallmentModal, text, installmentDraft, setInstallmentDraft, saveInstallment, installmentOptions, blankLine, updateInstallmentLine, feeTypes, taxLabels, money, subtotalForLine } = context;
  return (
    <div className="fees-setup-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInstallmentModal(false); }}>
      <form className="fees-setup-modal fees-installment-modal" role="dialog" aria-modal="true" aria-labelledby="fees-installment-dialog-title" onSubmit={saveInstallment}>
        <header><div><span className="fees-setup-eyebrow">{text("FEE TEMPLATE INSTALLMENT")}</span><h3 id="fees-installment-dialog-title">{text(installmentDraft.id ? "Edit Fee Installment" : "Add Fee Installment")}</h3><p>{text("Choose the payment schedule and its fee components.")}</p></div><button type="button" className="fees-setup-close" onClick={() => setInstallmentModal(false)} aria-label={text("Close")}><X size={17}/></button></header>
        <div className="fees-installment-schedule-fields">
          <label>{text("Installment")}<select value={installmentDraft.installment} onChange={event => setInstallmentDraft(previous => ({ ...previous, installment: event.target.value }))}>{installmentOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>{text("Next Payment Date")}<input type="text" inputMode="numeric" placeholder="DD-MM-YYYY" value={formatDateForDisplay(installmentDraft.dueDate || "")} onChange={event => setInstallmentDraft(previous => ({ ...previous, dueDate: normalizeDateInput(event.target.value) }))} pattern="\d{2}-\d{2}-\d{4}" title="Enter date as DD-MM-YYYY"/></label>
          <label className="fees-template-name-field">{text("Notes")}<input maxLength={250} value={installmentDraft.notes || ""} onChange={event => setInstallmentDraft(previous => ({ ...previous, notes: event.target.value }))} placeholder={text("Optional installment note")}/></label>
        </div>
        <div className="fees-installment-line-heading"><h4>{text("Fees")}</h4><button type="button" className="fees-setup-secondary" onClick={() => setInstallmentDraft(previous => ({ ...previous, fees: [...(previous.fees || []), blankLine()] }))}><Plus size={13}/>{text("Add Fees")}</button></div>
        <div className="fees-installment-lines">{(installmentDraft.fees || []).map((line, index) => <section className="fees-installment-line" key={line.id}>
          <div className="fees-installment-line-top"><strong>{text("Fee")} {index + 1}</strong><button type="button" className="fees-template-remove-line" disabled={(installmentDraft.fees || []).length === 1} onClick={() => setInstallmentDraft(previous => ({ ...previous, fees: previous.fees.filter(item => item.id !== line.id) }))}><Trash2 size={12}/>{text("Remove")}</button></div>
          <div className="fees-installment-line-grid">
            <label>{text("Fee Type")}<select required value={line.feeTypeId} onChange={event => updateInstallmentLine(line.id, "feeTypeId", event.target.value)}><option value="">{text("-- Select Fee Type --")}</option>{feeTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
            <label>{moneyLabel(text("Amount"))}<input required type="number" min="0" step="0.01" value={line.amount} onChange={event => updateInstallmentLine(line.id, "amount", event.target.value)} placeholder="0.00"/></label>
            <label>{text("Discount Type")}<select value={line.discountType || "Default Discount"} onChange={event => updateInstallmentLine(line.id, "discountType", event.target.value)}><option>Default Discount</option><option>No Discount</option><option>Fixed Amount</option><option>Percentage</option></select></label>
            <label>{line.discountType === "Percentage" ? text("Discount (%)") : moneyLabel(text("Discount Amount"))}<input type="number" min="0" max={line.discountType === "Percentage" ? "100" : undefined} step="0.01" value={line.discountValue ?? "0"} disabled={!["Fixed Amount", "Percentage"].includes(line.discountType)} onChange={event => updateInstallmentLine(line.id, "discountValue", event.target.value)}/></label>
          </div>
          <div className="fees-installment-line-foot"><span>{text("Applied taxes")}: {taxLabels(line.taxes).join(", ") || text("No GST configured")}</span><span>{text("Amount after discount and GST")}: <strong>{money(subtotalForLine(line))}</strong></span></div>
          <label className="fees-installment-line-notes">{text("Fee notes")}<input value={line.notes || ""} onChange={event => updateInstallmentLine(line.id, "notes", event.target.value)} placeholder={text("Optional note for this fee")}/></label>
        </section>)}</div>
        <footer><button type="submit" className="fees-setup-primary"><Check size={14}/>{text("Save Installment")}</button><button type="button" className="fees-setup-secondary" onClick={() => setInstallmentModal(false)}>{text("Close")}</button></footer>
      </form>
    </div>
  );
}
