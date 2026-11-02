import React from "react";
import { X } from "lucide-react";
import { receiptDateLabel, receiptMoney } from "../Templates/FeeReceipt/feeReceiptPdf.js";

export default function PaymentDetailsDialog({ context }) {
  const { viewInstallmentTarget, setViewInstallmentTarget, student, shortName, paymentDetailsLoading, t, feeRecords, feeMutationBusyId, reverseFeePayment } = context;
  return (
    viewInstallmentTarget && <div className="legacy-modal-backdrop fee-payment-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setViewInstallmentTarget(null);}}>
        <section className="legacy-modal fee-view-installment-dialog" role="dialog" aria-modal="true" aria-labelledby="fee-view-installment-title" onMouseDown={event=>event.stopPropagation()}>
          <div className="legacy-modal-head"><div><h2 id="fee-view-installment-title">{t("Check Payment Details")}</h2><p>{viewInstallmentTarget.student?.name || student.name || shortName} · {viewInstallmentTarget.student?.id || student.id}</p></div><button type="button" onClick={()=>setViewInstallmentTarget(null)}><X size={18}/></button></div>
          {viewInstallmentTarget.loading || paymentDetailsLoading ? <div className="fee-edit-installment-content"><p>{t("Loading payment details from the database…")}</p></div> : <>
            <div className="fee-edit-installment-content">
              <div className="fee-receipt-db-header">
                {viewInstallmentTarget.school?.logo && <img src={viewInstallmentTarget.school.logo} alt={t("School logo loaded from school settings")} />}
                <div><strong>{viewInstallmentTarget.school?.name || ""}</strong>
                  {viewInstallmentTarget.school?.address && <span>{viewInstallmentTarget.school.address}</span>}
                  {viewInstallmentTarget.school?.phone && <span>{t("Ph.")} {viewInstallmentTarget.school.phone}</span>}
                  {viewInstallmentTarget.school?.email && <span>{viewInstallmentTarget.school.email}</span>}
                </div>
              </div>
              <div className="fee-receipt-db-metadata"><strong>{t("Receipt Number")}: {viewInstallmentTarget.receiptNumber || "—"}</strong><span>{t("Date")}: {receiptDateLabel(viewInstallmentTarget.receiptDate)}</span></div>
              <table className="legacy-table fee-receipt-student-table"><tbody>
                {[["Student Name",viewInstallmentTarget.student?.name],["Mother Name",viewInstallmentTarget.student?.motherName],["Father Name",viewInstallmentTarget.student?.fatherName],["Class",[viewInstallmentTarget.student?.className,viewInstallmentTarget.student?.section].filter(Boolean).join(" ")],["Student ID",viewInstallmentTarget.student?.id],["Paid Date",receiptDateLabel(viewInstallmentTarget.paymentDate || viewInstallmentTarget.receiptDate)],["Parent / Guardian",viewInstallmentTarget.student?.parentName],["Notes",viewInstallmentTarget.notes]].map(([label,value])=><tr key={label}><th>{t(label)}</th><td>{value || "—"}</td></tr>)}
              </tbody></table>
              <div className="fee-receipt-payment-heading"><strong>{t("Payment Details")}</strong><span>{t("Academic Year")}: {viewInstallmentTarget.student?.academicYear || "—"}</span></div>
              <table className="legacy-table fee-receipt-payment-table"><thead><tr><th>{t("Installment")}</th><th>{t("Type of Fees")}</th><th>{t("Amount Paid")}</th><th>{t("Paid Date")}</th><th>{t("Payment Method")}</th><th>{t("Reference")}</th><th>{t("Action")}</th></tr></thead><tbody>
                {(viewInstallmentTarget.records || []).map(record=>{
                  const original=feeRecords.find(item=>String(item.id)===String(record.id));
                  return <tr key={record.id}>
                    <td>{record.installment || "—"}</td><td>{record.feeName || "—"}</td><td>INR {receiptMoney(record.amountPaidThisReceipt ?? record.amountPaid)}</td>
                    <td>{receiptDateLabel(record.paidAt || viewInstallmentTarget.paymentDate)}</td><td>{record.paymentMethod || viewInstallmentTarget.paymentMethod || "—"}</td><td>{record.reference || viewInstallmentTarget.reference || "—"}</td>
                    <td>{original && Number(original.amountPaid||0)>0 && <button type="button" className="small-icon-button" disabled={feeMutationBusyId===String(original.id)} onClick={async()=>{await reverseFeePayment(original);setViewInstallmentTarget(null);}}>{t("Reverse Payment")}</button>}</td>
                  </tr>;
                })}
              </tbody></table>
              <div className="fee-receipt-total-line"><strong>{t("Total Amount Received")}</strong><strong>INR {receiptMoney(viewInstallmentTarget.totalPaid)}</strong></div>
              <div className="fee-receipt-transaction-summary"><span>{t("Payment Method")}: {viewInstallmentTarget.paymentMethod || "—"}</span><span>{t("Reference / Deposit Number")}: {viewInstallmentTarget.reference || "—"}</span></div>
            </div>
            <div className="legacy-modal-actions"><button type="button" className="legacy-save" onClick={()=>setViewInstallmentTarget(null)}>{t("Close")}</button></div>
          </>}
        </section>
      </div>
  );
}
