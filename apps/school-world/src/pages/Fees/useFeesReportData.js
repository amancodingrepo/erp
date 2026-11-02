import { useMemo } from "react";
import { FEE_REPORT_TYPES, normalized, plainDate } from "./feeReportUtils.js";

export default function useFeesReportData({ feeRows, reportType, reportFilters, reportSort, reverseSearch, feeSettings }) {
  const selectedReport = FEE_REPORT_TYPES.find(report => report.key === reportType) || FEE_REPORT_TYPES[7];
  const reportRows = useMemo(() => {
    const paidReports = ["cheques", "fee-reports", "paid-admission", "receipts"].includes(reportType);
    const q = normalized(reportFilters.referenceSearch);
    return feeRows.filter(row => {
      if (reportFilters.academicYear && String(row.academicYear) !== reportFilters.academicYear) return false;
      if (reportFilters.className && String(row.className) !== reportFilters.className) return false;
      if (reportFilters.section && String(row.section) !== reportFilters.section) return false;
      if (reportFilters.feeType && String(row.feeName) !== reportFilters.feeType && !(Array.isArray(row.metadata?.templateFeeItems) && row.metadata.templateFeeItems.some(item => String(item.name) === reportFilters.feeType))) return false;
      if (reportFilters.hostel && normalized(row.hostelName) !== normalized(reportFilters.hostel)) return false;
      if (reportFilters.route && normalized(row.routeName) !== normalized(reportFilters.route)) return false;
      if (reportFilters.studentStatus && reportFilters.studentStatus !== "All" && normalized(row.studentStatus) !== normalized(reportFilters.studentStatus)) return false;
      if (q && ![row.reference, row.studentName, row.studentCode].some(value => normalized(value).includes(q))) return false;
      const rangeDate = paidReports ? (row.paidDate || plainDate(row.dueDate)) : (plainDate(row.dueDate) || row.paidDate);
      if (reportFilters.fromDate && (!rangeDate || rangeDate < reportFilters.fromDate)) return false;
      if (reportFilters.toDate && (!rangeDate || rangeDate > reportFilters.toDate)) return false;
      if (reportType === "cheques" && !(Number(row.amountPaid || 0) > 0 && String(row.reference || "").trim())) return false;
      if (["fee-reports", "receipts"].includes(reportType) && !(Number(row.amountPaid || 0) > 0)) return false;
      if (reportType === "due" && !(row.balance > 0)) return false;
      if (reportType === "payable" && !(row.balance > 0)) return false;
      if (reportType === "routewise" && !(row.balance > 0)) return false;
      if (reportType === "concession" && !(row.concessionAmount > 0 || /concession|discount|waiver|scholarship/i.test(String(row.feeName || "")) || (Array.isArray(row.metadata?.templateFeeItems) && row.metadata.templateFeeItems.some(item => Number(item.discountAmount || 0) > 0)))) return false;
      if (reportType === "paid-admission" && !(Number(row.amountPaid || 0) > 0)) return false;
      return true;
    }).sort((a, b) => {
      const first = a[reportSort] ?? "";
      const second = b[reportSort] ?? "";
      if (["amount", "amountPaid", "balance"].includes(reportSort)) return Number(first || 0) - Number(second || 0);
      return String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: "base" });
    }).map((row, index) => ({ ...row, serialNo: index + 1 }));
  }, [feeRows, reportType, reportFilters, reportSort]);

  const consolidatedRows = useMemo(() => {
    const grouped = new Map();
    reportRows.forEach(row => {
      const key = [row.studentCode, row.className, row.section, row.academicYear, row.routeName].join("|");
      const current = grouped.get(key) || {
        studentName: row.studentName, studentCode: row.studentCode, className: row.className,
        section: row.section, academicYear: row.academicYear, routeName: row.routeName,
        feeCount: 0, amount: 0, amountPaid: 0, balance: 0
      };
      current.feeCount += 1;
      current.amount += Number(row.amount || 0);
      current.amountPaid += Number(row.amountPaid || 0);
      current.balance += Number(row.balance || 0);
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => String(a.className).localeCompare(String(b.className)) || String(a.studentName).localeCompare(String(b.studentName)));
  }, [reportRows]);

  const reportTableColumns = [
    { key: "serialNo", label: "S.No." },
    { key: "studentName", label: "Student Name" },
    { key: "studentCode", label: "Student ID" },
    { key: "className", label: "Class" },
    { key: "section", label: "Section" },
    { key: "academicYear", label: "Academic Year" },
    { key: "feeName", label: "Fee Type" },
    { key: "feeBreakdown", label: "Fee Breakdown" },
    { key: "amount", label: "Total Fees" },
    { key: "amountPaid", label: "Paid" },
    { key: "balance", label: "Balance" },
    { key: "dueDate", label: "Due Date" },
    { key: "paidDate", label: "Payment Date" },
    { key: "status", label: "Status" },
    { key: "routeName", label: "Route" },
    { key: "reference", label: "Payment Reference" }
  ];
  const reportTotal = reportRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const reportPaid = reportRows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0);
  const reportOutstanding = reportRows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const reverseMatches = feeRows.filter(row => Number(row.amountPaid || 0) > 0 && (!normalized(reverseSearch) || [row.studentName, row.studentCode, row.reference, row.feeName].some(value => normalized(value).includes(normalized(reverseSearch)))));
  const reversals = Array.isArray(feeSettings.reversals) ? feeSettings.reversals : [];
  const lateFeeCharges = Array.isArray(feeSettings.lateFeeCharges) ? feeSettings.lateFeeCharges : [];
  return { selectedReport, reportRows, consolidatedRows, reportTableColumns, reportTotal, reportPaid, reportOutstanding, reverseMatches, reversals, lateFeeCharges };
}
