import { apiPost, apiPatch, apiDelete } from "../../api.js";
import { plainDate } from "./feeReportUtils.js";

export default function useFeeRecordActions({ feeDraft, setFeeDraft, setFeeBusy, notify, studentByCode, setFeeRecords, setShowAddForm, editDraft, editingFee, setEditingFee, setReverseSearch, setView, onOpenStudent }) {
  async function addFeeRecord() {
    const amount = Number(feeDraft.amount);
    const amountPaid = Number(feeDraft.amountPaid || 0);
    if (!feeDraft.studentCode || !feeDraft.feeName.trim() || feeDraft.amount === "" || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > amount) {
      notify("Choose a student and enter a valid fee amount. Paid amount cannot exceed total fees.");
      return;
    }
    setFeeBusy(true);
    try {
      const result = await apiPost("/fees", { ...feeDraft, amount, amountPaid });
      const student = studentByCode.get(String(feeDraft.studentCode)) || {};
      const newFee = {
        ...result.fee,
        studentCode: result.fee?.studentCode || feeDraft.studentCode,
        studentName: result.fee?.studentName || student.name || student.fullName || "Unknown student",
        className: result.fee?.className || student.className || student.class || ""
      };
      setFeeRecords(previous => [...previous, newFee].sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"))));
      setFeeDraft(previous => ({ ...previous, feeName: "Tuition Fee", amount: "", amountPaid: "0", dueDate: "", reference: "" }));
      setShowAddForm(false);
      notify("Fee record saved to the database.");
    } catch (error) {
      notify("Fee record could not be saved: " + error.message);
    } finally {
      setFeeBusy(false);
    }
  }
  async function markFeePaid(fee) {
    try {
      const result = await apiPatch("/fees/" + encodeURIComponent(fee.id), { amountPaid: fee.amount });
      setFeeRecords(previous => previous.map(row => row.id === fee.id ? { ...row, ...result.fee, studentName: row.studentName, studentCode: row.studentCode, className: row.className } : row));
      notify("Payment status updated in the database.");
    } catch (error) {
      notify("Payment update failed: " + error.message);
    }
  }
  function beginEditFee(fee) {
    setEditingFee(fee);
    setEditDraft({ amount: String(fee.amount ?? ""), amountPaid: String(fee.amountPaid ?? 0), dueDate: plainDate(fee.dueDate), reference: String(fee.reference || "") });
  }
  async function saveEditedFee() {
    if (!editingFee) return;
    const amount = Number(editDraft.amount);
    const amountPaid = Number(editDraft.amountPaid);
    if (amountPaid < Number(editingFee.amountPaid || 0)) { notify("Recorded payments cannot be reduced directly. Use Reverse Payment so the reversal is audited."); return; }
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > amount) {
      notify("Paid amount must be between zero and the total fee amount.");
      return;
    }
    setFeeBusy(true);
    try {
      const result = await apiPatch("/fees/" + encodeURIComponent(editingFee.id), { amount, amountPaid, dueDate: editDraft.dueDate || null, reference: editDraft.reference });
      setFeeRecords(previous => previous.map(row => row.id === editingFee.id ? { ...row, ...result.fee, studentName: row.studentName, studentCode: row.studentCode, className: row.className } : row));
      setEditingFee(null);
      notify("Fee record updated.");
    } catch (error) {
      notify("Fee record could not be updated: " + error.message);
    } finally {
      setFeeBusy(false);
    }
  }
  async function removeFeeRecord(fee) {
    if (fee.metadata?.feeTemplateId) {
      const student = studentByCode.get(String(fee.studentCode));
      if (student && onOpenStudent) onOpenStudent(student, "Fees");
      else notify("This fee came from a template. Open the student's Fees tab to reverse any payments and remove the template assignment.");
      return;
    }
    if (Number(fee.amountPaid || 0) > 0) {
      setReverseSearch(String(fee.studentCode || fee.studentName || ""));
      setView("reverse-payment");
      notify("Reverse the recorded payment first. You can delete the unpaid fee row after the reversal.");
      return;
    }
    if (!window.confirm("Delete the fee record for " + fee.studentName + " - " + fee.feeName + "?")) return;
    try {
      await apiDelete("/fees/" + encodeURIComponent(fee.id));
      setFeeRecords(previous => previous.filter(row => row.id !== fee.id));
      notify("Fee record deleted from the database.");
    } catch (error) {
      notify("Fee record could not be deleted: " + error.message);
    }
  }

  return { addFeeRecord, markFeePaid, beginEditFee, saveEditedFee, removeFeeRecord };
}
