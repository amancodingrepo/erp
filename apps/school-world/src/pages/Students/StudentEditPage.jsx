import React, { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../../i18n.jsx";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../../api.js";
import { LegacyHeader, LegacySidebar } from "../../LegacyShell.jsx";
import { Field, YesNo, NameParts } from "./StudentFormFields.jsx";
import { defaultEditData, editTabs } from "../../student-form-utils.js";
import {
  ArrowLeft, BookOpen, Bell, UserCircle, ChevronDown, Home, MessageCircle, CalendarDays,
  Building2, Users, Wallet, Star, ChartNoAxesColumn, Camera, CloudDownload, ExternalLink,
  Save, Plus, Printer, Upload, Trash2, CheckCircle2, X, FileText, Search, AlertCircle, Truck, ClipboardList, Package, Store, AlertTriangle,
  Download, Eye, Pencil
} from "lucide-react";

import StudentDetailsTab from "./StudentDetailsTab.jsx";
import StudentParentTab from "./StudentParentTab.jsx";
import StudentFeesTab from "./StudentFeesTab.jsx";
import StudentFeeSummaryTab from "./StudentFeeSummaryTab.jsx";
import StudentDayCareTab from "./StudentDayCareTab.jsx";
import StudentTransportTab from "./StudentTransportTab.jsx";
import StudentImmunizationTab from "./StudentImmunizationTab.jsx";
import FeePaymentDialog from "./FeePaymentDialog.jsx";
import EditInstallmentDialog from "./EditInstallmentDialog.jsx";
import PaymentDetailsDialog from "./PaymentDetailsDialog.jsx";
import StudentApplyFeeTemplateDialog from "./StudentApplyFeeTemplateDialog.jsx";
import ImmunizationScheduleDialog from "./ImmunizationScheduleDialog.jsx";
import { downloadCsvFile } from "../../shared/csvUtils.js";
import { groupStudentFeeInstallments, calculateFeeTotalWithLateCharges, localDateInputValue, htmlEscape } from "./studentEditUtils.js";
import { receiptLogoAsJpeg, buildFeeReceiptPdf } from "../Templates/FeeReceipt/feeReceiptPdf.js";
import { appLocale, currencyCode, formatMoney } from "../../school-locale.js";

export function StudentEditPage({ student, savedDetails, onSave, onPhotoChange, onBack, onOpenAdmission, onOpenModule, activeModule = "", onNotify, classOptions = [] }) {
  const [tab, setTab] = useState(() => student?._initialTab || "Student Details");
  const [data, setData] = useState(() => defaultEditData(student, savedDetails || {}));
  const [photo, setPhoto] = useState(() => savedDetails?.photoDataUrl || student.photoDataUrl || "");
  const [showImmunization, setShowImmunization] = useState(false);
  const [vaccine, setVaccine] = useState({ name: "", scheduleDate: "", administeredDate: "", remarks: "", status: "Scheduled", image: "" });
  const [editingVaccine, setEditingVaccine] = useState(-1);
  const [savedToast, setSavedToast] = useState("");
  const savedToastTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (savedToastTimeoutRef.current) window.clearTimeout(savedToastTimeoutRef.current);
  }, []);
  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const [feeCheckboxGuideActive, setFeeCheckboxGuideActive] = useState(false);
  const [feeCheckboxGuidanceNotification, setFeeCheckboxGuidanceNotification] = useState(false);
  const [feeTemplatePaymentGuidanceNotification, setFeeTemplatePaymentGuidanceNotification] = useState(false);
  const notify = (message, options = {}) => {
    if (savedToastTimeoutRef.current) {
      window.clearTimeout(savedToastTimeoutRef.current);
      savedToastTimeoutRef.current = null;
    }
    const text = String(message);
    const shouldGuideFeeCheckbox = text.includes("Select one or more unpaid installments using the checkbox at the start of each row before clicking Pay Now.") || text.includes("Select the installment you want to pay using the checkbox at the start of its row.");
    const shouldGuideTemplatePayments = text.includes("A fee template is already assigned and has recorded payments.");
    setSavedToast(t(message));
    setFeeCheckboxGuidanceNotification(shouldGuideFeeCheckbox);
    setFeeCheckboxGuideActive(shouldGuideFeeCheckbox);
    setFeeTemplatePaymentGuidanceNotification(shouldGuideTemplatePayments);
    // This page renders its own notification; keep the parent-shell copy transient to avoid a stale toast after navigating back.
    onNotify?.(message, options?.persistent ? {} : options);
    if (!options?.persistent) {
      savedToastTimeoutRef.current = window.setTimeout(() => {
        setSavedToast("");
        setFeeCheckboxGuidanceNotification(false);
        setFeeCheckboxGuideActive(false);
        setFeeTemplatePaymentGuidanceNotification(false);
        savedToastTimeoutRef.current = null;
      }, 3200);
    }
  };
  const notifyPersistent = message => notify(message, { persistent: true });
  function clearSavedToast() {
    if (savedToastTimeoutRef.current) {
      window.clearTimeout(savedToastTimeoutRef.current);
      savedToastTimeoutRef.current = null;
    }
    setSavedToast("");
    setFeeCheckboxGuidanceNotification(false);
    setFeeCheckboxGuideActive(false);
    setFeeTemplatePaymentGuidanceNotification(false);
  }
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const save = async (scope = "all") => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await onSave?.(data, scope, photo);
      if (result === false) return;
      notify(`${scope === "Parent" ? "Parent details" : scope === "all" ? "Student details" : scope} saved to the school database.`);
    } catch (error) {
      notify(`Save failed: ${error?.message || "Please try again."}`);
    } finally { setSaving(false); }
  };
  const handleStudentPhotoUpload = (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || photoSaving) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file for the student photo.");
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      notify("The selected photo could not be read. Please try another image.");
      input.value = "";
    };
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => {
        notify("The selected photo could not be opened. Please try another image.");
        input.value = "";
      };
      image.onload = async () => {
        const maxDimension = 480;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          notify("The browser could not process this photo. Please try another image.");
          input.value = "";
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setPhotoSaving(true);
        try {
          const savedStudent = await onPhotoChange?.(student.id, photoDataUrl);
          if (!savedStudent || savedStudent === false || savedStudent.photoDataUrl !== photoDataUrl) {
            throw new Error("The server did not confirm the new photo. Your previous photo has been kept.");
          }
          // Show the new image only after the API confirms PostgreSQL has saved it.
          setPhoto(savedStudent.photoDataUrl);
          notify(`Photo saved for Student ID ${student.id}. It is now updated in Manage Students.`);
        } catch (error) {
          notify(`Photo save failed: ${error?.message || "Your previous photo has been kept. Please try again."}`);
        } finally {
          setPhotoSaving(false);
          input.value = "";
        }
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };
  const name = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");
  const shortName = name || student.name;
  const [feeRecords, setFeeRecords] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeReminderBusy, setFeeReminderBusy] = useState(false);
  const [feeDraft, setFeeDraft] = useState({ feeName: "Tuition", amount: "", amountPaid: "0", dueDate: "", reference: "" });
  const [paidDrafts, setPaidDrafts] = useState({});
  const [feeAction, setFeeAction] = useState("");
  const [availableFeeTemplates, setAvailableFeeTemplates] = useState([]);
  const [availableFeeTypes, setAvailableFeeTypes] = useState([]);
  const [replaceExistingTemplate, setReplaceExistingTemplate] = useState(false);
  const [selectedFeeTemplateId, setSelectedFeeTemplateId] = useState("");
  const [showApplyFeeTemplate, setShowApplyFeeTemplate] = useState(false);
  const [applyFeeTemplateBusy, setApplyFeeTemplateBusy] = useState(false);
  const [applyFeeTemplateError, setApplyFeeTemplateError] = useState("");
  const [feeMutationBusyId, setFeeMutationBusyId] = useState("");
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => localDateInputValue());
  const [paymentCashDepositNumber, setPaymentCashDepositNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [editInstallmentTarget, setEditInstallmentTarget] = useState(null);
  const [editInstallmentDrafts, setEditInstallmentDrafts] = useState({});
  const [editInstallmentBusy, setEditInstallmentBusy] = useState(false);
  const [viewInstallmentTarget, setViewInstallmentTarget] = useState(null);
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);
  const [receiptBusyId, setReceiptBusyId] = useState("");
  const studentFeeRecordsForYear = useMemo(() => feeRecords.filter(fee => !fee.academicYear || String(fee.academicYear) === String(data.academicYear)), [feeRecords, data.academicYear]);
  const studentFeeInstallmentRows = useMemo(() => groupStudentFeeInstallments(studentFeeRecordsForYear), [studentFeeRecordsForYear]);
  const studentFeeTotals = useMemo(() => studentFeeRecordsForYear.reduce((total, fee) => {
    const amount = Number(fee.amount || 0), paid = Number(fee.amountPaid || 0);
    total.total += amount;
    total.paid += paid;
    total.unpaid += Math.max(0, amount - paid);
    return total;
  }, { total: 0, paid: 0, unpaid: 0 }), [studentFeeRecordsForYear]);
  const formatFeeMoney = value => Number(value || 0).toLocaleString(appLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currentTemplateAssignment = feeRecords.find(fee => fee.metadata?.feeTemplateId) || null;
  const templateHasPaidAmount = fee => Boolean(fee.metadata?.feeTemplateId) && feeRecords.some(other =>
    String(other.metadata?.feeTemplateId || "") === String(fee.metadata.feeTemplateId) && Number(other.amountPaid || 0) > 0
  );
  useEffect(() => {
    if (!["Fees", "Installmentwise Fee Summary"].includes(tab)) return undefined;
    let cancelled = false;
    setFeesLoading(true);
    apiGet(`/fees?studentCode=${encodeURIComponent(student.id)}`)
      .then(result => { if (!cancelled) setFeeRecords(Array.isArray(result.fees) ? result.fees : []); })
      .catch(error => { if (!cancelled) notify(`Fee records could not be loaded: ${error.message}`); })
      .finally(() => { if (!cancelled) setFeesLoading(false); });
    return () => { cancelled = true; };
  }, [tab, student.id]);
  const sendFeeReminder = async () => {
    if (feeReminderBusy) return;
    setFeeReminderBusy(true);
    try {
      const result = await apiPost(`/students/${encodeURIComponent(student.id)}/fee-reminder`, {
        academicYear: data.academicYear
      });
      notify(result.message || `Fee reminder sent for Student ID ${student.id}.`);
    } catch (error) {
      notify(`Fee reminder not sent: ${error?.message || "Please try again."}`);
    } finally {
      setFeeReminderBusy(false);
    }
  };
  const createFeeRecord = async () => {
    const amount = Number(feeDraft.amount), amountPaid = Number(feeDraft.amountPaid || 0);
    if (!feeDraft.feeName.trim() || feeDraft.amount === "" || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > amount) {
      notify("Enter a fee name and valid amounts. Paid amount cannot exceed the fee amount."); return;
    }
    setFeeSaving(true);
    try {
      const result = await apiPost("/fees", { ...feeDraft, studentCode: student.id, academicYear: data.academicYear, amount, amountPaid });
      setFeeRecords(prev => [...prev, result.fee].sort((a,b) => String(a.dueDate||"").localeCompare(String(b.dueDate||""))));
      setFeeDraft({ feeName: "Tuition", amount: "", amountPaid: "0", dueDate: "", reference: "" });
      notify("Fee record saved to the school database.");
    } catch (error) { notify(`Fee record was not saved: ${error.message}`); }
    finally { setFeeSaving(false); }
  };
  const refreshFeeRecords = async () => {
    const result = await apiGet(`/fees?studentCode=${encodeURIComponent(student.id)}`);
    const next = Array.isArray(result.fees) ? result.fees : [];
    setFeeRecords(next);
    return next;
  };
  const saveFeePayment = async (fee) => {
    const raw = paidDrafts[fee.id] ?? String(fee.amountPaid ?? 0);
    const amountPaid = Number(raw);
    if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > Number(fee.amount)) { notify("Enter a valid paid amount not greater than the fee amount."); return; }
    if (amountPaid < Number(fee.amountPaid || 0)) { notify("Recorded payments cannot be reduced directly. Use Reverse Payment so the reversal is audited."); return; }
    try {
      const result = await apiPatch(`/fees/${encodeURIComponent(fee.id)}`, { amountPaid });
      setFeeRecords(prev => prev.map(item => item.id === fee.id ? { ...item, ...result.fee } : item));
      setPaidDrafts(prev => { const next = { ...prev }; delete next[fee.id]; return next; });
      notify("Fee payment record updated. This records a payment; it does not process a payment gateway transaction.");
    } catch (error) { notify(`Payment record was not updated: ${error.message}`); }
  };
  const removeFeeRecord = async (fee) => {
    if (Number(fee.amountPaid || 0) > 0) { notify("Reverse the recorded payment before deleting this fee record."); return; }
    if (!window.confirm(`Delete the fee record "${fee.feeName}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/fees/${encodeURIComponent(fee.id)}`);
      setFeeRecords(prev => prev.filter(item => item.id !== fee.id));
      notify("Fee record deleted.");
    } catch (error) { notify(`Fee record could not be deleted: ${error.message}`); }
  };
  const reverseFeePayment = async (fee) => {
    const paid = Number(fee.amountPaid || 0);
    if (paid <= 0) { notify("There is no recorded payment to reverse."); return; }
    if (!window.confirm(`Reverse the recorded payment of ${formatMoney(paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for this fee? This will be recorded in the audit log.`)) return;
    setFeeMutationBusyId(String(fee.id));
    try {
      const reason = "Reversed from student fee record";
      const result = await apiPost(`/fees/${encodeURIComponent(fee.id)}/reverse-payment`, { reason });
      setFeeRecords(prev => prev.map(item => item.id === fee.id ? { ...item, ...result.fee } : item));
      setPaidDrafts(prev => { const next = { ...prev }; delete next[fee.id]; return next; });
      const reversal = {
        id: String(Date.now()), feeId: String(fee.id), studentCode: student.id,
        studentName: student.name || shortName, className: student.className || student.class || "",
        academicYear: fee.academicYear || data.academicYear, feeName: fee.feeName,
        amountReversed: Number(result.reversedAmount ?? paid), reference: fee.reference || "",
        reason, reversedAt: new Date().toISOString()
      };
      try {
        const settingsResult = await apiGet("/module-data/fees");
        const settings = settingsResult?.data || {};
        const reversals = Array.isArray(settings.reversals) ? settings.reversals : [];
        await apiPut("/module-data/fees", { data: { ...settings, reversals: [reversal, ...reversals].slice(0, 500) } });
        notify("Payment reversed, audit logged, and reversal history updated. Remove Template becomes available when all linked payments are reversed.");
      } catch {
        notify("Payment reversed and audit logged. The separate reversal-history view could not be refreshed, but the server audit entry is saved.");
      }
    } catch (error) { notify(`Payment reversal failed: ${error.message}`); }
    finally { setFeeMutationBusyId(""); }
  };
  const removeFeeTemplate = async (fee) => {
    if (!fee.metadata?.feeTemplateId) { notify("This fee record is not linked to a fee template."); return; }
    if (templateHasPaidAmount(fee)) { notify("Reverse all payments linked to this template before removing it."); return; }
    if (!window.confirm(`Remove "${fee.metadata.feeTemplateName || fee.feeName}" from this student? All unpaid fee rows linked to this template will be removed.`)) return;
    setFeeMutationBusyId(String(fee.id));
    try {
      await apiDelete(`/fees/${encodeURIComponent(fee.id)}/template-assignment`);
      const templateId = String(fee.metadata.feeTemplateId);
      setFeeRecords(prev => prev.filter(item => String(item.metadata?.feeTemplateId || "") !== templateId));
      notify("Fee template removed from this student.");
    } catch (error) { notify(`Fee template could not be removed: ${error.message}`); }
    finally { setFeeMutationBusyId(""); }
  };
  const installmentRecords = fee => fee?.groupedRecords || [fee].filter(Boolean);
  const openInstallmentPayment = fee => {
    const records = installmentRecords(fee);
    if (!records.length) return;
    const drafts = {};
    records.forEach(record => {
      const lateFee = Math.max(0, Number(record.metadata?.lateFeeCharges || 0));
      const total = calculateFeeTotalWithLateCharges(record, lateFee);
      drafts[String(record.id)] = {
        lateFeeCharges: String(lateFee),
        amountToPay: String(Math.max(0, Math.round((total - Number(record.amountPaid || 0)) * 100) / 100))
      };
    });
    setPaymentTarget(fee);
    setPaymentDrafts(drafts);
    setPaymentMethod("Cash");
    setPaymentDate(localDateInputValue());
    setPaymentCashDepositNumber("");
    setPaymentNotes("");
  };
  const updatePaymentLateFee = (record, value) => {
    const nextValue = value === "" ? "" : String(Math.max(0, Number(value) || 0));
    const amount = calculateFeeTotalWithLateCharges(record, nextValue === "" ? 0 : nextValue);
    setPaymentDrafts(previous => ({
      ...previous,
      [String(record.id)]: {
        lateFeeCharges: nextValue,
        amountToPay: String(Math.max(0, Math.round((amount - Number(record.amountPaid || 0)) * 100) / 100))
      }
    }));
  };
  const submitInstallmentPayment = async (printReceipt = false) => {
    if (!paymentTarget || paymentBusy) return;
    const records = installmentRecords(paymentTarget);
    const inputs = records.map(record => {
      const draft = paymentDrafts[String(record.id)] || {};
      const lateFeeCharges = draft.lateFeeCharges === "" ? 0 : Number(draft.lateFeeCharges);
      const amountToPay = draft.amountToPay === "" ? 0 : Number(draft.amountToPay);
      const totalAmount = calculateFeeTotalWithLateCharges(record, lateFeeCharges);
      return { feeId: String(record.id), amountToPay, lateFeeCharges, totalAmount, balance: Math.max(0, totalAmount - Number(record.amountPaid || 0)) };
    });
    if (!paymentMethod || !paymentDate) { notifyPersistent("Choose a payment method and paid date."); return; }
    const invalid = inputs.find(item => !Number.isFinite(item.amountToPay) || item.amountToPay < 0 || !Number.isFinite(item.lateFeeCharges) || item.lateFeeCharges < 0 || item.amountToPay > item.balance + 0.001);
    if (invalid) { notifyPersistent("Check each fee amount. Amount to pay cannot exceed that fee's outstanding balance."); return; }
    // Do not submit fully paid rows: only send records with an outstanding balance.
    const payableInputs = inputs.filter(item => item.balance > 0.001);
    const paymentTotal = payableInputs.reduce((sum, item) => sum + item.amountToPay, 0);
    if (!payableInputs.length || paymentTotal <= 0) { notifyPersistent("Enter an amount greater than zero for an unpaid fee installment."); return; }

    // Open the tab within the user gesture; load the receipt PDF from live DB data after payment is saved.
    const printWindow = printReceipt ? window.open("about:blank", "_blank") : null;
    setPaymentBusy(true);
    let paymentResult = null;
    try {
      paymentResult = await apiPost("/fees/pay-installment", {
        records: payableInputs.map(item => ({ feeId: item.feeId, amountToPay: item.amountToPay, lateFeeCharges: item.lateFeeCharges })),
        paymentMethod, paymentDate, cashDepositNumber: paymentCashDepositNumber, notes: paymentNotes
      });
      const updatedById = new Map((Array.isArray(paymentResult.fees) ? paymentResult.fees : []).map(item => [String(item.id), item]));
      setFeeRecords(previous => previous.map(item => updatedById.has(String(item.id)) ? { ...item, ...updatedById.get(String(item.id)) } : item));
      setPaymentTarget(null);
      notifyPersistent("Payment recorded successfully. " + currencyCode() + " " + formatFeeMoney(paymentResult.totalPaidThisTransaction) + " recorded.");
    } catch (error) {
      if (printWindow && !printWindow.closed) printWindow.close();
      notifyPersistent("Payment could not be recorded: " + (error?.message || "Please try again."));
      return;
    } finally {
      setPaymentBusy(false);
    }
    if (printReceipt && paymentResult) {
      try {
        const receiptFeeId = String(paymentResult.fees?.[0]?.id || inputs[0]?.feeId || "");
        const receiptQuery = paymentResult.receiptNumber ? "?receiptNumber=" + encodeURIComponent(paymentResult.receiptNumber) : "";
        const receipt = await apiGet("/fees/" + encodeURIComponent(receiptFeeId) + "/receipt-data" + receiptQuery);
        const logo = receipt.feeReceiptTemplate?.receiptSettings?.showSchoolLogo === false ? null : await receiptLogoAsJpeg(receipt.school?.logo);
        const pdf = buildFeeReceiptPdf(receipt, logo);
        const blobUrl = URL.createObjectURL(pdf);
        if (printWindow && !printWindow.closed) {
          printWindow.location.href = blobUrl;
        } else {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = "Fee-Receipt-" + String(receipt.student?.id || "student").replace(/[^a-z0-9-]/gi, "-") + "-" + String(receipt.receiptNumber || "receipt").replace(/[^a-z0-9-]/gi, "-") + ".pdf";
          document.body.appendChild(link);link.click();link.remove();
          notifyPersistent("Payment saved. A PDF receipt was downloaded because the print tab was blocked.");
        }
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      } catch (error) {
        if (printWindow && !printWindow.closed) printWindow.close();
        notifyPersistent("Payment was saved, but its PDF receipt could not be generated: " + (error?.message || "Please use Download Receipt."));
      }
    }
  };
  const openEditInstallment = fee => {
    const records = installmentRecords(fee);
    setEditInstallmentTarget(fee);
    setEditInstallmentDrafts(Object.fromEntries(records.map(record => [String(record.id), {
      amount: String(record.amount ?? 0),
      dueDate: record.dueDate ? String(record.dueDate).slice(0, 10) : "",
      reference: String(record.reference || record.metadata?.notes || "")
    }])));
  };
  const saveEditInstallment = async () => {
    if (!editInstallmentTarget || editInstallmentBusy) return;
    const records = installmentRecords(editInstallmentTarget);
    const payload = records.map(record => {
      const draft = editInstallmentDrafts[String(record.id)] || {};
      return { feeId: String(record.id), amount: Number(draft.amount), dueDate: draft.dueDate, reference: draft.reference };
    });
    const invalid = payload.find(item => !Number.isFinite(item.amount) || item.amount < 0);
    if (invalid) { notify("Enter valid non-negative fee amounts."); return; }
    setEditInstallmentBusy(true);
    try {
      const result = await apiPatch("/fees/update-installment", { records: payload });
      const updatedById = new Map((Array.isArray(result.fees) ? result.fees : []).map(item => [String(item.id), item]));
      setFeeRecords(previous => previous.map(item => updatedById.has(String(item.id)) ? { ...item, ...updatedById.get(String(item.id)) } : item));
      setEditInstallmentTarget(null);
      notify("Installment details saved.");
    } catch (error) { notify("Installment could not be saved: " + (error?.message || "Please try again.")); }
    finally { setEditInstallmentBusy(false); }
  };
  const deleteInstallment = async fee => {
    const records = installmentRecords(fee);
    if (records.some(record => Number(record.amountPaid || 0) > 0)) {
      notify("Reverse any payments for this installment before deleting it.");
      return;
    }
    const templateBacked = Boolean(fee.metadata?.feeTemplateId);
    const prompt = templateBacked
      ? "Delete this unpaid installment and its fee-type rows? Other installments from this template will remain."
      : "Delete this unpaid fee record? This cannot be undone.";
    if (!window.confirm(prompt)) return;
    setFeeMutationBusyId(String(fee.id));
    try {
      if (templateBacked) await apiDelete("/fees/" + encodeURIComponent(fee.id) + "/installment");
      else await apiDelete("/fees/" + encodeURIComponent(fee.id));
      const idsToRemove = new Set(records.map(record => String(record.id)));
      setFeeRecords(previous => previous.filter(record => !idsToRemove.has(String(record.id))));
      notify(templateBacked ? "Installment deleted. Other fee-template installments were kept." : "Fee record deleted.");
    } catch (error) { notify("Installment could not be deleted: " + (error?.message || "Please try again.")); }
    finally { setFeeMutationBusyId(""); }
  };
  const getInstallmentReceiptData = async fee => {
    const records = installmentRecords(fee);
    const histories = records.flatMap(record => (Array.isArray(record.metadata?.paymentHistory) ? record.metadata.paymentHistory : []).map(entry => ({...entry, _feeId:record.id})))
      .filter(entry => Number(entry.amountPaid || 0) > 0)
      .sort((a,b) => String(b.recordedAt || b.paymentDate || "").localeCompare(String(a.recordedAt || a.paymentDate || "")));
    const latestReceiptNumber = histories.find(entry => entry.receiptNumber)?.receiptNumber || "";
    const query = latestReceiptNumber ? "?receiptNumber=" + encodeURIComponent(latestReceiptNumber) : "";
    return apiGet("/fees/" + encodeURIComponent(fee.id) + "/receipt-data" + query);
  };
  const downloadInstallmentReceipt = async fee => {
    if (receiptBusyId) return;
    setReceiptBusyId(String(fee.id));
    try {
      const receipt = await getInstallmentReceiptData(fee);
      const logo = receipt.feeReceiptTemplate?.receiptSettings?.showSchoolLogo === false ? null : await receiptLogoAsJpeg(receipt.school?.logo);
      const pdf = buildFeeReceiptPdf(receipt, logo);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Fee-Receipt-" + String(receipt.student?.id || "student").replace(/[^a-z0-9-]/gi, "-") + "-" + String(receipt.receiptNumber || "receipt").replace(/[^a-z0-9-]/gi, "-") + ".pdf";
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      notify("PDF receipt downloaded using current school, student, and payment data.");
    } catch (error) {
      notify("Receipt PDF could not be generated: " + (error?.message || "Please check the saved payment details."));
    } finally {
      setReceiptBusyId("");
    }
  };
  const openPaymentDetails = async fee => {
    if (paymentDetailsLoading) return;
    setPaymentDetailsLoading(true);
    setViewInstallmentTarget({loading:true, feeId:String(fee.id), installmentName:fee.metadata?.installmentName || fee.metadata?.templateFeeItems?.[0]?.originalInstallment || ""});
    try {
      const receipt = await getInstallmentReceiptData(fee);
      setViewInstallmentTarget({...receipt, loading:false});
    } catch (error) {
      setViewInstallmentTarget(null);
      notify("Payment details could not be loaded from the database: " + (error?.message || "Please try again."));
    } finally {
      setPaymentDetailsLoading(false);
    }
  };
  const openApplyFeeTemplate = async () => {
    setApplyFeeTemplateError("");
    setReplaceExistingTemplate(false);
    try {
      const [templateResult, typeResult, ledgerResult] = await Promise.all([
        apiGet("/module-data/manage-fee-templates"),
        apiGet("/module-data/manage-fee-types"),
        apiGet(`/fees?studentCode=${encodeURIComponent(student.id)}`)
      ]);
      const currentFees = Array.isArray(ledgerResult?.fees) ? ledgerResult.fees : [];
      setFeeRecords(currentFees);
      const existingTemplateFees = currentFees.filter(fee => String(fee.metadata?.feeTemplateId || "").trim());
      const templates = Array.isArray(templateResult?.data?.items) ? templateResult.data.items : [];
      if (!templates.length) { notifyPersistent("No saved fee templates were found. Create a template under My Branch first."); return; }
      if (existingTemplateFees.some(fee => Number(fee.amountPaid || 0) > 0)) {
        notifyPersistent("A fee template is already assigned and has recorded payments. Reverse all payments using Check Payment Details first; then click Apply Fee Template again to replace it.");
        return;
      }
      setReplaceExistingTemplate(existingTemplateFees.length > 0);
      setAvailableFeeTemplates(templates);
      setAvailableFeeTypes(Array.isArray(typeResult?.data?.items) ? typeResult.data.items : []);
      setSelectedFeeTemplateId(String(templates[0].id));
      setShowApplyFeeTemplate(true);
    } catch (error) { notifyPersistent(`Fee template choices could not be loaded: ${error.message}`); }
  };
  const applyFeeTemplateToStudent = async () => {
    const template = availableFeeTemplates.find(item => String(item.id) === String(selectedFeeTemplateId));
    if (!template) { setApplyFeeTemplateError("Choose a fee template."); return; }
    const items = (template.installments || []).flatMap(installment => (installment.fees || [])
      .filter(line => line.feeTypeId && String(line.amount).trim() !== "" && Number.isFinite(Number(line.amount)) && Number(line.amount) >= 0)
      .map(line => {
        const feeType = availableFeeTypes.find(type => String(type.id) === String(line.feeTypeId));
        const taxes = feeType?.taxes || line.taxes || {};
        const baseAmount = Math.max(0, Number(line.amount || 0));
        const discountValue = Math.max(0, Number(line.discountValue || 0));
        const rawDiscountAmount = line.discountType === "Percentage"
          ? Math.min(baseAmount, baseAmount * Math.min(discountValue, 100) / 100)
          : line.discountType === "Fixed Amount" ? Math.min(baseAmount, discountValue) : 0;
        const discountAmount = Math.round(rawDiscountAmount * 100) / 100;
        const taxable = Math.max(0, baseAmount - discountAmount);
        const taxRate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
        const taxAmount = Math.round(taxable * taxRate) / 100;
        return {
          feeTypeId: String(line.feeTypeId), name: line.feeTypeName || feeType?.name || "Fee",
          baseAmount, discountType: line.discountType || "Default Discount", discountValue,
          discountAmount,
          taxAmount: Math.round(taxAmount * 100) / 100,
          taxes: { cgst: Boolean(taxes.cgst), sgst: Boolean(taxes.sgst), igst: Boolean(taxes.igst) },
          notes: String(line.notes || "").trim(),
          originalInstallment: String(installment.installment || ""),
          originalDueDate: installment.dueDate || null,
          installmentNotes: String(installment.notes || "").trim()
        };
      }));
    if (!items.length) { setApplyFeeTemplateError("This template has no saved fee rows."); return; }
    const subAmount = Math.round(items.reduce((sum, item) => sum + item.baseAmount, 0) * 100) / 100;
    const discount = Math.round(items.reduce((sum, item) => sum + item.discountAmount, 0) * 100) / 100;
    const appliedTaxes = Math.round(items.reduce((sum, item) => sum + item.taxAmount, 0) * 100) / 100;
    const lateFeeCharges = 0;
    const totalAmount = Math.round((subAmount - discount + appliedTaxes + lateFeeCharges) * 100) / 100;
    const feeName = [...new Set(items.map(item => item.name).filter(Boolean))].join(", ").slice(0, 240);
    const dueDate = items.map(item => item.originalDueDate).filter(Boolean).sort()[0] || null;
    const notes = [...new Set(items.flatMap(item => [item.installmentNotes, item.notes]).filter(Boolean))].join(" | ").slice(0, 500);
    if (!feeName || subAmount <= 0 || discount > subAmount || !Number.isFinite(totalAmount)) { setApplyFeeTemplateError("The combined fee amount or discount is not valid."); return; }
    setApplyFeeTemplateBusy(true);
    setApplyFeeTemplateError("");
    try {
      const result = await apiPost("/fees/apply-template", {
        templateId: String(template.id), templateName: template.name,
        academicYear: template.academicYear || data.academicYear,
        replaceExistingTemplate,
        installmentName: "Multiple Installments", studentCodes: [String(student.id)],
        feeName, subAmount, discount, appliedTaxes, lateFeeCharges, dueDate, notes, feeItems: items
      });
      await refreshFeeRecords();
      setShowApplyFeeTemplate(false);
      setReplaceExistingTemplate(false);
      const installmentCount = new Set(items.map(item => item.originalInstallment).filter(Boolean)).size || 1;
      const rowsCreated = Number(result.feeRecordsCreated || items.length);
      notifyPersistent(`Fee template applied: ${rowsCreated} fee row(s) created across ${installmentCount} original installment(s). Total amount: ${formatMoney(totalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
    } catch (error) { setApplyFeeTemplateError(error.message || "Fee template could not be applied."); }
    finally { setApplyFeeTemplateBusy(false); }
  };
  const exportFeeCsv = (kind = "all") => {
    const inSelectedYear = feeRecords.filter(f => !f.academicYear || f.academicYear === data.academicYear);
    const eligible = inSelectedYear.filter(f => {
      const amount = Number(f.amount || 0), paid = Number(f.amountPaid || 0);
      if (kind === "paid") return amount > 0 ? paid >= amount : String(f.status).toLowerCase() === "paid";
      if (kind === "due") return paid < amount || ["pending", "unpaid", "partial"].includes(String(f.status || "").toLowerCase());
      return true;
    });
    if (!eligible.length) {
      notify(`No ${kind === "all" ? "" : kind + " "}fee records are available to export for ${data.academicYear}.`);
      return;
    }
    const headers = ["Student ID","Student Name","Fee Name","Academic Year","Amount","Amount Paid","Balance","Due Date","Status","Reference"];
    const rows = eligible.map(f => [student.id,student.name,f.feeName,f.academicYear,f.amount,f.amountPaid,Math.max(0,Number(f.amount)-Number(f.amountPaid)),f.dueDate,f.status,f.reference]);
    downloadCsvFile(`fees-${kind}-${student.id}.csv`, [headers, ...rows]);
  };

  return <div className="legacy-app student-edit-page">
    <LegacyHeader />
    <LegacySidebar onBack={onBack} onNotify={notify} onModuleSelect={onOpenModule} onOpenAdmission={onOpenAdmission} activeModule={activeModule}/>
    <main className="legacy-main">
      <div className="legacy-page-heading">
        <div className="legacy-heading-stack">
          <h1>{t("Edit contact details")}</h1>
          <p className="student-edit-subtitle">{t("Update student information and profile details")}</p>
        </div>
        <span className="legacy-student-pill">{t("Student:")} {shortName} ({t("ID:")} {student.id})</span>
      </div>
      <nav className="legacy-tabs student-edit-tabs" aria-label={t("Student details sections")}>{editTabs.map(tabName => <button key={tabName} className={tab === tabName ? "active" : ""} onClick={() => setTab(tabName)}>{t(tabName)}</button>)}</nav>
      {tab === "Student Details" && <StudentDetailsTab context={{ t, data, update, classOptions, photo, photoSaving, handleStudentPhotoUpload, onSave, onOpenAdmission, shortName, notify, saving, save }} />}
      {tab !== "Student Details" && <section className="legacy-tab-content">
        {tab === "Parent" && <StudentParentTab context={{ t, data, setData, update, saving, save }} />}
        {tab === "Fees" && <StudentFeesTab context={{ t, data, update, sendFeeReminder, feeReminderBusy, exportFeeCsv, studentFeeTotals, formatFeeMoney, currentTemplateAssignment, openApplyFeeTemplate, setFeeAction, notify, feesLoading, studentFeeInstallmentRows, templateHasPaidAmount, guideFeeCheckboxes: feeCheckboxGuideActive, onFeeCheckboxSelected: () => { clearSavedToast(); }, guideTemplatePaymentButtons: feeTemplatePaymentGuidanceNotification, onTemplatePaymentDetailsSelected: () => { clearSavedToast(); }, paymentBusy, feeMutationBusyId, openInstallmentPayment, openEditInstallment, deleteInstallment, receiptBusyId, downloadInstallmentReceipt, paymentDetailsLoading, openPaymentDetails, saving, save }} />}
        {tab === "Installmentwise Fee Summary" && <StudentFeeSummaryTab context={{ t, data, update, studentFeeTotals, formatFeeMoney, feesLoading, feeRecords, exportFeeCsv }} />}
        {tab === "Day Care" && <StudentDayCareTab context={{ t, data, update, saving, save }} />}
        {tab === "Transport" && <StudentTransportTab context={{ t, data, update, saving, save }} />}
        {tab === "Immunization Schedule" && <StudentImmunizationTab context={{ t, data, setVaccine, setEditingVaccine, setShowImmunization, update }} />}
      </section>}
      <FeePaymentDialog context={{ paymentTarget, setPaymentTarget, paymentBusy, student, shortName, t, paymentMethod, setPaymentMethod, paymentDate, setPaymentDate, paymentCashDepositNumber, setPaymentCashDepositNumber, paymentNotes, setPaymentNotes, installmentRecords, formatFeeMoney, paymentDrafts, setPaymentDrafts, updatePaymentLateFee, submitInstallmentPayment }} />
      <EditInstallmentDialog context={{ editInstallmentTarget, editInstallmentBusy, setEditInstallmentTarget, student, shortName, t, installmentRecords, editInstallmentDrafts, setEditInstallmentDrafts, saveEditInstallment }} />
      <PaymentDetailsDialog context={{ viewInstallmentTarget, setViewInstallmentTarget, student, shortName, paymentDetailsLoading, t, feeRecords, feeMutationBusyId, reverseFeePayment }} />
      <StudentApplyFeeTemplateDialog context={{ showApplyFeeTemplate, setShowApplyFeeTemplate, applyFeeTemplateBusy, student, data, t, selectedFeeTemplateId, setSelectedFeeTemplateId, availableFeeTemplates, applyFeeTemplateError, formatFeeMoney, applyFeeTemplateToStudent, availableFeeTypes, replaceExistingTemplate }} />
      <ImmunizationScheduleDialog context={{ showImmunization, setShowImmunization, vaccine, setVaccine, editingVaccine, t, notify, data, update }} />
      {savedToast && (
        <div className={`student-edit-notification-dialog${feeCheckboxGuidanceNotification ? " is-fee-guidance" : ""}${feeTemplatePaymentGuidanceNotification ? " is-fee-payment-guidance" : ""}`} role="alert" aria-live="assertive">
          {feeCheckboxGuidanceNotification || feeTemplatePaymentGuidanceNotification ? <AlertCircle size={19} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span className="student-edit-notification-message">{savedToast}</span>
          {((feeCheckboxGuidanceNotification && feeCheckboxGuideActive) || feeTemplatePaymentGuidanceNotification) && <span className={`student-edit-notification-pointer${feeTemplatePaymentGuidanceNotification ? " fee-template-payment-pointer" : ""}`} aria-hidden="true">↓</span>}
          <button
            type="button"
            className="student-edit-notification-close"
            aria-label={t("Close notification")}
            title={t("Close notification")}
            onClick={clearSavedToast}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

    </main>
  </div>;
}

const admissionSections = [
  ["photo", "Student photo"], ["name", "Name + Gender"], ["dob", "Date of birth"], ["contact", "Primary contact info"],
  ["father", "Father Information"], ["mother", "Mother Information"], ["class", "Class info"], ["previous", "Previous school info"],
  ["aadhar", "Aadhar + SSSM info"], ["nationality", "Nationality and other details"], ["address", "Address Info"]
];
