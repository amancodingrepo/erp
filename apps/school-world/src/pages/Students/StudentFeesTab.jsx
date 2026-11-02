import React, { useMemo, useState } from "react";
import { Download, Eye, Pencil, Save, X } from "lucide-react";
import { Field } from "./StudentFormFields.jsx";
import { getFeeInstallmentName } from "./studentEditUtils.js";

export default function StudentFeesTab({ context }) {
  const { t, data, update, sendFeeReminder, feeReminderBusy, exportFeeCsv, studentFeeTotals, formatFeeMoney, currentTemplateAssignment, openApplyFeeTemplate, setFeeAction, notify, feesLoading, studentFeeInstallmentRows, templateHasPaidAmount, guideFeeCheckboxes, onFeeCheckboxSelected, guideTemplatePaymentButtons, onTemplatePaymentDetailsSelected, paymentBusy, feeMutationBusyId, openInstallmentPayment, openEditInstallment, deleteInstallment, receiptBusyId, downloadInstallmentReceipt, paymentDetailsLoading, openPaymentDetails, saving, save } = context;
  const notifyPersistent = message => notify(message, { persistent: true });
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState([]);
  const [receiptSearch, setReceiptSearch] = useState("");
  const visibleFeeRows = useMemo(() => {
    const query = receiptSearch.trim();
    if (!query) return studentFeeInstallmentRows;
    return studentFeeInstallmentRows.filter(fee => (fee.groupedRecords || [fee]).some(record => {
      const history = Array.isArray(record.metadata?.paymentHistory) ? record.metadata.paymentHistory : [];
      return history.some(payment => String(payment.receiptNumber || "").includes(query));
    }));
  }, [studentFeeInstallmentRows, receiptSearch]);
  return (
    <>

          <div className="fee-actions-bar">
            <Field label="Academic Year" className="fee-academic-year-field" value={data.academicYear} onChange={v => update("academicYear", v)} options={["2026-2027", "2025-2026", "2024-2025"]}/>
            <button type="button" onClick={sendFeeReminder} disabled={feeReminderBusy}>{t(feeReminderBusy ? "Sending reminder…" : "Fee Reminder")}</button>
            <button type="button" onClick={() => exportFeeCsv("paid")}>{t("Export Paid Fee Report")}</button>
            <button type="button" onClick={() => exportFeeCsv("due")}>{t("Export Due Fee Report")}</button>
            <button type="button" onClick={() => exportFeeCsv("all")}>{t("Export Fee Details")}</button>
          </div>
          <div className="fee-totals">
            <div><span>{t("Total Fees")}</span><input readOnly value={formatFeeMoney(studentFeeTotals.total)} aria-label={t("Total Fees from ledger")}/></div>
            <div><span>{t("Total Paid Fees")}</span><input readOnly value={formatFeeMoney(studentFeeTotals.paid)} aria-label={t("Total Paid Fees from ledger")}/></div>
            <div><span>{t("Total Unpaid Fees")}</span><input readOnly value={formatFeeMoney(studentFeeTotals.unpaid)} aria-label={t("Total Unpaid Fees from ledger")}/></div>
          </div>
          <div className="fee-action-buttons">
            {["Apply Fee Template", "Refund", "Add Fees Notes", "Pay Now", "Pay Partial", "Pay Amount"].map(action => (
              <button type="button" key={action} title={action === "Apply Fee Template" && currentTemplateAssignment ? t("Click to replace the existing unpaid template assignment. Reverse any recorded payments first.") : undefined} onClick={() => {
                if (action === "Apply Fee Template") { openApplyFeeTemplate(); return; }
                if (action === "Pay Now" || action === "Pay Partial") {
                  const outstandingRows = visibleFeeRows.filter(fee => Number(fee.amount || 0) - Number(fee.amountPaid || 0) > 0);
                  const selectedRows = outstandingRows.filter(fee => selectedInstallmentIds.includes(String((fee.groupedRecords || [fee])[0]?.id ?? fee.id)));
                  if (!outstandingRows.length) {
                    notifyPersistent("There are no installments with an outstanding balance to pay.");
                    return;
                  }
                  if (action === "Pay Partial") {
                    if (selectedRows.length > 1) {
                      notifyPersistent("For Pay Partial, select only one installment.");
                      return;
                    }
                    if (!selectedRows.length && outstandingRows.length > 1) {
                      notifyPersistent("Select the installment you want to pay using the checkbox at the start of its row.");
                      return;
                    }
                    const target = selectedRows[0] || outstandingRows[0];
                    if (!selectedRows.length) {
                      setSelectedInstallmentIds([String((target.groupedRecords || [target])[0]?.id ?? target.id)]);
                      notifyPersistent("Opening the only unpaid installment. Check the installment name and amount before recording payment.");
                    }
                    openInstallmentPayment(target);
                    return;
                  }
                  if (!selectedRows.length) {
                    notifyPersistent("Select one or more unpaid installments using the checkbox at the start of each row before clicking Pay Now.");
                    return;
                  }
                  const records = selectedRows.flatMap(fee => fee.groupedRecords || [fee]);
                  const target = { ...selectedRows[0], groupedRecords: records };
                  openInstallmentPayment(target);
                  return;
                }
                setFeeAction(action);
                notify(`${action}: choose a fee record to use this action.`);
              }}>{t(action)}</button>
            ))}
          </div>
          <div className="fee-receipt-search-row">
            <label htmlFor="fee-receipt-search">{t("Search by Receipt Number")}</label>
            <input id="fee-receipt-search" type="search" inputMode="numeric" value={receiptSearch} onChange={event => setReceiptSearch(event.target.value)} placeholder={t("Enter receipt number")} />
          </div>
          <div className="legacy-table-wrap">
            <table className="legacy-table fee-tab-ledger-table">
              <colgroup>{["2.5%","8%","13%","7%","6%","6.5%","8%","8%","8.5%","7%","6%","6.5%","12%"].map((width,index)=><col key={index} style={{width}} />)}</colgroup>
              <thead><tr>{["", "Installment", "Fee Type", "Sub Amount", "Discount", "Late Fee Charges", "Total Amount", "Total Payment Amount", "Notes", "Due Date", "Status", "Paid Date", "Action"].map(h => <th key={h}>{t(h)}</th>)}</tr></thead>
              <tbody>
                {feesLoading ? <tr><td colSpan="13" className="legacy-empty-row">{t("Loading fee records…")}</td></tr> :
                  visibleFeeRows.length ? visibleFeeRows.map(fee => {
                    const meta = fee.metadata || {};
                    const groupedRecords = fee.groupedRecords || [fee];
                    const amount = Number(fee.amount || 0);
                    const paid = Number(fee.amountPaid || 0);
                    const installment = getFeeInstallmentName(fee);
                    const isFullyPaid = amount > 0 && paid >= amount;
                    const status = isFullyPaid ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid";
                    const templateFee = Boolean(meta.feeTemplateId);
                    const linkedPayment = templateHasPaidAmount(fee);
                    const itemRows = groupedRecords.flatMap(record => (Array.isArray(record.metadata?.templateFeeItems) ? record.metadata.templateFeeItems : []).map((item, index) => ({ ...item, _key: String(record.id) + "-" + index })));
                    return <tr key={groupedRecords.map(record => record.id).join("-")} className={templateFee ? "template-installment-row" : ""}>
                      <td><span className={`fee-checkbox-guide-wrap${guideFeeCheckboxes && !isFullyPaid ? " is-guiding" : ""}`}><input type="checkbox" aria-label={`Select ${installment} installment for Pay Partial`} checked={!isFullyPaid && selectedInstallmentIds.includes(String(groupedRecords[0]?.id ?? fee.id))} disabled={isFullyPaid} title={isFullyPaid ? t("This installment is fully paid.") : undefined} onChange={event => { const id = String(groupedRecords[0]?.id ?? fee.id); setSelectedInstallmentIds(previous => event.target.checked ? [...new Set([...previous, id])] : previous.filter(value => value !== id)); if (event.target.checked) onFeeCheckboxSelected?.(); }}/></span></td>
                      <td>{installment}</td>
                      <td className="fee-tab-fee-types">{templateFee ? [...new Set(itemRows.map(item => item.name).filter(Boolean))].join(", ") || fee.feeName : fee.feeName}</td>
                      <td>{formatFeeMoney(fee.subAmount ?? amount)}</td>
                      <td>{formatFeeMoney(fee.discount ?? meta.discount ?? 0)}</td>
                      <td>{formatFeeMoney(fee.lateFeeCharges ?? meta.lateFeeCharges ?? 0)}</td>
                      <td>{formatFeeMoney(amount)}</td>
                      <td>{formatFeeMoney(paid)}</td>
                      <td>{fee.notes || meta.notes || fee.reference || "—"}</td>
                      <td>{fee.dueDate ? String(fee.dueDate).slice(0, 10) : "—"}</td>
                      <td>{status}</td>
                      <td>{fee.paidAt ? String(fee.paidAt).slice(0, 10) : "—"}</td>
                      <td><div className="fee-row-actions fee-tab-row-actions">
                        {Math.max(0, amount - paid) > 0 ? <>
                          <button type="button" className="small-icon-button fee-pay-partial-button" title={t("Partial Payment")} disabled={paymentBusy || feeMutationBusyId !== ""} onClick={() => openInstallmentPayment(fee)}>{t("Pay Partial")}</button>
                          {paid > 0 && <button type="button" className="fee-row-icon-action fee-receipt-download-action" title={t("Download fee receipt PDF")} aria-label={t("Download fee receipt PDF")} disabled={receiptBusyId===String(fee.id)} onClick={() => downloadInstallmentReceipt(fee)}><Download size={18}/></button>}
                          {templateFee && paid > 0 && <button type="button" className={`fee-row-icon-action${guideTemplatePaymentButtons ? " fee-template-reversal-guide-target" : ""}`} title={t("Check payment details and reverse the recorded payment")} aria-label={t("Check payment details and reverse the recorded payment")} disabled={paymentDetailsLoading || feeMutationBusyId !== ""} onClick={() => { onTemplatePaymentDetailsSelected?.(); openPaymentDetails(fee); }}><Eye size={16}/></button>}
                          <button type="button" className="fee-row-icon-action" title={t("Edit installment")} aria-label={t("Edit installment")} disabled={feeMutationBusyId !== ""} onClick={() => openEditInstallment(fee)}><Pencil size={14}/></button>
                          <button type="button" className="fee-row-icon-action fee-row-delete-action" title={paid > 0 ? t("Reverse payment before deleting this installment") : t("Delete installment")} aria-label={t("Delete installment")} disabled={paid > 0 || feeMutationBusyId !== ""} onClick={() => deleteInstallment(fee)}><X size={16}/></button>
                        </> : <>
                          <button type="button" className="fee-row-icon-action" title={t("Download receipt PDF")} aria-label={t("Download receipt PDF")} disabled={receiptBusyId===String(fee.id)} onClick={() => downloadInstallmentReceipt(fee)}><Download size={18}/></button>
                          <button type="button" className={`fee-row-icon-action${guideTemplatePaymentButtons && templateFee && paid > 0 ? " fee-template-reversal-guide-target" : ""}`} title={t(templateFee && paid > 0 ? "Check payment details and reverse the recorded payment" : "Check payment details")} aria-label={t(templateFee && paid > 0 ? "Check payment details and reverse the recorded payment" : "Check payment details")} disabled={paymentDetailsLoading} onClick={() => { if (templateFee && paid > 0) onTemplatePaymentDetailsSelected?.(); openPaymentDetails(fee); }}><Eye size={18}/></button>
                        </>}
                      </div></td>
                    </tr>;
                  }) : <tr><td colSpan="13" className="legacy-empty-row">{t(receiptSearch.trim() ? "No fee records match this receipt number." : "No fee records are saved for this student and academic year.")}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="legacy-tab-footer"><button type="button" className="legacy-save" onClick={() => save("Fees")} disabled={saving}><Save size={15}/>{t(saving ? "Saving…" : "Save")}</button></div>
        
    </>
  );
}
