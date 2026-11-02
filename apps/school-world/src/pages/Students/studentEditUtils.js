export function groupStudentFeeInstallments(rows) {
  const groups = new Map();
  rows.forEach(fee => {
    const metadata = fee.metadata || {};
    const templateId = String(metadata.feeTemplateId || "");
    const installmentName = String(metadata.installmentName || metadata.templateFeeItems?.[0]?.originalInstallment || "");
    const dueDate = String(fee.dueDate || "").slice(0, 10);
    const key = templateId
      ? ["template", fee.studentCode || fee.studentId || "", templateId, fee.academicYear || "", installmentName, dueDate].join("|")
      : "record|" + String(fee.id);
    if (!groups.has(key)) {
      groups.set(key, { ...fee, groupedRecords: [fee], amount: Number(fee.amount || 0), amountPaid: Number(fee.amountPaid || 0), subAmount: Number(metadata.subAmount ?? fee.amount ?? 0), discount: Number(metadata.discount || 0), lateFeeCharges: Number(metadata.lateFeeCharges || 0) });
    } else {
      const group = groups.get(key);
      group.groupedRecords.push(fee);
      group.amount += Number(fee.amount || 0);
      group.amountPaid += Number(fee.amountPaid || 0);
      group.subAmount += Number(metadata.subAmount ?? fee.amount ?? 0);
      group.discount += Number(metadata.discount || 0);
      group.lateFeeCharges += Number(metadata.lateFeeCharges || 0);
    }
  });
  return [...groups.values()].map(group => {
    const records = group.groupedRecords;
    const names = [...new Set(records.map(record => {
      const firstItem = Array.isArray(record.metadata?.templateFeeItems) ? record.metadata.templateFeeItems[0] : null;
      return firstItem?.name || record.feeName || "";
    }).filter(Boolean))];
    const refs = [...new Set(records.map(record => String(record.metadata?.notes || record.reference || "").trim()).filter(Boolean))];
    const paidDates = [...new Set(records.map(record => record.paidAt ? String(record.paidAt).slice(0, 10) : "").filter(Boolean))];
    group.amount = Math.round(group.amount * 100) / 100;
    group.amountPaid = Math.round(group.amountPaid * 100) / 100;
    group.subAmount = Math.round(group.subAmount * 100) / 100;
    group.discount = Math.round(group.discount * 100) / 100;
    group.lateFeeCharges = Math.round(group.lateFeeCharges * 100) / 100;
    group.notes = refs.join(" · ");
    group.paidAt = paidDates.sort().at(-1) || "";
    if (group.metadata?.feeTemplateId) group.feeName = names.join(", ");
    group.status = group.amount > 0 && group.amountPaid >= group.amount ? "Paid" : group.amountPaid > 0 ? "Partially Paid" : "Unpaid";
    return group;
  });
}

export function getFeeInstallmentName(fee) {
  if (!fee) return "Single Installment";
  const records = Array.isArray(fee.groupedRecords) && fee.groupedRecords.length ? fee.groupedRecords : [fee];
  // Match the database/API grouping rule: metadata.installmentName is the canonical field.
  // templateFeeItems.originalInstallment is only a fallback for older records without it.
  const storedNames = [...new Set(records.map(record => {
    const metadata = record?.metadata || {};
    const installmentName = String(metadata.installmentName || "").trim();
    if (installmentName) return installmentName;
    const items = Array.isArray(metadata.templateFeeItems) ? metadata.templateFeeItems : [];
    return String(items.map(item => item?.originalInstallment).find(Boolean) || "").trim();
  }).filter(Boolean))];
  if (storedNames.length) return storedNames.join(", ");
  const dueDate = records.find(record => record?.dueDate)?.dueDate;
  if (dueDate) {
    const date = new Date(String(dueDate).slice(0, 10) + "T00:00:00");
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-IN", { month: "long" });
  }
  return "Single Installment";
}

export function calculateFeeTotalWithLateCharges(fee, lateFeeValue) {
  const metadata = fee.metadata || {};
  const lateFee = Math.max(0, Number(lateFeeValue || 0));
  if (metadata.subAmount !== undefined) {
    return Math.round((Number(metadata.subAmount || 0) - Number(metadata.discount || 0) + Number(metadata.appliedTaxes || 0) + lateFee) * 100) / 100;
  }
  return Math.round((Number(fee.amount || 0) - Number(metadata.lateFeeCharges || 0) + lateFee) * 100) / 100;
}
export function localDateInputValue() {
  const now = new Date();
  return String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}
export function htmlEscape(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
