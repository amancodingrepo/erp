import React, { useMemo } from "react";
import { Save } from "lucide-react";
import { academicYearOptions } from "../../school-options.js";
import { getFeeInstallmentName } from "./studentEditUtils.js";

export default function StudentFeeSummaryTab({ context }) {
  const { t, data, update, studentFeeTotals, formatFeeMoney, feesLoading, feeRecords, exportFeeCsv } = context;
  const installmentSummaries = useMemo(() => {
    const matchingRecords = feeRecords.filter(fee => !fee.academicYear || fee.academicYear === data.academicYear);
    const groups = new Map();
    matchingRecords.forEach(fee => {
      const installmentName = getFeeInstallmentName(fee);
      if (!groups.has(installmentName)) {
        groups.set(installmentName, { installmentName, feeTypes: [], total: 0, paid: 0, discount: 0, dueDates: [] });
      }
      const group = groups.get(installmentName);
      const templateItems = Array.isArray(fee.metadata?.templateFeeItems) ? fee.metadata.templateFeeItems : [];
      const names = templateItems.map(item => String(item?.name || "").trim()).filter(Boolean);
      if (!names.length && String(fee.feeName || "").trim()) names.push(String(fee.feeName).trim());
      names.forEach(name => { if (!group.feeTypes.includes(name)) group.feeTypes.push(name); });
      group.total += Number(fee.amount || 0);
      group.paid += Number(fee.amountPaid || 0);
      group.discount += Number(fee.metadata?.discountAmount ?? fee.metadata?.discount ?? fee.discountAmount ?? fee.discount ?? 0);
      if (fee.dueDate) {
        const dueDate = String(fee.dueDate).slice(0, 10);
        if (!group.dueDates.includes(dueDate)) group.dueDates.push(dueDate);
      }
    });
    return [...groups.values()].map(group => {
      const sortedDueDates = group.dueDates.sort();
      return {
        ...group,
        total: Math.round(group.total * 100) / 100,
        paid: Math.round(group.paid * 100) / 100,
        discount: Math.round(group.discount * 100) / 100,
        unpaid: Math.max(0, Math.round((group.total - group.paid) * 100) / 100),
        firstDueDate: sortedDueDates[0] || "",
        dueDates: sortedDueDates.join(", ")
      };
    }).sort((a, b) => {
      if (a.firstDueDate && b.firstDueDate && a.firstDueDate !== b.firstDueDate) return a.firstDueDate.localeCompare(b.firstDueDate);
      if (a.firstDueDate && !b.firstDueDate) return -1;
      if (!a.firstDueDate && b.firstDueDate) return 1;
      return a.installmentName.localeCompare(b.installmentName, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [feeRecords, data.academicYear]);

  return (
    <>
      <div className="fee-totals compact">
        <div><span>{t("Academic Year")}</span><select value={data.academicYear} onChange={e => update("academicYear", e.target.value)}>{academicYearOptions(data.academicYear).map(year => <option key={year} value={year}>{year}</option>)}</select></div>
        <div><span>{t("Total Fees")}</span><strong>{formatFeeMoney(studentFeeTotals.total)}</strong></div>
        <div><span>{t("Total Paid Fees")}</span><strong>{formatFeeMoney(studentFeeTotals.paid)}</strong></div>
        <div><span>{t("Total Unpaid Fees")}</span><strong>{formatFeeMoney(studentFeeTotals.unpaid)}</strong></div>
      </div>
      <div className="legacy-table-wrap student-installment-summary-wrap">
        <table className="legacy-table student-installment-summary-table">
          <thead><tr>{["Installment", "Fee Type", "Total Amount", "Due Date", "Discount", "Paid Amount", "Unpaid Amount"].map(h => <th key={h}>{t(h)}</th>)}</tr></thead>
          <tbody>
            {feesLoading ? <tr><td colSpan="7" className="legacy-empty-row">{t("Loading fee records…")}</td></tr> :
              installmentSummaries.length ? installmentSummaries.map(group => <tr key={group.installmentName}>
                <td className="student-installment-summary-name">{group.installmentName}</td>
                <td className="student-installment-summary-fees">{group.feeTypes.join(", ") || "—"}</td>
                <td>{formatFeeMoney(group.total)}</td>
                <td>{group.dueDates || "—"}</td>
                <td>{formatFeeMoney(group.discount)}</td>
                <td>{formatFeeMoney(group.paid)}</td>
                <td>{formatFeeMoney(group.unpaid)}</td>
              </tr>) : <tr><td colSpan="7" className="legacy-empty-row">{t("No fee records are saved for this academic year.")}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="legacy-tab-footer"><button className="legacy-save" onClick={exportFeeCsv} disabled={!feeRecords.length}><Save size={15}/>{t("Export fee summary")}</button></div>
    </>
  );
}
