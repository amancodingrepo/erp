import React from "react";
import { LoaderCircle, X } from "lucide-react";
import { calculateFeeTotalWithLateCharges, getFeeInstallmentName } from "./studentEditUtils.js";

export default function FeePaymentDialog({ context }) {
  const { paymentTarget, setPaymentTarget, paymentBusy, student, shortName, t, paymentMethod, setPaymentMethod, paymentDate, setPaymentDate, paymentCashDepositNumber, setPaymentCashDepositNumber, paymentNotes, setPaymentNotes, installmentRecords, formatFeeMoney, paymentDrafts, setPaymentDrafts, updatePaymentLateFee, submitInstallmentPayment } = context;
  const hasOutstandingBalance = Boolean(paymentTarget) && installmentRecords(paymentTarget).some(record => {
    const draft = paymentDrafts[String(record.id)] || {};
    const lateFee = draft.lateFeeCharges === "" ? 0 : Number(draft.lateFeeCharges ?? record.metadata?.lateFeeCharges ?? 0);
    return Number(record.amountPaid || 0) < calculateFeeTotalWithLateCharges(record, lateFee) - 0.001;
  });
  return (
    paymentTarget && <div className="legacy-modal-backdrop fee-payment-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !paymentBusy) setPaymentTarget(null); }}>
        <section className="legacy-modal fee-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="fee-payment-dialog-title" onMouseDown={event => event.stopPropagation()}>
          <div className="legacy-modal-head"><div><h2 id="fee-payment-dialog-title">{t("Pay fees")}</h2><p>{student.name || shortName} · {student.id} · {getFeeInstallmentName(paymentTarget)}</p></div><button type="button" disabled={paymentBusy} onClick={() => setPaymentTarget(null)}><X size={18}/></button></div>
          <div className="fee-payment-dialog-content">
            <div className="fee-payment-fields">
              <label>{t("Payment Method")}<select value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value)} disabled={paymentBusy}>{["Cash","Cheque","Online","Card","Bank Transfer","UPI"].map(method=><option key={method} value={method}>{t(method)}</option>)}</select></label>
              <label>{t("Paid Date")}<input type="date" value={paymentDate} onChange={event=>setPaymentDate(event.target.value)} disabled={paymentBusy}/></label>
              <label>{t("Cash Deposit Number")}<input value={paymentCashDepositNumber} onChange={event=>setPaymentCashDepositNumber(event.target.value)} placeholder={t("Cash Deposit Number")} disabled={paymentBusy}/></label>
              <label>{t("Notes")}<input value={paymentNotes} onChange={event=>setPaymentNotes(event.target.value)} placeholder={t("Notes")} disabled={paymentBusy}/></label>
            </div>
            <section className="fee-payment-breakup"><h3>{t("Late Fees Breakup")}</h3>
              <table className="legacy-table"><thead><tr><th>{t("Fee Type")}</th><th>{t("Amount")}</th><th>{t("Late Fees")}</th></tr></thead><tbody>
                {installmentRecords(paymentTarget).map(record=>{
                  const draft=paymentDrafts[String(record.id)]||{};
                  const lateFee=draft.lateFeeCharges===""?0:Number(draft.lateFeeCharges??record.metadata?.lateFeeCharges??0);
                  const total=calculateFeeTotalWithLateCharges(record,lateFee);
                  const paid=Number(record.amountPaid||0)>=total-0.001;
                  return <tr key={record.id} className={paid?"fee-payment-paid-row":undefined} title={paid?t("Fully paid — locked"):undefined}><td>{record.metadata?.templateFeeItems?.[0]?.name || record.feeName}</td><td>₹{formatFeeMoney(record.amount)}</td><td><input className="fee-payment-number" type="number" min="0" step="0.01" value={draft.lateFeeCharges ?? "0"} onChange={event=>updatePaymentLateFee(record,event.target.value)} disabled={paymentBusy||paid}/></td></tr>;
                })}
              </tbody></table>
            </section>
            <section className="fee-payment-line-items"><h3>{t("Fee installment details")}</h3>
              <table className="legacy-table"><thead><tr><th>{t("Installment")}</th><th>{t("Fee Type")}</th><th>{t("Sub Amount")}</th><th>{t("Total Amount")}</th><th>{t("Amount to Pay")}</th></tr></thead><tbody>
                {installmentRecords(paymentTarget).map(record=>{
                  const draft=paymentDrafts[String(record.id)]||{};
                  const lateFee=draft.lateFeeCharges===""?0:Number(draft.lateFeeCharges??record.metadata?.lateFeeCharges??0);
                  const total=calculateFeeTotalWithLateCharges(record,lateFee);
                  const paid=Number(record.amountPaid||0)>=total-0.001;
                  return <tr key={record.id} className={paid?"fee-payment-paid-row":undefined} title={paid?t("Fully paid — locked"):undefined}><td>{getFeeInstallmentName(record)}</td><td>{record.metadata?.templateFeeItems?.[0]?.name || record.feeName}</td><td>₹{formatFeeMoney(record.metadata?.subAmount ?? record.amount)}</td><td>₹{formatFeeMoney(total)}</td><td><input className="fee-payment-number" type="number" min="0" step="0.01" max={Math.max(0,total-Number(record.amountPaid||0))} value={paid?"0":draft.amountToPay ?? "0"} onChange={event=>setPaymentDrafts(previous=>({...previous,[String(record.id)]:{...(previous[String(record.id)]||{}),amountToPay:event.target.value}}))} disabled={paymentBusy||paid}/></td></tr>;
                })}
              </tbody></table>
            </section>
            {(() => {
              const records=installmentRecords(paymentTarget);
              const totalAmount=records.reduce((sum,record)=>sum+calculateFeeTotalWithLateCharges(record,paymentDrafts[String(record.id)]?.lateFeeCharges ?? record.metadata?.lateFeeCharges ?? 0),0);
              const amountToPay=records.reduce((sum,record)=>sum+Number(paymentDrafts[String(record.id)]?.amountToPay||0),0);
              return <div className="fee-payment-totals"><label>{t("Total Amount")}<input readOnly value={formatFeeMoney(totalAmount)}/></label><label>{t("Amount to Pay")}<input readOnly value={formatFeeMoney(amountToPay)}/></label></div>;
            })()}
          </div>
          <div className="legacy-modal-actions fee-payment-dialog-actions"><button type="button" className="plain-button" onClick={()=>setPaymentTarget(null)} disabled={paymentBusy}>{t("Close")}</button><button type="button" className="legacy-save" onClick={()=>submitInstallmentPayment(false)} disabled={paymentBusy||!hasOutstandingBalance}>{paymentBusy?t("Saving…"):t("Pay")}</button><button type="button" className="legacy-save" onClick={()=>submitInstallmentPayment(true)} disabled={paymentBusy||!hasOutstandingBalance}>{paymentBusy?t("Saving…"):t("Pay & Print")}</button></div>
        </section>
      </div>
  );
}
