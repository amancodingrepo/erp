import React from "react";
import { moneyLabel } from "../../school-locale.js";

export default function FeesRecordDialogs({ context }) {
  const { editingFee, setEditingFee, feeBusy, t, editDraft, setEditDraft, saveEditedFee, markFeePaid, reverseTarget, setReverseTarget, money, reverseReason, setReverseReason, feeSettingsReady, reversePayment } = context;
  return (
    <>
{editingFee && <div className="fees-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !feeBusy) setEditingFee(null); }}>
      <section className="fees-modal" role="dialog" aria-modal="true" aria-labelledby="fees-edit-title">
        <header><div><span className="fees-eyebrow">{t("FEE LEDGER ENTRY")}</span><h3 id="fees-edit-title">{t("Pay / Edit Fee")}</h3><p>{editingFee.studentName} · {editingFee.feeName}</p></div><button type="button" className="fees-modal-close" onClick={() => setEditingFee(null)} aria-label={t("Close")}>×</button></header>
        <div className="fees-form-grid">
          <label>{moneyLabel(t("Total Amount"))}<input type="number" min="0" step="0.01" value={editDraft.amount} onChange={event => setEditDraft(previous => ({ ...previous, amount: event.target.value }))} /></label>
          <label>{moneyLabel(t("Amount Paid"))}<input type="number" min="0" step="0.01" value={editDraft.amountPaid} onChange={event => setEditDraft(previous => ({ ...previous, amountPaid: event.target.value }))} /></label>
          <label>{t("Due Date")}<input type="date" value={editDraft.dueDate} onChange={event => setEditDraft(previous => ({ ...previous, dueDate: event.target.value }))} /></label>
          <label className="fees-wide-field">{t("Payment Reference")}<input value={editDraft.reference} onChange={event => setEditDraft(previous => ({ ...previous, reference: event.target.value }))} /></label>
        </div>
        <div className="fees-card-actions"><button type="button" className="fees-button fees-button-primary" disabled={feeBusy} onClick={saveEditedFee}>{feeBusy ? t("Saving…") : t("Save changes")}</button>{editingFee.status !== "Paid" && <button type="button" className="fees-button fees-button-green" disabled={feeBusy} onClick={async () => { await markFeePaid(editingFee); setEditingFee(null); }}>{t("Mark fully paid")}</button>}<button type="button" className="fees-button fees-button-light" onClick={() => setEditingFee(null)}>{t("Cancel")}</button></div>
      </section>
    </div>}

    {reverseTarget && <div className="fees-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !feeBusy) setReverseTarget(null); }}>
      <section className="fees-modal" role="dialog" aria-modal="true" aria-labelledby="fees-reversal-title">
        <header><div><span className="fees-eyebrow">{t("PAYMENT REVERSAL")}</span><h3 id="fees-reversal-title">{t("Confirm Payment Reversal")}</h3><p>{reverseTarget.studentName} · {reverseTarget.feeName} · {money(reverseTarget.amountPaid)}</p></div><button type="button" className="fees-modal-close" onClick={() => setReverseTarget(null)} aria-label={t("Close")}>×</button></header>
        <div className="fees-reversal-warning">{t("This fee record stores one total paid amount, not individual transaction lines. Reversal will set its recorded paid amount to zero, increase its outstanding balance, and save an audit entry. Please verify the source payment before continuing.")}</div>
        <label className="fees-reason-field">{t("Reason for reversal")}<textarea rows={3} maxLength={500} value={reverseReason} onChange={event => setReverseReason(event.target.value)} placeholder={t("Enter the reason and reference for this reversal")} /></label>
        <div className="fees-card-actions"><button type="button" className="fees-button fees-button-danger" disabled={feeBusy || !feeSettingsReady || !reverseReason.trim()} onClick={reversePayment}>{feeBusy ? t("Reversing…") : t("Confirm reversal")}</button><button type="button" className="fees-button fees-button-light" onClick={() => setReverseTarget(null)}>{t("Cancel")}</button></div>
      </section>
    </div>}
    </>
  );
}
