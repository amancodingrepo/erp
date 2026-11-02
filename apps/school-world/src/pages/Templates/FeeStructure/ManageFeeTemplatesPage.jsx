import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ClipboardList, Copy, Download, Eye, Pencil, Plus, Search, Trash2, X, Users } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../../api.js";

import FeeTemplateListView from "./FeeTemplateListView.jsx";
import FeeTemplateEditorView from "./FeeTemplateEditorView.jsx";
import FeeTemplateInstallmentDialog from "./FeeTemplateInstallmentDialog.jsx";
import ApplyFeeTemplateWorkspace from "./ApplyFeeTemplateWorkspace.jsx";
import { makeId, blankLine, blankInstallment, emptyTemplate, labelForStudentType, money, taxLabels, discountFor, subtotalForLine, summarizeInstallment, deepCopy, xmlEscape, downloadXls, academicYearOf, studentIdentity, studentIsActive, studentClassKey, studentClassLabel, studentNationalityKey, studentParentClassification, studentMatchesTemplate } from "./feeTemplateUtils.js";

export default function ManageFeeTemplatesPage({ onBack, notify, t, students = [] }) {
  const text = typeof t === "function" ? t : value => value;
  const [templates, setTemplates] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStudentType, setFilterStudentType] = useState("");
  const [screen, setScreen] = useState("list");
  const [draft, setDraft] = useState(emptyTemplate("2026-2027"));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installmentModal, setInstallmentModal] = useState(false);
  const [installmentDraft, setInstallmentDraft] = useState(blankInstallment);
  const [applyTemplateId, setApplyTemplateId] = useState("");
  const [applyClass, setApplyClass] = useState("");
  const [applyClassSelectedKeys, setApplyClassSelectedKeys] = useState([]);
  const [applyStudentType, setApplyStudentType] = useState("All Students");
  const [applyParentType, setApplyParentType] = useState("All");
  const [applyNationalities, setApplyNationalities] = useState([]);
  const [applyNationalityOpen, setApplyNationalityOpen] = useState(false);
  const [applySelectedIds, setApplySelectedIds] = useState([]);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyProgress, setApplyProgress] = useState("");
  const [templateAssignments, setTemplateAssignments] = useState({});
  const [assignmentLoadError, setAssignmentLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet("/module-data/manage-fee-templates"),
      apiGet("/module-data/manage-fee-types")
    ]).then(([templateResult, typeResult]) => {
      if (cancelled) return;
      const savedTemplates = Array.isArray(templateResult?.data?.items) ? templateResult.data.items : [];
      const savedTypes = Array.isArray(typeResult?.data?.items) ? typeResult.data.items : [];
      setTemplates(savedTemplates.map(item => ({
        ...item,
        id: String(item.id || makeId("fee-template")),
        name: String(item.name || ""),
        academicYear: String(item.academicYear || "2026-2027"),
        studentType: ["New Students", "Existing Students"].includes(item.studentType) ? item.studentType : "All Students",
        hasOptionalFees: Boolean(item.hasOptionalFees),
        isMonthlyTemplate: Boolean(item.isMonthlyTemplate),
        installments: Array.isArray(item.installments) ? item.installments : []
      })));
      setFeeTypes(savedTypes.filter(item => item.visible !== false).map(item => ({
        ...item, id: String(item.id), name: String(item.name || ""),
        taxes: { cgst: Boolean(item.taxes?.cgst), sgst: Boolean(item.taxes?.sgst), igst: Boolean(item.taxes?.igst) }
      })));
    }).catch(error => {
      if (!cancelled) setLoadError(error.message || "Fee templates or fee types could not be loaded.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function assignmentsFromFeeRows(fees) {
    const next = {};
    (Array.isArray(fees) ? fees : []).filter(fee => fee.metadata?.feeTemplateId).forEach(fee => {
      const key = String(fee.studentCode || "");
      if (!key) return;
      if (!next[key]) {
        next[key] = { templateId: String(fee.metadata.feeTemplateId), templateName: fee.metadata.feeTemplateName || fee.feeName || "Fee template", feeId: fee.id, amountPaid: Number(fee.amountPaid || 0) };
      } else if (next[key].templateId !== String(fee.metadata.feeTemplateId)) {
        next[key] = { ...next[key], templateName: next[key].templateName + ", " + (fee.metadata.feeTemplateName || "another template"), multipleAssignments: true };
      }
    });
    return next;
  }
  function assignedTemplateForStudent(student, assignmentRows = templateAssignments) {
    const keys = [studentIdentity(student), student?.studentCode, student?.id, student?.studentId, student?.enrollmentNumber]
      .filter(value => value !== undefined && value !== null && String(value).trim() !== "").map(String);
    return keys.map(key => assignmentRows[key]).find(Boolean) || null;
  }
  async function refreshTemplateAssignments() {
    try {
      const result = await apiGet("/fees");
      const next = assignmentsFromFeeRows(result?.fees);
      setTemplateAssignments(next);
      setAssignmentLoadError("");
      return next;
    } catch (error) {
      setAssignmentLoadError(error.message || "Existing fee-template assignments could not be checked.");
      return null;
    }
  }
  useEffect(() => {
    let cancelled = false;
    apiGet("/fees").then(result => {
      if (cancelled) return;
      setTemplateAssignments(assignmentsFromFeeRows(result?.fees));
      setAssignmentLoadError("");
    }).catch(error => {
      if (!cancelled) setAssignmentLoadError(error.message || "Existing fee-template assignments could not be checked.");
    });
    return () => { cancelled = true; };
  }, []);

  const academicYears = useMemo(() => [...new Set(["2026-2027", ...students.map(student => student.academicYear), ...templates.map(item => item.academicYear)].filter(Boolean))].sort((a, b) => b.localeCompare(a)), [students, templates]);
  const classOptions = useMemo(() => {
    const rows = new Map();
    students.forEach(student => {
      const className = String(student.className || student.class || "").trim();
      if (!className) return;
      const section = String(student.section || "").trim();
      const key = studentClassKey(student);
      if (!rows.has(key)) rows.set(key, { key, className, section, label: studentClassLabel(className, section) });
    });
    return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
  }, [students]);
  const nationalityOptions = useMemo(() => {
    const rows = new Map();
    students.forEach(student => {
      const raw = String(student.nationality || "").trim();
      const key = raw.toLowerCase() || "__not_specified__";
      if (!rows.has(key)) rows.set(key, { key, label: raw || "Not Specified" });
    });
    return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [students]);
  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(item =>
      (!filterYear || item.academicYear === filterYear) &&
      (!filterStudentType || item.studentType === filterStudentType) &&
      (!q || [item.name, item.academicYear, item.studentType].join(" ").toLowerCase().includes(q))
    ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  }, [templates, query, filterYear, filterStudentType]);

  const applyTemplate = templates.find(item => item.id === applyTemplateId) || null;
  const applyClassRow = classOptions.find(item => item.key === applyClass) || null;

  function matchesApplyFilters(student, overrides = {}) {
    const chosenTemplate = overrides.template || applyTemplate;
    const chosenType = overrides.studentType ?? applyStudentType;
    const chosenParentType = overrides.parentType ?? applyParentType;
    const chosenNationalities = overrides.nationalities ?? applyNationalities;
    if (!chosenTemplate || !studentIsActive(student)) return false;
    if (chosenType !== "All Students" && !studentMatchesTemplate(student, { ...chosenTemplate, studentType: chosenType })) return false;
    if (!chosenNationalities.includes(studentNationalityKey(student))) return false;
    if (chosenParentType !== "All" && studentParentClassification(student) !== (chosenParentType === "Staff Parent" ? "staff" : "non-staff")) return false;
    return true;
  }

  const applyStudentCandidates = useMemo(() => {
    if (!applyClass) return [];
    return students.filter(student => studentClassKey(student) === applyClass && studentIsActive(student) && studentIdentity(student))
      .sort((a, b) => String(a.name || a.fullName || "").localeCompare(String(b.name || b.fullName || ""), undefined, { sensitivity: "base" }));
  }, [students, applyClass]);

  const selectedApplyStudents = useMemo(() => students
    .filter(student => studentIsActive(student) && studentIdentity(student) && applySelectedIds.includes(studentIdentity(student)) && !assignedTemplateForStudent(student))
    .sort((a, b) => String(a.name || a.fullName || "").localeCompare(String(b.name || b.fullName || ""), undefined, { sensitivity: "base" })),
  [students, applySelectedIds, templateAssignments]);

  const applyClassBulkCandidates = useMemo(() => {
    const chosenClasses = new Set(applyClassSelectedKeys);
    return students.filter(student => chosenClasses.has(studentClassKey(student)) && studentIdentity(student) && matchesApplyFilters(student) && !assignedTemplateForStudent(student))
      .sort((a, b) => String(a.name || a.fullName || "").localeCompare(String(b.name || b.fullName || ""), undefined, { sensitivity: "base" }));
  }, [students, applyClassSelectedKeys, applyStudentType, applyParentType, applyNationalities, applyTemplate, templateAssignments]);

  const eligibleStudentsInClass = applyStudentCandidates.filter(student => !assignedTemplateForStudent(student));

  const allApplySelected = eligibleStudentsInClass.length > 0 &&
    eligibleStudentsInClass.every(student => applySelectedIds.includes(studentIdentity(student)));

  function updateApplyFilters(changes) {
    const next = {
      template: Object.prototype.hasOwnProperty.call(changes, "template") ? changes.template : applyTemplate,
      studentType: Object.prototype.hasOwnProperty.call(changes, "studentType") ? changes.studentType : applyStudentType,
      parentType: Object.prototype.hasOwnProperty.call(changes, "parentType") ? changes.parentType : applyParentType,
      nationalities: Object.prototype.hasOwnProperty.call(changes, "nationalities") ? changes.nationalities : applyNationalities
    };
    if (Object.prototype.hasOwnProperty.call(changes, "studentType")) setApplyStudentType(changes.studentType);
    if (Object.prototype.hasOwnProperty.call(changes, "parentType")) setApplyParentType(changes.parentType);
    if (Object.prototype.hasOwnProperty.call(changes, "nationalities")) setApplyNationalities(changes.nationalities);
    if (Object.prototype.hasOwnProperty.call(changes, "template")) setApplyTemplateId(changes.template?.id || "");
    if (screen === "apply-students" && applyClass) {
      setApplySelectedIds(students
        .filter(student => studentClassKey(student) === applyClass && studentIdentity(student) && matchesApplyFilters(student, next) && !assignedTemplateForStudent(student))
        .map(studentIdentity));
    }
  }

  function enterApplyClass(classRow) {
    setApplyClass(classRow.key);
    setApplySelectedIds(students
      .filter(student => studentClassKey(student) === classRow.key && studentIdentity(student) && matchesApplyFilters(student) && !assignedTemplateForStudent(student))
      .map(studentIdentity));
    setApplyNationalityOpen(false);
    setScreen("apply-students");
  }

  function finishApplyToClasses() {
    setScreen("list");
    setApplyTemplateId("");
    setApplyClass("");
    setApplyClassSelectedKeys([]);
    setApplySelectedIds([]);
    setApplyNationalityOpen(false);
  }

  function changeApplyTemplate(templateId) {
    const nextTemplate = templates.find(item => item.id === templateId);
    if (!nextTemplate) return;
    const nextType = nextTemplate.studentType || "All Students";
    updateApplyFilters({ template: nextTemplate, studentType: nextType });
  }

  async function persist(nextRows, successMessage) {
    if (loadError) { notify?.("Templates were not changed because saved template data could not be loaded. Refresh and try again."); return false; }
    setSaving(true);
    try {
      await apiPut("/module-data/manage-fee-templates", { data: { items: nextRows } });
      setTemplates(nextRows);
      setLoadError("");
      notify?.(successMessage);
      return true;
    } catch (error) {
      notify?.("Fee template could not be saved: " + (error.message || "Please try again."));
      return false;
    } finally { setSaving(false); }
  }
  function goBackToList() {
    if (dirty && !window.confirm("Discard unsaved fee template changes?")) return;
    setScreen("list");
    setDirty(false);
  }
  function createTemplate() {
    if (loadError) { notify?.("Saved fee templates could not be loaded. Refresh before editing."); return; }
    setDraft(emptyTemplate(academicYears[0] || "2026-2027"));
    setDirty(false);
    setScreen("editor");
  }
  function editTemplate(item) {
    setDraft(deepCopy(item));
    setDirty(false);
    setScreen("editor");
  }
  function updateDraft(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setDirty(true);
  }
  async function saveTemplate(event) {
    event.preventDefault();
    const name = String(draft.name || "").trim();
    if (!name) { notify?.("Enter a fee template name."); return; }
    if (templates.some(item => item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== draft.id && item.academicYear === draft.academicYear)) {
      notify?.("A fee template with this name already exists for this academic year.");
      return;
    }
    const now = new Date().toISOString();
    const saved = {
      ...deepCopy(draft),
      id: draft.id || makeId("fee-template"),
      name,
      academicYear: draft.academicYear || "2026-2027",
      studentType: draft.studentType || "All Students",
      hasOptionalFees: Boolean(draft.hasOptionalFees),
      isMonthlyTemplate: Boolean(draft.isMonthlyTemplate),
      installments: (draft.installments || []).map(installment => ({
        ...installment,
        id: installment.id || makeId("installment"),
        fees: (installment.fees || []).map(line => ({ ...line, id: line.id || makeId("fee-line") }))
      })),
      createdAt: draft.createdAt || now,
      updatedAt: now
    };
    const next = saved.id === draft.id && draft.id
      ? templates.map(item => item.id === saved.id ? saved : item)
      : [...templates, saved];
    if (await persist(next, "Fee template saved.")) {
      setDraft(saved);
      setDirty(false);
    }
  }
  function startInstallmentAdd() {
    if (!draft.name.trim()) { notify?.("Enter the fee template name before adding installments."); return; }
    if (!feeTypes.length) { notify?.("Create at least one visible fee type in Manage Fee Types first."); return; }
    setInstallmentDraft(blankInstallment());
    setInstallmentModal(true);
  }
  function startInstallmentEdit(item) {
    const copy = deepCopy(item);
    copy.fees = (copy.fees || []).map(line => ({ ...line, taxes: { cgst: Boolean(line.taxes?.cgst), sgst: Boolean(line.taxes?.sgst), igst: Boolean(line.taxes?.igst) } }));
    setInstallmentDraft(copy);
    setInstallmentModal(true);
  }
  function updateInstallmentLine(lineId, key, value) {
    setInstallmentDraft(previous => ({
      ...previous,
      fees: previous.fees.map(line => {
        if (line.id !== lineId) return line;
        if (key === "feeTypeId") {
          const feeType = feeTypes.find(item => item.id === value);
          return { ...line, feeTypeId: value, feeTypeName: feeType?.name || "", taxes: feeType ? { ...feeType.taxes } : { cgst: false, sgst: false, igst: false } };
        }
        return { ...line, [key]: value };
      })
    }));
  }
  function saveInstallment(event) {
    event.preventDefault();
    const fees = (installmentDraft.fees || []).filter(line => line.feeTypeId && String(line.amount).trim() !== "");
    if (!fees.length) { notify?.("Add at least one fee type and amount to this installment."); return; }
    for (const line of fees) {
      if (!Number.isFinite(Number(line.amount)) || Number(line.amount) < 0) { notify?.("Each fee amount must be zero or greater."); return; }
      if (!Number.isFinite(Number(line.discountValue || 0)) || Number(line.discountValue || 0) < 0 || (line.discountType === "Percentage" && Number(line.discountValue) > 100)) {
        notify?.("Enter a valid discount. Percentage discount cannot exceed 100%.");
        return;
      }
    }
    const saved = {
      ...deepCopy(installmentDraft),
      id: installmentDraft.id || makeId("installment"),
      installment: installmentDraft.installment || "First",
      dueDate: installmentDraft.dueDate || "",
      notes: String(installmentDraft.notes || "").trim(),
      fees: fees.map(line => ({ ...line, id: line.id || makeId("fee-line"), amount: Number(line.amount), discountValue: Number(line.discountValue || 0) }))
    };
    setDraft(previous => ({
      ...previous,
      installments: saved.id && previous.installments.some(item => item.id === saved.id)
        ? previous.installments.map(item => item.id === saved.id ? saved : item)
        : [...previous.installments, saved]
    }));
    setDirty(true);
    setInstallmentModal(false);
    notify?.(installmentDraft.id ? "Installment updated. Submit the template to save changes." : "Installment added. Submit the template to save changes.");
  }
  function removeInstallment(item) {
    if (!window.confirm("Remove installment \"" + item.installment + "\" from this template?")) return;
    updateDraft("installments", draft.installments.filter(row => row.id !== item.id));
  }
  async function copyTemplate(template) {
    const copy = {
      ...deepCopy(template), id: makeId("fee-template"), name: "Copy of " + template.name,
      installments: (template.installments || []).map(item => ({ ...deepCopy(item), id: makeId("installment"), fees: (item.fees || []).map(line => ({ ...deepCopy(line), id: makeId("fee-line") })) })),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const next = [...templates, copy];
    await persist(next, "Template copied. Rename the copy if needed.");
  }
  function exportTemplate(template) {
    const rows = (template.installments || []).flatMap(installment => (installment.fees || []).map(line => ({
      templateName: template.name, academicYear: template.academicYear, studentType: template.studentType,
      installment: installment.installment, dueDate: installment.dueDate,
      feeType: line.feeTypeName || feeTypes.find(type => type.id === line.feeTypeId)?.name || "",
      amount: Number(line.amount || 0), discountType: line.discountType || "Default Discount",
      discount: discountFor(line), taxes: taxLabels(line.taxes).join(", "), notes: [installment.notes, line.notes].filter(Boolean).join(" · ")
    })));
    if (!rows.length) { notify?.("Add at least one installment before exporting this template."); return; }
    downloadXls(template.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + "-fee-template.xls", template.name, rows, [
      { key: "templateName", label: "Fee Template" }, { key: "academicYear", label: "Academic Year" }, { key: "studentType", label: "Apply to Student Type" },
      { key: "installment", label: "Installment" }, { key: "dueDate", label: "Due Date" }, { key: "feeType", label: "Fee Type" },
      { key: "amount", label: "Amount", numeric: true }, { key: "discountType", label: "Discount Type" }, { key: "discount", label: "Discount", numeric: true },
      { key: "taxes", label: "Applied Taxes" }, { key: "notes", label: "Notes" }
    ]);
    notify?.("Fee template Excel file downloaded.");
  }
  function openApply(template) {
    if (!template.installments?.some(installment => installment.fees?.some(line => line.feeTypeId && Number(line.amount) >= 0))) {
      notify?.("Add and save at least one installment before applying this template.");
      return;
    }
    setApplyTemplateId(template.id);
    setApplyClass("");
    setApplyClassSelectedKeys([]);
    setApplyStudentType(template.studentType || "All Students");
    setApplyParentType("All");
    setApplyNationalities(nationalityOptions.map(option => option.key));
    setApplySelectedIds([]);
    setApplyProgress("");
    setApplyNationalityOpen(false);
    setScreen("apply-classes");
  }

  async function runApplyTemplate(targetStudents = selectedApplyStudents) {
    if (!applyTemplate || !targetStudents.length) {
      notify?.(screen === "apply-classes" ? "Select at least one class with eligible students." : "Select at least one eligible student.");
      return;
    }
    const uniqueTargets = [...new Map(targetStudents.map(student => [studentIdentity(student), student]).filter(([id]) => Boolean(id))).values()].filter(studentIsActive);
    if (!uniqueTargets.length) { notify?.("No eligible students match the current Apply filters."); return; }
    const freshAssignments = await refreshTemplateAssignments();
    if (!freshAssignments) {
      notify?.("Existing template assignments could not be verified. Retry after the fee ledger loads; no fees were applied.");
      return;
    }
    const alreadyAssigned = uniqueTargets.filter(student => assignedTemplateForStudent(student, freshAssignments));
    if (alreadyAssigned.length) {
      notify?.("Template not applied. These student(s) already have a fee template: " + alreadyAssigned.map(student => student.name || student.fullName || studentIdentity(student)).join(", ") + ". Reverse linked payments and remove the existing template first.");
      return;
    }
    const feeLines = (applyTemplate.installments || []).flatMap(installment => (installment.fees || [])
      .filter(line => line.feeTypeId && String(line.amount).trim() !== "" && Number.isFinite(Number(line.amount)) && Number(line.amount) >= 0)
      .map(line => {
        const feeType = feeTypes.find(type => type.id === line.feeTypeId);
        const taxes = feeType?.taxes || line.taxes || {};
        const baseAmount = Math.max(0, Number(line.amount || 0));
        const discountAmount = discountFor({ ...line, amount: baseAmount });
        const taxableAmount = Math.max(0, baseAmount - discountAmount);
        const taxRate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
        const taxAmount = Math.round(taxableAmount * taxRate) / 100;
        return {
          feeTypeId: line.feeTypeId,
          name: line.feeTypeName || feeType?.name || "Fee",
          baseAmount,
          discountType: line.discountType || "Default Discount",
          discountValue: Number(line.discountValue || 0),
          discountAmount: Math.round(discountAmount * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          taxes: { cgst: Boolean(taxes.cgst), sgst: Boolean(taxes.sgst), igst: Boolean(taxes.igst) },
          notes: String(line.notes || "").trim(),
          originalInstallment: String(installment.installment || ""),
          originalDueDate: installment.dueDate || null,
          installmentNotes: String(installment.notes || "").trim()
        };
      }));
    if (!feeLines.length) { notify?.("This template has no saved fee rows."); return; }
    const subAmount = Math.round(feeLines.reduce((sum, line) => sum + line.baseAmount, 0) * 100) / 100;
    const discount = Math.round(feeLines.reduce((sum, line) => sum + line.discountAmount, 0) * 100) / 100;
    const appliedTaxes = Math.round(feeLines.reduce((sum, line) => sum + line.taxAmount, 0) * 100) / 100;
    const lateFeeCharges = 0;
    const totalAmount = Math.round((subAmount - discount + appliedTaxes + lateFeeCharges) * 100) / 100;
    const feeNames = [...new Set(feeLines.map(line => line.name).filter(Boolean))];
    const feeName = feeNames.join(", ").slice(0, 240);
    const dueDate = feeLines.map(line => line.originalDueDate).filter(Boolean).sort()[0] || null;
    const installmentNames = [...new Set(feeLines.map(line => line.originalInstallment).filter(Boolean))];
    const notes = [...new Set(feeLines.flatMap(line => [line.installmentNotes, line.notes]).filter(Boolean))].join(" | ").slice(0, 500);
    if (!feeName || subAmount <= 0 || discount > subAmount || !Number.isFinite(totalAmount)) {
      notify?.("This template does not produce a valid fee amount. Review fee types, amounts and discounts.");
      return;
    }
    if (uniqueTargets.length > 500) { notify?.("Select no more than 500 students for one template application."); return; }
    const expectedRows = uniqueTargets.length * feeLines.length;
    if (expectedRows > 5000) { notify?.("This application would create too many fee rows. Select fewer students or split the application."); return; }
    if (!window.confirm("Create " + feeLines.length + " fee row(s) across " + Math.max(1, installmentNames.length) + " installment(s) for " + uniqueTargets.length + " student(s), totaling " + money(totalAmount) + " per student using \"" + applyTemplate.name + "\"? Existing template assignments are blocked.")) return;
    setApplyBusy(true);
    setApplyProgress("");
    let succeeded = 0;
    let recordsCreated = 0;
    const errors = [];
    try {
      for (let index = 0; index < uniqueTargets.length; index += 1) {
        const student = uniqueTargets[index];
        const studentCode = student.studentCode || student.id || student.studentId;
        setApplyProgress("Applying to " + (student.name || student.fullName || studentCode) + " (" + (index + 1) + " of " + uniqueTargets.length + ")");
        try {
          const applyResult = await apiPost("/fees/apply-template", {
            templateId: applyTemplate.id, templateName: applyTemplate.name,
            academicYear: applyTemplate.academicYear, installmentName: "Multiple Installments",
            studentCodes: [String(studentCode)], feeName, subAmount, discount,
            appliedTaxes, lateFeeCharges, dueDate, notes, feeItems: feeLines
          });
          succeeded += 1;
          recordsCreated += Number(applyResult.feeRecordsCreated || feeLines.length);
        } catch (error) {
          errors.push((student.name || student.fullName || studentCode) + ": " + (error.message || "Save failed"));
        }
      }
      await refreshTemplateAssignments();
      notify?.("Template application finished: " + succeeded + " student(s) applied, " + recordsCreated + " fee row(s) created across the original installments." + (errors.length ? " " + errors.length + " student(s) failed; first error: " + errors[0] : ""));
      if (!errors.length) {
        setApplySelectedIds([]);
        if (screen === "apply-classes") setApplyClassSelectedKeys([]);
      }
    } catch (error) {
      notify?.("Fee template application stopped: " + (error.message || "Please try again."));
    } finally {
      setApplyBusy(false);
      setApplyProgress("");
    }
  }

  const installmentOptions = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Outstanding", "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const templateTotal = (template) => (template.installments || []).reduce((sum, installment) => sum + summarizeInstallment(installment, feeTypes).amount, 0);
  const templateDiscountTotal = (template) => (template.installments || []).reduce((sum, installment) => sum + summarizeInstallment(installment, feeTypes).discount, 0);

  return <section className="my-branch-feature-view fees-setup-page fees-template-page">
    <button type="button" className="my-branch-back-link" onClick={() => {
      if (screen === "editor") goBackToList();
      else if (screen === "apply-students") { setScreen("apply-classes"); setApplyClass(""); setApplySelectedIds([]); setApplyNationalityOpen(false); }
      else if (screen === "apply-classes") finishApplyToClasses();
      else onBack?.();
    }}><ArrowLeft size={15}/>{screen === "editor" ? text("Back to List") : screen === "apply-students" ? text("Back to Class List") : screen === "apply-classes" ? text("Back to Fee Templates") : text(" Back to Manage your Branch")}</button>
    <section className="fees-setup-header"><div><span className="fees-setup-eyebrow">{text("ADMINISTRATIVE · FEE SETTINGS")}</span>
      <div className="fees-setup-title-line"><span className="fees-setup-title-icon"><CalendarDays size={22}/></span><h2>{text(screen === "editor" ? (draft.id ? "View / Edit Fee Template" : "Add Fee Template") : (screen === "apply-classes" || screen === "apply-students") ? "Apply Fee Template" : "Fee Templates")}</h2></div>
      <p>{text(screen === "editor" ? "Set the student group and academic year, then arrange installment fees, discounts, taxes, notes and due dates." : (screen === "apply-classes" || screen === "apply-students") ? "Choose the fee template, filter recipients, select classes or individual students, and apply the saved installments." : "Create reusable fee schedules, view their installments, apply them to selected students, copy, or export them.")}</p>
    </div>
    {screen === "list" && <button type="button" className="fees-setup-primary" onClick={createTemplate} disabled={loading || Boolean(loadError)}><Plus size={15}/>{text("Create Fee Template")}</button>}</section>
    {loadError && <div className="fees-setup-alert" role="alert">{text("Saved fee template data could not be loaded: " + loadError)} <button type="button" onClick={() => window.location.reload()}>{text("Refresh")}</button></div>}

    {screen === "list" && <FeeTemplateListView context={{ text, filterYear, setFilterYear, academicYears, filterStudentType, setFilterStudentType, filteredTemplates, loading, query, setQuery, templateTotal, editTemplate, openApply, copyTemplate, saving, exportTemplate, templates, onBack }} />}

    {screen === "editor" && <FeeTemplateEditorView context={{ text, draft, updateDraft, academicYears, startInstallmentAdd, saving, loadError, summarizeInstallment, feeTypes, money, startInstallmentEdit, removeInstallment, saveTemplate, goBackToList }} />}

    {installmentModal && <FeeTemplateInstallmentDialog context={{ installmentModal, setInstallmentModal, text, installmentDraft, setInstallmentDraft, saveInstallment, installmentOptions, blankLine, updateInstallmentLine, feeTypes, taxLabels, money, subtotalForLine }} />}

    {(screen === "apply-classes" || screen === "apply-students") && applyTemplate && <ApplyFeeTemplateWorkspace context={{ screen, applyTemplate, text, changeApplyTemplate, applyBusy, templates, applyStudentType, updateApplyFilters, applyNationalityOpen, setApplyNationalityOpen, applyNationalities, nationalityOptions, applyParentType, applyClassRow, assignmentLoadError, refreshTemplateAssignments, classOptions, applyClassSelectedKeys, setApplyClassSelectedKeys, students, studentClassKey, studentIsActive, studentIdentity, assignedTemplateForStudent, enterApplyClass, applyClassBulkCandidates, runApplyTemplate, finishApplyToClasses, applySelectedIds, setApplySelectedIds, eligibleStudentsInClass, applyStudentCandidates, studentParentClassification, applyProgress, selectedApplyStudents, applyClass, setScreen, setApplyClass }} />}
  </section>;
}
