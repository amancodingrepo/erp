import { useEffect, useState } from "react";
import { defaultAcademicYear } from "../../school-options.js";
import { apiGet, apiPut } from "../../api.js";
import { useSchoolName } from "../../school-config.js";
import { localDateKey } from "./feeReportUtils.js";

export default function useFeesModuleState({ students, notify, initialDueThroughToday }) {
  const schoolName = useSchoolName();
  const [feeRecords, setFeeRecords] = useState([]);
  const [feeDraft, setFeeDraft] = useState({ studentCode: students[0]?.id || "", feeName: "Tuition Fee", amount: "", amountPaid: "0", dueDate: "", academicYear: defaultAcademicYear(students[0]?.academicYear), reference: "" });
  const [feeBusy, setFeeBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState("manage");
  const [query, setQuery] = useState("");
  const [manageYear, setManageYear] = useState(() => defaultAcademicYear(students[0]?.academicYear));
  const [manageClass, setManageClass] = useState(students[0]?.className || students[0]?.class || "");
  const [ledgerFilterMode, setLedgerFilterMode] = useState(initialDueThroughToday ? "due-through-today" : "all");
  const [expandedStudentRows, setExpandedStudentRows] = useState({});
  const [reminderBusy, setReminderBusy] = useState(false);
  const todayKey = localDateKey(new Date());
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportType, setReportType] = useState("ledger");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportFilters, setReportFilters] = useState({ academicYear: "", className: "", section: "", feeType: "", hostel: "", route: "", fromDate: "", toDate: "", studentStatus: "Active", referenceSearch: "" });
  const [reportSort, setReportSort] = useState("studentName");
  const [includeSchoolName, setIncludeSchoolName] = useState(false);
  const [feeReceiptTemplate, setFeeReceiptTemplate] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [editDraft, setEditDraft] = useState({ amount: "", amountPaid: "", dueDate: "", reference: "" });
  const [feeSettings, setFeeSettings] = useState({ lateFeeCharges: [], reversals: [] });
  const [feeSettingsLoaded, setFeeSettingsLoaded] = useState(false);
  const [feeSettingsReady, setFeeSettingsReady] = useState(false);
  const [lateFeeDraft, setLateFeeDraft] = useState({ feeType: "Tuition Fee", period: "Per Day", chargeType: "Flat", amount: "", percentage: "0", fromDate: "", toDate: "" });
  const [editingLateFeeId, setEditingLateFeeId] = useState("");
  const [reverseSearch, setReverseSearch] = useState("");
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState("");

  useEffect(() => {
    setLedgerFilterMode(initialDueThroughToday ? "due-through-today" : "all");
    if (initialDueThroughToday) {
      setManageYear("");
      setManageClass("");
      setQuery("");
    }
  }, [initialDueThroughToday]);

  useEffect(() => {
    let cancelled = false;
    apiGet("/fees").then(result => {
      if (!cancelled) setFeeRecords(Array.isArray(result.fees) ? result.fees : []);
    }).catch(error => {
      if (!cancelled) notify("Fee ledger could not be loaded: " + error.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    apiGet("/my-template-assignments").then(result => {
      if (!cancelled) setFeeReceiptTemplate(result?.feeReceipt || null);
    }).catch(error => {
      if (!cancelled) notify("Assigned fee receipt template could not be loaded: " + error.message);
    });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    apiGet("/module-data/fees").then(result => {
      if (cancelled) return;
      const data = result?.data || {};
      setFeeSettings({
        ...data,
        lateFeeCharges: Array.isArray(data.lateFeeCharges) ? data.lateFeeCharges : [],
        reversals: Array.isArray(data.reversals) ? data.reversals : []
      });
      setFeeSettingsLoaded(true);
      setFeeSettingsReady(true);
    }).catch(error => {
      if (!cancelled) {
        setFeeSettingsLoaded(true);
        notify("Fee configuration could not be loaded: " + error.message);
      }
    });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    if (!feeSettingsLoaded || !feeSettingsReady) return undefined;
    const timer = window.setTimeout(() => {
      apiPut("/module-data/fees", { data: feeSettings }).catch(error => notify("Fee settings could not be saved: " + error.message));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [feeSettings, feeSettingsLoaded, feeSettingsReady, notify]);

  useEffect(() => {
    if (!feeDraft.studentCode && students[0]) {
      setFeeDraft(previous => ({ ...previous, studentCode: students[0].id, academicYear: defaultAcademicYear(previous.academicYear, students[0].academicYear) }));
    }
  }, [students, feeDraft.studentCode]);
  return {
    schoolName, feeRecords, setFeeRecords, feeDraft, setFeeDraft, feeBusy, setFeeBusy, loading,
    showAddForm, setShowAddForm, view, setView, query, setQuery, manageYear, setManageYear,
    manageClass, setManageClass, ledgerFilterMode, setLedgerFilterMode, expandedStudentRows,
    setExpandedStudentRows, reminderBusy, setReminderBusy, todayKey, reportMenuOpen,
    setReportMenuOpen, reportType, setReportType, reportGenerated, setReportGenerated,
    reportFilters, setReportFilters, reportSort, setReportSort, includeSchoolName,
    setIncludeSchoolName, feeReceiptTemplate, editingFee, setEditingFee, editDraft, setEditDraft,
    feeSettings, setFeeSettings, feeSettingsLoaded, setFeeSettingsLoaded, feeSettingsReady,
    setFeeSettingsReady, lateFeeDraft, setLateFeeDraft, editingLateFeeId, setEditingLateFeeId,
    reverseSearch, setReverseSearch, reverseTarget, setReverseTarget, reverseReason, setReverseReason
  };
}
