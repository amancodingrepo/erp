import { apiPost } from "../../api.js";

export default function useFeeReversalAction({ reverseTarget, feeSettingsReady, reverseReason, setReverseTarget, setReverseReason, setFeeBusy, setFeeRecords, setFeeSettings, notify }) {
  async function reversePayment() {
    if (!reverseTarget) return;
    if (!feeSettingsReady) { notify("Reversal history could not be loaded. Refresh the page before reversing a payment."); return; }
    const fee = reverseTarget;
    const amount = Number(fee.amountPaid || 0);
    if (amount <= 0) {
      notify("This fee record has no paid amount to reverse.");
      setReverseTarget(null);
      return;
    }
    if (!reverseReason.trim()) {
      notify("Enter a reason for reversing this payment.");
      return;
    }
    setFeeBusy(true);
    try {
      const result = await apiPost("/fees/" + encodeURIComponent(fee.id) + "/reverse-payment", { reason: reverseReason.trim() });
      const reversal = {
        id: String(Date.now()),
        feeId: String(fee.id),
        studentCode: fee.studentCode,
        studentName: fee.studentName,
        className: fee.className,
        academicYear: fee.academicYear,
        feeName: fee.feeName,
        amountReversed: amount,
        reference: fee.reference || "",
        reason: reverseReason.trim(),
        reversedAt: new Date().toISOString()
      };
      setFeeRecords(previous => previous.map(row => row.id === fee.id ? { ...row, ...result.fee, studentName: row.studentName, studentCode: row.studentCode, className: row.className } : row));
      setFeeSettings(previous => ({ ...previous, reversals: [reversal, ...(previous.reversals || [])].slice(0, 500) }));
      setReverseTarget(null);
      setReverseReason("");
      notify("The paid amount was reversed and the reversal was added to the audit history.");
    } catch (error) {
      notify("Payment reversal failed: " + error.message);
    } finally {
      setFeeBusy(false);
    }
  }

  return { reversePayment };
}
