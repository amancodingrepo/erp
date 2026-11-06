import { useMemo } from "react";
import { academicYearOptions } from "../../school-options.js";
import { money, plainDate, normalized, groupFeeInstallments } from "./feeReportUtils.js";

export default function useFeesLedgerData({ students, feeRecords, query, manageYear, manageClass, ledgerFilterMode, todayKey }) {
  const studentByCode = useMemo(() => {
    const map = new Map();
    students.forEach(student => {
      if (student.id != null) map.set(String(student.id), student);
      if (student.studentCode != null) map.set(String(student.studentCode), student);
    });
    return map;
  }, [students]);

  const academicYears = useMemo(() => academicYearOptions(
    students.map(student => student.academicYear),
    feeRecords.map(fee => fee.academicYear)
  ), [students, feeRecords]);
  const classOptions = useMemo(() => [...new Set([
    ...students.map(student => student.className || student.class),
    ...feeRecords.map(fee => fee.className)
  ].filter(Boolean).map(value => String(value).trim()))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students, feeRecords]);
  const feeTypes = useMemo(() => [...new Set(feeRecords.flatMap(fee => [fee.feeName, ...(Array.isArray(fee.metadata?.templateFeeItems) ? fee.metadata.templateFeeItems.map(item => item.name) : [])]).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [feeRecords]);
  const hostelOptions = useMemo(() => [...new Set(students.map(student => student.hostelName || student.hostel).filter(Boolean).map(String))].sort(), [students]);
  const routeOptions = useMemo(() => [...new Set(students.map(student => student.routeName || student.route || student.busRoute || student.transportRoute).filter(Boolean).map(String))].sort(), [students]);

  const feeRows = useMemo(() => feeRecords.map(fee => {
    const student = studentByCode.get(String(fee.studentCode)) || {};
    const concessionValue = student.concessionAmount ?? student.feeConcessionAmount ?? student.discountAmount;
    const templateDiscount = (Array.isArray(fee.metadata?.templateFeeItems) ? fee.metadata.templateFeeItems : []).reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const concessionAmount = Number(concessionValue ?? templateDiscount) || 0;
    return {
      ...fee,
      studentName: fee.studentName || student.name || student.fullName || "Unknown student",
      studentCode: fee.studentCode || student.id || student.studentCode || "",
      className: fee.className || student.className || student.class || "",
      section: student.section || fee.section || "",
      currentGrade: student.currentGrade || student.grade || student.className || fee.className || "",
      studentStatus: student.status || "Active",
      parentName: student.parent || student.primaryParentName || student.parentName || student.parentGuardianName || "",
      fatherName: student.fatherName || student.father || "",
      hostelName: student.hostelName || student.hostel || "",
      routeName: student.routeName || student.route || student.busRoute || student.transportRoute || "",
      paidDate: plainDate(fee.paidAt),
      feeBreakdown: (Array.isArray(fee.metadata?.templateFeeItems) ? fee.metadata.templateFeeItems : []).map(item => {
        const details = [item.name || "Fee", "Base " + money(item.baseAmount)];
        if (Number(item.discountAmount || 0) > 0) details.push("Discount " + money(item.discountAmount));
        if (Number(item.taxAmount || 0) > 0) details.push("Tax " + money(item.taxAmount));
        if (item.originalInstallment) details.push("Installment " + item.originalInstallment);
        if (item.originalDueDate) details.push("Due " + plainDate(item.originalDueDate));
        return details.join(" · ");
      }).join("; ") || (fee.installmentName && fee.installmentName !== "Single Installment" ? "Installment " + fee.installmentName : ""),
      balance: Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0)),
      concessionAmount
    };
  }), [feeRecords, studentByCode]);

  const totalDue = feeRows.reduce((sum, fee) => sum + fee.balance, 0);
  const collected = feeRows.reduce((sum, fee) => sum + Number(fee.amountPaid || 0), 0);
  const totalBilled = feeRows.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
  const studentsWithDues = new Set(feeRows.filter(fee => fee.balance > 0).map(fee => String(fee.studentCode))).size;
  const filteredFeeRecords = useMemo(() => feeRows.filter(fee => {
    const q = normalized(query);
    const searchable = [fee.studentName, fee.studentCode, fee.className, fee.feeName, fee.installmentName, fee.feeBreakdown, fee.reference].join(" ").toLowerCase();
    const dueDate = plainDate(fee.dueDate);
    if (ledgerFilterMode === "outstanding" && fee.balance <= 0) return false;
    if (ledgerFilterMode === "due-through-today" && !(fee.balance > 0 && dueDate && dueDate <= todayKey)) return false;
    return (!manageYear || String(fee.academicYear) === manageYear) &&
      (!manageClass || String(fee.className) === manageClass) &&
      (!q || searchable.includes(q));
  }).sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")) || String(a.studentName).localeCompare(String(b.studentName))), [feeRows, query, manageYear, manageClass, ledgerFilterMode, todayKey]);
  const filteredFeeLedgerRows = useMemo(() => groupFeeInstallments(filteredFeeRecords), [filteredFeeRecords]);
  const studentSummaryRows = useMemo(() => {
    const groups = new Map();
    filteredFeeRecords.forEach(fee => {
      const code = String(fee.studentCode || "unknown-" + fee.id);
      if (!groups.has(code)) {
        groups.set(code, {
          studentCode: code,
          studentName: fee.studentName || "Unknown student",
          className: fee.className || "",
          section: fee.section || "",
          student: studentByCode.get(code) || students.find(item => String(item.id) === code || String(item.studentCode) === code) || null,
          fees: [],
          totalFees: 0,
          paidFees: 0,
          balance: 0
        });
      }
      const group = groups.get(code);
      group.fees.push(fee);
      group.totalFees += Number(fee.amount || 0);
      group.paidFees += Number(fee.amountPaid || 0);
      group.balance += Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0));
    });
    return [...groups.values()].map(group => {
      group.fees.sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")) || String(a.feeName || "").localeCompare(String(b.feeName || "")));
      const nextUnpaidFee = group.fees.filter(fee => fee.balance > 0 && plainDate(fee.dueDate)).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
      return {
        ...group,
        totalFees: Math.round(group.totalFees * 100) / 100,
        paidFees: Math.round(group.paidFees * 100) / 100,
        balance: Math.round(group.balance * 100) / 100,
        nextPaymentDate: nextUnpaidFee?.dueDate || ""
      };
    }).sort((a, b) => String(a.studentName).localeCompare(String(b.studentName), undefined, {numeric:true,sensitivity:"base"}));
  }, [filteredFeeRecords, studentByCode, students]);

  return { studentByCode, academicYears, classOptions, feeTypes, hostelOptions, routeOptions, feeRows, totalDue, collected, totalBilled, studentsWithDues, filteredFeeRecords, filteredFeeLedgerRows, studentSummaryRows };
}
