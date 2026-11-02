import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../../api.js";
import TemplateAssignmentsView from "./TemplateAssignmentsView.jsx";

export default function TemplateAssignmentsPanel() {
  const [templates, setTemplates] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notesSavingId, setNotesSavingId] = useState("");

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const [templateResult, assignmentResult] = await Promise.all([
        apiGet("/superadmin/templates"),
        apiGet("/superadmin/template-assignments")
      ]);
      const nextTemplates = Array.isArray(templateResult.templates) ? templateResult.templates : [];
      const nextAdmins = Array.isArray(assignmentResult.admins) ? assignmentResult.admins : [];
      setTemplates(nextTemplates);
      setAdmins(nextAdmins);
      setSelections(previous => {
        const next = { ...previous };
        nextAdmins.forEach(admin => {
          const feeKey = admin.id + ":fee_receipt";
          const reportKey = admin.id + ":performance_report";
          if (!next[feeKey] && admin.feeReceipt?.templateId) next[feeKey] = admin.feeReceipt.templateId;
          if (!next[reportKey] && admin.performanceReport?.templateId) next[reportKey] = admin.performanceReport.templateId;
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError?.message || "Template assignments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const feeTemplates = useMemo(() => templates.filter(item => item.templateType === "fee_receipt" && item.isActive), [templates]);
  const performanceTemplates = useMemo(() => templates.filter(item => item.templateType === "performance_report" && item.isActive), [templates]);

  function changeSelection(adminId, type, templateId) {
    setSelections(previous => ({ ...previous, [adminId + ":" + type]: templateId }));
    setMessage("");
  }

  async function apply(admin, type) {
    const key = admin.id + ":" + type;
    const optionList = type === "fee_receipt" ? feeTemplates : performanceTemplates;
    const currentAssignment = type === "fee_receipt" ? admin.feeReceipt : admin.performanceReport;
    const templateId = selections[key] || currentAssignment?.templateId || optionList[0]?.id;
    if (!templateId) {
      setError("There are no active templates for this template type.");
      return;
    }
    setSavingKey(key);
    setError("");
    setMessage("");
    try {
      const result = await apiPost("/superadmin/template-assignments", {
        schoolAdminUserId: admin.id,
        templateType: type,
        templateId
      });
      setMessage(result.message || "Template applied and saved.");
      setSelections(previous => ({ ...previous, [key]: templateId }));
      await load(false);
    } catch (applyError) {
      setError(applyError?.message || "Template could not be applied.");
    } finally {
      setSavingKey("");
    }
  }
  
  async function saveReceiptNotes(admin, notes) {
    const templateId = admin.feeReceipt?.templateId;
    if (!templateId) {
      setError("Apply a fee receipt template before saving receipt notes.");
      return;
    }
    setNotesSavingId(admin.id);
    setError("");
    setMessage("");
    try {
      const result = await apiPost("/superadmin/template-receipt-notes", {
        schoolAdminUserId: admin.id,
        templateId,
        notes
      });
      setMessage(result.message || "School-specific receipt notes saved.");
      await load(false);
    } catch (saveError) {
      setError(saveError?.message || "Receipt notes could not be saved.");
    } finally {
      setNotesSavingId("");
    }
  }

  return <TemplateAssignmentsView
    templates={templates}
    admins={admins}
    selections={selections}
    loading={loading}
    savingKey={savingKey}
    error={error}
    message={message}
    load={load}
    changeSelection={changeSelection}
    apply={apply}
    notesSavingId={notesSavingId}
    saveReceiptNotes={saveReceiptNotes}
  />;
}
