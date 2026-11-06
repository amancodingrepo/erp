import React from "react";
import { money, plainDate } from "./feeReportUtils.js";
import { moneyLabel } from "../../school-locale.js";

export default function FeesLateChargesSection({ context }) {
  const { t, feeSettingsReady, feeSettingsLoaded, editingLateFeeId, lateFeeDraft, setLateFeeDraft, feeTypes, saveLateFeeRule, resetLateFeeDraft, lateFeeCharges, editLateFeeRule, removeLateFeeRule } = context;
  return (
    <div className="fees-two-column">
      {!feeSettingsReady && <div className="fees-settings-warning">{feeSettingsLoaded ? t("Fee configuration could not be loaded. Refresh the page before changing rules.") : t("Loading fee configuration…")}</div>}
      <section className="fees-card">
        <div className="fees-card-heading"><div><h3>{t(editingLateFeeId ? "Edit Late Fee Charge" : "Add Late Fee Charges")}</h3><p>{t("Save late-fee rule settings by fee type, period and effective dates.")}</p></div></div>
        <div className="fees-form-grid">
          <label>{t("Fee Type")}<input list="fees-fee-type-options" value={lateFeeDraft.feeType} onChange={event => setLateFeeDraft(previous => ({ ...previous, feeType: event.target.value }))} placeholder={t("Tuition Fee")} /><datalist id="fees-fee-type-options">{feeTypes.map(type => <option key={type} value={type} />)}</datalist></label>
          <label>{t("Period")}<select value={lateFeeDraft.period} onChange={event => setLateFeeDraft(previous => ({ ...previous, period: event.target.value }))}><option>One Time</option><option>Per Day</option><option>Per Month</option></select></label>
          <label>{t("Charge Type")}<select value={lateFeeDraft.chargeType} onChange={event => setLateFeeDraft(previous => ({ ...previous, chargeType: event.target.value }))}><option>Flat</option><option>Percentage</option></select></label>
          {lateFeeDraft.chargeType === "Flat" ? <label>{moneyLabel(t("Amount"))}<input type="number" min="0.01" step="0.01" value={lateFeeDraft.amount} onChange={event => setLateFeeDraft(previous => ({ ...previous, amount: event.target.value }))} /></label> : <label>{t("Percentage (%)")}<input type="number" min="0.01" max="100" step="0.01" value={lateFeeDraft.percentage} onChange={event => setLateFeeDraft(previous => ({ ...previous, percentage: event.target.value }))} /></label>}
          <label>{t("From Date")}<input type="date" value={lateFeeDraft.fromDate} onChange={event => setLateFeeDraft(previous => ({ ...previous, fromDate: event.target.value }))} /></label>
          <label>{t("To Date")}<input type="date" min={lateFeeDraft.fromDate || undefined} value={lateFeeDraft.toDate} onChange={event => setLateFeeDraft(previous => ({ ...previous, toDate: event.target.value }))} /></label>
        </div>
        <div className="fees-card-actions"><button type="button" className="fees-button fees-button-primary" disabled={!feeSettingsReady} onClick={saveLateFeeRule}>{t(editingLateFeeId ? "Save changes" : "Add late-fee rule")}</button>{editingLateFeeId && <button type="button" className="fees-button fees-button-light" onClick={resetLateFeeDraft}>{t("Cancel edit")}</button>}</div>
        <p className="fees-footnote">{t("These rules are saved as configuration. They do not automatically change existing fee balances; late charges should be verified before posting to the fee ledger.")}</p>
      </section>
      <section className="fees-card">
        <div className="fees-card-heading"><div><h3>{t("Late Fee Charges")}</h3><p>{t("Saved charge rules")}</p></div><span className="fees-count-pill">{lateFeeCharges.length}</span></div>
        <div className="fees-table-scroll"><table className="fees-table"><thead><tr><th>{t("Fee Type")}</th><th>{t("Period")}</th><th>{t("Charge Type")}</th><th>{t("Amount / %")}</th><th>{t("Effective Dates")}</th><th>{t("Actions")}</th></tr></thead><tbody>
          {lateFeeCharges.map(rule => <tr key={rule.id}><td>{rule.feeType}</td><td>{rule.period}</td><td>{rule.chargeType}</td><td>{rule.chargeType === "Percentage" ? Number(rule.percentage || 0) + "%" : money(rule.amount)}</td><td>{plainDate(rule.fromDate) || "—"} – {plainDate(rule.toDate) || "—"}</td><td><div className="fees-row-actions"><button type="button" className="fees-link-button" onClick={() => editLateFeeRule(rule)}>{t("Edit")}</button><button type="button" className="fees-link-button danger" onClick={() => removeLateFeeRule(rule)}>{t("Delete")}</button></div></td></tr>)}
        </tbody></table>{!lateFeeCharges.length && <div className="fees-empty">{t("No late-fee rules saved yet.")}</div>}</div>
      </section>
    </div>
  );
}
