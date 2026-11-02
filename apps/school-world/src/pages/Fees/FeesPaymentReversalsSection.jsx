import React from "react";
import { money } from "./feeReportUtils.js";

export default function FeesPaymentReversalsSection({ context }) {
  const { t, feeSettingsReady, feeSettingsLoaded, reverseSearch, setReverseSearch, reverseMatches, setReverseTarget, setReverseReason, reversals } = context;
  return (
    <>
      {!feeSettingsReady && <div className="fees-settings-warning">{feeSettingsLoaded ? t("Reversal history could not be loaded. Refresh the page before reversing a payment.") : t("Loading fee configuration…")}</div>}
      <section className="fees-card">
      <div className="fees-card-heading"><div><h3>{t("Reverse the Payment")}</h3><p>{t("Search paid fee records and reverse the recorded paid amount with a reason and audit entry.")}</p></div></div>
      <div className="fees-reverse-search"><label>{t("Search payments by student, ID, fee or reference")}<input value={reverseSearch} onChange={event => setReverseSearch(event.target.value)} placeholder={t("Student name, student ID, fee type or payment reference")} /></label><span>{reverseMatches.length} {t("paid record(s)")}</span></div>
      <div className="fees-table-scroll"><table className="fees-table"><thead><tr><th>{t("Student")}</th><th>{t("Class")}</th><th>{t("Fee")}</th><th>{t("Academic Year")}</th><th>{t("Paid Amount")}</th><th>{t("Payment Date")}</th><th>{t("Reference")}</th><th>{t("Action")}</th></tr></thead><tbody>
        {reverseMatches.map(fee => <tr key={fee.id}><td><strong>{fee.studentName}</strong><small>{fee.studentCode}</small></td><td>{fee.className || "—"}</td><td>{fee.feeName}</td><td>{fee.academicYear}</td><td className="fees-money">{money(fee.amountPaid)}</td><td>{fee.paidDate || "—"}</td><td>{fee.reference || "—"}</td><td><button type="button" className="fees-button fees-button-danger" onClick={() => { setReverseTarget(fee); setReverseReason(""); }}>{t("Reverse Payment")}</button></td></tr>)}
      </tbody></table>{!reverseMatches.length && <div className="fees-empty">{t("No paid records match this search.")}</div>}</div>
      <div className="fees-card-heading fees-reversal-history-heading"><div><h3>{t("Reversal History")}</h3><p>{t("Recorded reversals remain listed here for review.")}</p></div><span className="fees-count-pill">{reversals.length}</span></div>
      <div className="fees-table-scroll"><table className="fees-table"><thead><tr><th>{t("Reversed At")}</th><th>{t("Student")}</th><th>{t("Fee Type")}</th><th>{t("Amount Reversed")}</th><th>{t("Reference")}</th><th>{t("Reason")}</th></tr></thead><tbody>
        {reversals.map(item => <tr key={item.id}><td>{item.reversedAt ? new Date(item.reversedAt).toLocaleString("en-IN") : "—"}</td><td><strong>{item.studentName}</strong><small>{item.studentCode}</small></td><td>{item.feeName}</td><td className="fees-money">{money(item.amountReversed)}</td><td>{item.reference || "—"}</td><td>{item.reason}</td></tr>)}
      </tbody></table>{!reversals.length && <div className="fees-empty">{t("No payment reversals have been recorded.")}</div>}</div>
      </section>
    </>
  );
}
