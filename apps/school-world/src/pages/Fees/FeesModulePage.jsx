import React from "react";
import FeesRecordDialogs from "./FeesRecordDialogs.jsx";
import FeesManageSection from "./FeesManageSection.jsx";
import FeesLateChargesSection from "./FeesLateChargesSection.jsx";
import FeesPaymentReversalsSection from "./FeesPaymentReversalsSection.jsx";
import FeesReportsSection from "./FeesReportsSection.jsx";
import { money } from "./feeReportUtils.js";
import useFeesModuleState from "./useFeesModuleState.js";
import useFeesLedgerData from "./useFeesLedgerData.js";
import useFeesReportData from "./useFeesReportData.js";
import useFeesReportActions from "./useFeesReportActions.js";
import useFeesReminderActions from "./useFeesReminderActions.js";
import useFeeRecordActions from "./useFeeRecordActions.js";
import useFeeSettingsActions from "./useFeeSettingsActions.js";
import useFeeReversalAction from "./useFeeReversalAction.js";

export default function FeesModulePage({ students = [], t, notify, onOpenStudent, initialDueThroughToday = false }) {
  const state = useFeesModuleState({ students, notify, initialDueThroughToday });
  const {
    schoolName, feeRecords, setFeeRecords, feeDraft, setFeeDraft, feeBusy, setFeeBusy, loading,
    showAddForm, setShowAddForm, view, setView, query, setQuery, manageYear, setManageYear,
    manageClass, setManageClass, ledgerFilterMode, setLedgerFilterMode, expandedStudentRows,
    setExpandedStudentRows, reminderBusy, setReminderBusy, todayKey, reportMenuOpen,
    setReportMenuOpen, reportType, setReportType, reportGenerated, setReportGenerated,
    reportFilters, setReportFilters, reportSort, setReportSort, includeSchoolName,
    setIncludeSchoolName, feeReceiptTemplate, editingFee, setEditingFee, editDraft, setEditDraft,
    feeSettings, setFeeSettings, feeSettingsLoaded, feeSettingsReady, lateFeeDraft, setLateFeeDraft,
    editingLateFeeId, setEditingLateFeeId, reverseSearch, setReverseSearch, reverseTarget,
    setReverseTarget, reverseReason, setReverseReason
  } = state;
  const ledger = useFeesLedgerData({ students, feeRecords, query, manageYear, manageClass, ledgerFilterMode, todayKey });
  const {
    studentByCode, academicYears, classOptions, feeTypes, hostelOptions, routeOptions, feeRows,
    totalDue, collected, studentsWithDues, filteredFeeLedgerRows, studentSummaryRows
  } = ledger;
  const reportData = useFeesReportData({ feeRows, reportType, reportFilters, reportSort, reverseSearch, feeSettings });
  const {
    selectedReport, reportRows, consolidatedRows, reportTableColumns, reportTotal, reportPaid, reportOutstanding,
    reverseMatches, reversals, lateFeeCharges
  } = reportData;
  const reportActions = useFeesReportActions({
    setReportFilters, setReportGenerated, setReportType, setReportSort, setView, setReportMenuOpen,
    notify, includeSchoolName, schoolName, reportType, feeReceiptTemplate, selectedReport, reportRows,
    filteredFeeLedgerRows
  });
  const { updateReportFilter, openReport, exportXls, exportPdf, printFeeReceipt, exportManageXls, exportManagePdf, generateReport } = reportActions;
  const reminderActions = useFeesReminderActions({ reminderBusy, setReminderBusy, manageYear, manageClass, feeRows, notify, onOpenStudent });
  const { sendFeeRemindersToStudents, openStudentFees } = reminderActions;
  const recordActions = useFeeRecordActions({
    feeDraft, setFeeDraft, setFeeBusy, notify, studentByCode, setFeeRecords, setShowAddForm,
    editDraft, editingFee, setEditingFee, setReverseSearch, setView, onOpenStudent
  });
  const { addFeeRecord, markFeePaid, beginEditFee, saveEditedFee, removeFeeRecord } = recordActions;
  const settingsActions = useFeeSettingsActions({
    feeTypes, feeSettingsReady, feeSettings, setFeeSettings, editingLateFeeId, setEditingLateFeeId,
    lateFeeDraft, setLateFeeDraft, notify
  });
  const { resetLateFeeDraft, saveLateFeeRule, editLateFeeRule, removeLateFeeRule } = settingsActions;
  const reversalActions = useFeeReversalAction({
    reverseTarget, feeSettingsReady, reverseReason, setReverseTarget, setReverseReason,
    setFeeBusy, setFeeRecords, setFeeSettings, notify
  });
  const { reversePayment } = reversalActions;

  return <div className="fees-module">
    <header className="fees-page-header">
      <div>
        <span className="fees-eyebrow">FEE MANAGEMENT WORKSPACE</span>
        <h2>{t("Manage Fees")}</h2>
        <p>Manage fee records, review payments and generate downloadable fee reports.</p>
      </div>
      <button type="button" className="fees-button fees-button-primary" onClick={() => { setView("manage"); setShowAddForm(value => !value); }}>
        <span>{showAddForm ? "−" : "+"}</span>{showAddForm ? t("Close fee form") : t("Add fee record")}
      </button>
    </header>

    <nav className="fees-workspace-tabs" aria-label="Fee workspace sections">
      <button type="button" className={view === "manage" ? "active" : ""} onClick={() => { setView("manage"); setReportMenuOpen(false); }}>{t("Manage Fees")}</button>
      <button type="button" className={view === "reports" ? "active" : ""} onClick={() => { setView("reports"); setReportMenuOpen(false); }}>{t("Reports")}</button>
      <button type="button" className={view === "late-charges" ? "active" : ""} onClick={() => { setView("late-charges"); setReportMenuOpen(false); }}>{t("Late Fee Charges")}</button>
      <button type="button" className={view === "reverse-payment" ? "active" : ""} onClick={() => { setView("reverse-payment"); setReportMenuOpen(false); }}>{t("Reverse Payment")}</button>
    </nav>

    {view === "manage" && <FeesManageSection context={{ t, feeRecords, collected, totalDue, studentsWithDues, ledgerFilterMode, setLedgerFilterMode, query, setQuery, manageYear, setManageYear, academicYears, classOptions, manageClass, setManageClass, reminderBusy, loading, sendFeeRemindersToStudents, reportMenuOpen, setReportMenuOpen, openReport, exportManageXls, exportManagePdf, showAddForm, feeDraft, setFeeDraft, students, feeBusy, addFeeRecord, studentSummaryRows, expandedStudentRows, setExpandedStudentRows, openStudentFees, printFeeReceipt }} />}

    {view === "reports" && <FeesReportsSection context={{ t, setView, selectedReport, reportType, setReportType, setReportSort, setReportGenerated, reportFilters, updateReportFilter, academicYears, classOptions, students, feeTypes, hostelOptions, routeOptions, reportSort, includeSchoolName, setIncludeSchoolName, generateReport, exportXls, exportPdf, reportRows, reportGenerated, reportTotal, reportPaid, reportOutstanding, reportTableColumns, consolidatedRows }} />}

    {view === "late-charges" && <FeesLateChargesSection context={{ t, feeSettingsReady, feeSettingsLoaded, editingLateFeeId, lateFeeDraft, setLateFeeDraft, feeTypes, saveLateFeeRule, resetLateFeeDraft, lateFeeCharges, editLateFeeRule, removeLateFeeRule }} />}

    {view === "reverse-payment" && <FeesPaymentReversalsSection context={{ t, feeSettingsReady, feeSettingsLoaded, reverseSearch, setReverseSearch, reverseMatches, setReverseTarget, setReverseReason, reversals }} />}    <FeesRecordDialogs context={{ editingFee, setEditingFee, feeBusy, t, editDraft, setEditDraft, saveEditedFee, markFeePaid, reverseTarget, setReverseTarget, money, reverseReason, setReverseReason, feeSettingsReady, reversePayment }} />
  </div>;
}

