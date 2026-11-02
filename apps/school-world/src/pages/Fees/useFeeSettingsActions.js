import { plainDate } from "./feeReportUtils.js";

export default function useFeeSettingsActions({ feeTypes, feeSettingsReady, feeSettings, setFeeSettings, editingLateFeeId, setEditingLateFeeId, lateFeeDraft, setLateFeeDraft, notify }) {
  function resetLateFeeDraft() {
    setLateFeeDraft({ feeType: feeTypes[0] || "Tuition Fee", period: "Per Day", chargeType: "Flat", amount: "", percentage: "0", fromDate: "", toDate: "" });
    setEditingLateFeeId("");
  }
  function saveLateFeeRule() {
    if (!feeSettingsReady) { notify("Fee configuration is not available. Refresh the page before editing late-fee rules."); return; }
    const value = editingLateFeeId ? feeSettings.lateFeeCharges.find(item => String(item.id) === String(editingLateFeeId)) : null;
    const amount = Number(lateFeeDraft.amount || 0);
    const percentage = Number(lateFeeDraft.percentage || 0);
    if (!String(lateFeeDraft.feeType || "").trim() || (lateFeeDraft.chargeType === "Flat" && (!Number.isFinite(amount) || amount <= 0)) || (lateFeeDraft.chargeType === "Percentage" && (!Number.isFinite(percentage) || percentage <= 0))) {
      notify("Enter a fee type and a positive flat amount or percentage.");
      return;
    }
    if (lateFeeDraft.fromDate && lateFeeDraft.toDate && lateFeeDraft.toDate < lateFeeDraft.fromDate) {
      notify("The late-fee end date must be on or after the start date.");
      return;
    }
    const rule = {
      id: editingLateFeeId || String(Date.now()),
      feeType: lateFeeDraft.feeType.trim(),
      period: lateFeeDraft.period,
      chargeType: lateFeeDraft.chargeType,
      amount: amount,
      percentage: percentage,
      fromDate: lateFeeDraft.fromDate,
      toDate: lateFeeDraft.toDate
    };
    setFeeSettings(previous => ({
      ...previous,
      lateFeeCharges: editingLateFeeId ? previous.lateFeeCharges.map(item => String(item.id) === String(editingLateFeeId) ? rule : item) : [...previous.lateFeeCharges, rule]
    }));
    resetLateFeeDraft();
    notify(value ? "Late-fee rule updated." : "Late-fee rule saved.");
  }
  function editLateFeeRule(rule) {
    setEditingLateFeeId(String(rule.id));
    setLateFeeDraft({
      feeType: rule.feeType || "",
      period: rule.period || "Per Day",
      chargeType: rule.chargeType || "Flat",
      amount: String(rule.amount ?? ""),
      percentage: String(rule.percentage ?? 0),
      fromDate: plainDate(rule.fromDate),
      toDate: plainDate(rule.toDate)
    });
  }
  function removeLateFeeRule(rule) {
    if (!feeSettingsReady) { notify("Fee configuration is not available. Refresh the page before deleting a late-fee rule."); return; }
    if (!window.confirm("Delete the late-fee rule for " + rule.feeType + "?")) return;
    setFeeSettings(previous => ({ ...previous, lateFeeCharges: previous.lateFeeCharges.filter(item => String(item.id) !== String(rule.id)) }));
    notify("Late-fee rule removed.");
  }

  return { resetLateFeeDraft, saveLateFeeRule, editLateFeeRule, removeLateFeeRule };
}
