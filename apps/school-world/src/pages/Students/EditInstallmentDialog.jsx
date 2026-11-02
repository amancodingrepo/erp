import React from "react";
import { X } from "lucide-react";

export default function EditInstallmentDialog({ context }) {
  const { editInstallmentTarget, editInstallmentBusy, setEditInstallmentTarget, student, shortName, t, installmentRecords, editInstallmentDrafts, setEditInstallmentDrafts, saveEditInstallment } = context;
  const hasEditableRecord = Boolean(editInstallmentTarget) && installmentRecords(editInstallmentTarget).some(record => Number(record.amountPaid || 0) < Number(record.amount || 0) - 0.001);
  return (
    editInstallmentTarget && <div className="legacy-modal-backdrop fee-payment-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!editInstallmentBusy)setEditInstallmentTarget(null);}}>
        <section className="legacy-modal fee-edit-installment-dialog" role="dialog" aria-modal="true" aria-labelledby="fee-edit-installment-title" onMouseDown={event=>event.stopPropagation()}>
          <div className="legacy-modal-head"><div><h2 id="fee-edit-installment-title">{t("Edit installment")}</h2><p>{student.name || shortName} · {editInstallmentTarget.metadata?.installmentName || "Installment"}</p></div><button type="button" disabled={editInstallmentBusy} onClick={()=>setEditInstallmentTarget(null)}><X size={18}/></button></div>
          <div className="fee-edit-installment-content"><table className="legacy-table"><thead><tr><th>{t("Fee Type")}</th><th>{t("Total Amount")}</th><th>{t("Due Date")}</th><th>{t("Notes / Reference")}</th></tr></thead><tbody>
            {installmentRecords(editInstallmentTarget).map(record=>{
              const draft=editInstallmentDrafts[String(record.id)]||{};
              const paid=Number(record.amountPaid||0)>=Number(record.amount||0)-0.001;
              return <tr key={record.id} className={paid?"fee-payment-paid-row":undefined} title={paid?t("Fully paid — locked"):undefined}>
              <td>{record.metadata?.templateFeeItems?.[0]?.name || record.feeName}</td>
              <td><input type="number" min={Number(record.amountPaid||0)} step="0.01" value={draft.amount??""} onChange={event=>setEditInstallmentDrafts(previous=>({...previous,[String(record.id)]:{...(previous[String(record.id)]||{}),amount:event.target.value}}))} disabled={editInstallmentBusy||paid}/></td>
              <td><input type="date" value={draft.dueDate??""} onChange={event=>setEditInstallmentDrafts(previous=>({...previous,[String(record.id)]:{...(previous[String(record.id)]||{}),dueDate:event.target.value}}))} disabled={editInstallmentBusy||paid}/></td>
              <td><input value={draft.reference??""} onChange={event=>setEditInstallmentDrafts(previous=>({...previous,[String(record.id)]:{...(previous[String(record.id)]||{}),reference:event.target.value}}))} disabled={editInstallmentBusy||paid}/></td>
            </tr>;})}
          </tbody></table></div>
          <div className="legacy-modal-actions"><button type="button" className="plain-button" onClick={()=>setEditInstallmentTarget(null)} disabled={editInstallmentBusy}>{t("Cancel")}</button><button type="button" className="legacy-save" onClick={saveEditInstallment} disabled={editInstallmentBusy||!hasEditableRecord}>{editInstallmentBusy?t("Saving…"):t("Save changes")}</button></div>
        </section>
      </div>
  );
}
