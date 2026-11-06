import React from "react";
import { X } from "lucide-react";
import { formatMoney } from "../../school-locale.js";

export default function StudentApplyFeeTemplateDialog({ context }) {
  const { showApplyFeeTemplate, setShowApplyFeeTemplate, applyFeeTemplateBusy, student, data, t, selectedFeeTemplateId, setSelectedFeeTemplateId, availableFeeTemplates, applyFeeTemplateError, formatFeeMoney, applyFeeTemplateToStudent, availableFeeTypes, replaceExistingTemplate } = context;
  return (
    showApplyFeeTemplate && <div className="legacy-modal-backdrop fee-template-apply-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !applyFeeTemplateBusy) setShowApplyFeeTemplate(false); }}>
        <section className="legacy-modal fee-template-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="student-apply-fee-template-title" onMouseDown={event => event.stopPropagation()}>
          <div className="legacy-modal-head"><div><h2 id="student-apply-fee-template-title">{t("Apply Fee Template")}</h2><p>{student.name} · {student.id} · {data.academicYear}</p></div><button type="button" disabled={applyFeeTemplateBusy} onClick={() => setShowApplyFeeTemplate(false)}><X size={18}/></button></div>
          {replaceExistingTemplate && <div className="fee-template-replace-warning" role="status"><strong>{t("Replace existing fee template")}</strong><span>{t("This student already has an unpaid template assignment. The existing unpaid template rows will be replaced only when you click Apply. Recorded payments must be reversed before replacement.")}</span></div>}
          <label className="fee-template-dialog-field">{t("Select Fee Template")}<select value={selectedFeeTemplateId} onChange={event => { setSelectedFeeTemplateId(event.target.value); setApplyFeeTemplateError(""); }} disabled={applyFeeTemplateBusy}>{availableFeeTemplates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.academicYear}</option>)}</select></label>
          {(() => {
            const template = availableFeeTemplates.find(item => String(item.id) === String(selectedFeeTemplateId));
            if (!template) return <div className="fee-template-dialog-empty">{t("No saved fee templates are available.")}</div>;
            const lines = (template.installments || []).flatMap(installment => (installment.fees || []).filter(line => line.feeTypeId && String(line.amount).trim() !== "").map(line => {
              const feeType = availableFeeTypes.find(type => String(type.id) === String(line.feeTypeId));
              const taxes = feeType?.taxes || line.taxes || {};
              const base = Math.max(0, Number(line.amount || 0));
              const value = Math.max(0, Number(line.discountValue || 0));
              const rawDiscount = line.discountType === "Percentage" ? Math.min(base, base * Math.min(value, 100) / 100) : line.discountType === "Fixed Amount" ? Math.min(base, value) : 0;
              const discount = Math.round(rawDiscount * 100) / 100;
              const taxable = Math.max(0, base - discount);
              const rate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
              return { name: line.feeTypeName || feeType?.name || "Fee", installment: String(installment.installment || ""), dueDate: installment.dueDate || "", base, discount, tax: Math.round(taxable * rate) / 100 };
            }));
            const subtotal = lines.reduce((sum, line) => sum + line.base, 0);
            const discount = lines.reduce((sum, line) => sum + line.discount, 0);
            const taxes = lines.reduce((sum, line) => sum + line.tax, 0);
            return <div className="fee-template-dialog-summary">
              <div><span>{t("Installments")}</span><strong>{[...new Set(lines.map(line => line.installment).filter(Boolean))].join(", ") || t("Not specified")}</strong></div>
              <div><span>{t("Fee Types")}</span><strong>{[...new Set(lines.map(line => line.name))].join(", ") || "—"}</strong></div>
              <div><span>{t("Sub Amount")}</span><strong>{formatMoney(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div><span>{t("Discount")}</span><strong>{formatMoney(discount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div><span>{t("Applied Taxes")}</span><strong>{formatMoney(taxes, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div><span>{t("Total Amount")}</span><strong>{formatMoney(subtotal - discount + taxes, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            </div>;
          })()}
          {applyFeeTemplateError && <div className="fee-template-error" role="alert">{applyFeeTemplateError}</div>}
          <div className="legacy-modal-actions"><button type="button" className="plain-button" onClick={() => setShowApplyFeeTemplate(false)} disabled={applyFeeTemplateBusy}>{t("Cancel")}</button><button type="button" className="legacy-save" onClick={applyFeeTemplateToStudent} disabled={applyFeeTemplateBusy||!selectedFeeTemplateId}>{applyFeeTemplateBusy?t("Applying…"):t("Apply")}</button></div>
        </section>
      </div>
  );
}
