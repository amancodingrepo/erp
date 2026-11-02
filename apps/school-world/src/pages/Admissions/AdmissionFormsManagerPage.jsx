import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Download, Save, Search, ChevronDown, FileText, Pencil,
  Trash2, ExternalLink, Settings2, CheckCircle2, AlertCircle, ArrowLeft,
  Smartphone, BookOpen, Users, CalendarDays, RotateCcw
} from "lucide-react";
import { apiGet, apiPatch } from "../../api.js";
import { ADMISSION_FIELD_GROUPS, FIELD_REQUIREMENT_OPTIONS, createDefaultAdmissionForm, createGroupSelection } from "./admissionFormCatalog.js";
import { downloadPrintableAdmissionFormPdf } from "./printableAdmissionFormPdf.js";

function currentAcademicYear() {
  const date = new Date();
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadFormTemplate(form, formType = "enquiry", titleOverride = "", termsAndConditions = "") {
  downloadPrintableAdmissionFormPdf({ form, formType, titleOverride, termsAndConditions });
}

function makeBlankBuilder(year) {
  const form = createDefaultAdmissionForm(year, "Admission/Enquiry Form");
  return { ...form, name: "Admission/Enquiry Form" };
}

export default function AdmissionFormsManagerPage({ userRole = "staff", onOpenAdmission, onNotify }) {
  const canManage = ["school_admin", "principal"].includes(userRole);
  const [view, setView] = useState("manage");
  const [settings, setSettings] = useState({
    academicYear: currentAcademicYear(),
    mobileAdmissionEnabled: false,
    termsAndConditions: "",
    forms: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openActions, setOpenActions] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsDraft, setTermsDraft] = useState("");
  const [search, setSearch] = useState("");
  const [builder, setBuilder] = useState(null);
  const [builderMessage, setBuilderMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      setLoading(true);
      try {
        const response = await apiGet("/bootstrap");
        const config = response.school?.config?.admissionFormBuilder || window.SCHOOL_DIARY_CONFIG?.admissionFormBuilder || {};
        if (cancelled) return;
        setSettings({
          academicYear: config.academicYear || currentAcademicYear(),
          mobileAdmissionEnabled: Boolean(config.mobileAdmissionEnabled),
          termsAndConditions: config.termsAndConditions || "",
          forms: Array.isArray(config.forms) ? config.forms : []
        });
      } catch (error) {
        if (!cancelled) setNotice(`Admission form settings could not be loaded: ${error.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return settings.forms.filter(form => {
      const matchesYear = !settings.academicYear || form.academicYear === settings.academicYear;
      const matchesText = !query || [form.name, form.academicYear, form.status].some(value => String(value || "").toLowerCase().includes(query));
      return matchesYear && matchesText;
    });
  }, [settings.forms, settings.academicYear, search]);

  const selectedGroupIds = useMemo(() => new Set((builder?.fields || []).map(item => item.groupId)), [builder]);
  const availableGroups = useMemo(() => ADMISSION_FIELD_GROUPS.filter(group => !selectedGroupIds.has(group.id)), [selectedGroupIds]);

  function announce(message) {
    setNotice(message);
    onNotify?.(message);
  }

  async function persistSettings(changes, successMessage = "") {
    if (!canManage) {
      announce("Only a school admin or principal can save admission form settings.");
      return false;
    }
    const next = { ...settings, ...changes };
    setSettings(next);
    setSaving(true);
    try {
      const response = await apiPatch("/school/settings", { config: { admissionFormBuilder: next } });
      const serverConfig = response.school?.config || {};
      window.SCHOOL_DIARY_CONFIG = {
        ...(window.SCHOOL_DIARY_CONFIG || {}),
        ...serverConfig,
        admissionFormBuilder: next
      };
      window.dispatchEvent(new Event("schooldiary:tenant-updated"));
      if (successMessage) announce(successMessage);
      return true;
    } catch (error) {
      setSettings(settings);
      announce(`Could not save admission form settings: ${error.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function startNewForm() {
    setBuilder(makeBlankBuilder(settings.academicYear));
    setBuilderMessage("");
    setView("builder");
  }

  function editForm(form) {
    setBuilder(JSON.parse(JSON.stringify(form)));
    setBuilderMessage("");
    setView("builder");
  }

  function addGroup(groupId) {
    const selection = createGroupSelection(groupId);
    if (!selection) return;
    setBuilder(previous => ({
      ...previous,
      fields: [...(previous?.fields || []), selection],
      updatedAt: new Date().toISOString()
    }));
  }

  function removeGroup(groupId) {
    setBuilder(previous => ({
      ...previous,
      fields: (previous?.fields || []).filter(item => item.groupId !== groupId),
      updatedAt: new Date().toISOString()
    }));
  }

  function changeRequirement(groupId, fieldId, formType, value) {
    setBuilder(previous => ({
      ...previous,
      fields: previous.fields.map(selectedGroup => {
        if (selectedGroup.groupId !== groupId) return selectedGroup;
        const current = selectedGroup.settings?.[fieldId] || { enquiry: "Optional", admission: "Optional" };
        return {
          ...selectedGroup,
          settings: {
            ...selectedGroup.settings,
            [fieldId]: { ...current, [formType]: value }
          }
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }

  async function saveBuilder() {
    if (!builder) return;
    if (!canManage) {
      setBuilderMessage("Only a school admin or principal can save this form.");
      return;
    }
    if (!builder.name?.trim()) {
      setBuilderMessage("Enter a name for this admission/enquiry form.");
      return;
    }
    if (!(builder.fields || []).length) {
      setBuilderMessage("Add at least one field group before saving.");
      return;
    }
    const keepsSystemField = (groupId, fieldId) => {
      const group = builder.fields.find(item => item.groupId === groupId);
      const setting = group?.settings?.[fieldId];
      return setting?.enquiry === "Required" && setting?.admission === "Required";
    };
    if (!keepsSystemField("name", "firstName") || !keepsSystemField("contact", "mobile")) {
      setBuilderMessage("Set First name and Primary contact to Required for both Enquiry and Admission. The current school enquiry service requires them to save an enquiry.");
      return;
    }
    const savedForm = {
      ...builder,
      name: builder.name.trim(),
      academicYear: settings.academicYear,
      status: builder.status || "Open",
      updatedAt: new Date().toISOString()
    };
    const existingIndex = settings.forms.findIndex(item => item.id === savedForm.id);
    const forms = existingIndex >= 0
      ? settings.forms.map(item => item.id === savedForm.id ? savedForm : item)
      : [savedForm, ...settings.forms];
    const ok = await persistSettings({ forms }, "Admission/enquiry form saved successfully.");
    if (ok) {
      window.localStorage.setItem("schoolWorld.activeAdmissionFormId", savedForm.id);
      setBuilder(null);
      setView("manage");
      setBuilderMessage("");
    }
  }

  async function removeForm(form) {
    if (!window.confirm(`Delete "${form.name}"? This removes the form template settings, not any saved student enquiries.`)) return;
    const forms = settings.forms.filter(item => item.id !== form.id);
    await persistSettings({ forms }, "Form template removed.");
  }

  function getTemplateForDownload() {
    return settings.forms.find(form => form.status !== "Closed") || settings.forms[0] || makeBlankBuilder(settings.academicYear);
  }

  async function saveMobileOption(checked) {
    await persistSettings({ mobileAdmissionEnabled: checked }, checked ? "Mobile admission form enabled." : "Mobile admission form disabled.");
  }

  function runMenuAction(action) {
    setOpenActions(false);
    const form = getTemplateForDownload();
    if (action === "terms") {
      setTermsDraft(settings.termsAndConditions || "");
      setShowTerms(true);
    } else if (action === "empty-enquiry") {
      downloadFormTemplate(form, "enquiry", "Empty Enquiry Form", settings.termsAndConditions);
      announce("Blank enquiry form PDF downloaded.");
    } else if (action === "empty-admission") {
      downloadFormTemplate(form, "admission", "Empty Admission Form", settings.termsAndConditions);
      announce("Blank admission form PDF downloaded.");
    } else if (action === "documents") {
      const docs = (form.fields || []).find(item => item.groupId === "documents");
      const group = ADMISSION_FIELD_GROUPS.find(item => item.id === "documents");
      const rows = [["Document", "Enquiry requirement", "Admission requirement"]];
      for (const field of group?.fields || []) {
        rows.push([field.label, docs?.settings?.[field.id]?.enquiry || "Optional", docs?.settings?.[field.id]?.admission || "Optional"]);
      }
      downloadCsv("admission-form-documents.csv", rows);
      announce("Admission form document checklist downloaded.");
    } else if (action === "branches") {
      downloadCsv("organization-branches-enquiry-form.csv", [
        ["Organization Name", "Branch Name", "Contact Person", "Mobile Number", "Email", "City", "State", "Notes"],
        ["", "", "", "", "", "", "", ""]
      ]);
      announce("Organization branches enquiry template downloaded.");
    } else if (action === "enquiry") {
      window.localStorage.setItem("schoolWorld.activeAdmissionFormId", form.id);
      onOpenAdmission?.();
    }
  }

  async function saveTerms() {
    const ok = await persistSettings({ termsAndConditions: termsDraft }, "Admission terms and conditions saved.");
    if (ok) setShowTerms(false);
  }

  if (loading) {
    return <section className="admission-manager-state"><span className="admission-manager-loader" /><p>Loading admission form settings…</p></section>;
  }

  if (view === "builder" && builder) {
    return (
      <div className="admission-manager">
        <div className="admission-manager-toolbar">
          <button type="button" className="admission-manager-secondary" onClick={() => { setView("manage"); setBuilder(null); }}><ArrowLeft size={15} /> Back to forms</button>
          <div className="admission-manager-toolbar-actions">
            <button type="button" className="admission-manager-secondary" onClick={() => downloadFormTemplate(builder, "enquiry", "", settings.termsAndConditions)}><Download size={15} /> Download PDF</button>
            <button type="button" className="admission-manager-primary" onClick={saveBuilder} disabled={saving || !canManage}><Save size={15} /> {saving ? "Saving…" : "Save"}</button>
          </div>
        </div>

        <section className="admission-manager-card admission-builder-title-card">
          <div>
            <span className="admission-manager-eyebrow">FORM CONFIGURATION</span>
            <h2>Admission Form Builder</h2>
            <p>Choose the field groups to show, then set separate requirements for enquiry and admission forms.</p>
          </div>
          <label className="admission-manager-name-field">
            <span>Form name</span>
            <input value={builder.name || ""} onChange={event => setBuilder(previous => ({ ...previous, name: event.target.value }))} placeholder="Enter form name" maxLength={120} />
          </label>
        </section>

        {builderMessage && <div className="admission-manager-alert"><AlertCircle size={16} /> {builderMessage}</div>}
        {!canManage && <div className="admission-manager-alert"><AlertCircle size={16} /> You can review forms, but only a school admin or principal can save changes.</div>}

        <div className="admission-builder-columns">
          <section className="admission-manager-card admission-builder-available">
            <div className="admission-builder-panel-header">
              <div><h3>Available Groups</h3><p>Add a group to include its fields in the form.</p></div>
              <span className="admission-manager-count">{availableGroups.length}</span>
            </div>
            <div className="admission-builder-group-list">
              {availableGroups.map(group => (
                <article className="admission-builder-available-group" key={group.id}>
                  <div className="admission-builder-group-icon"><BookOpen size={17} /></div>
                  <div className="admission-builder-group-copy"><strong>{group.label}</strong><p>{group.description}</p></div>
                  <button type="button" aria-label={`Add ${group.label}`} title={`Add ${group.label}`} onClick={() => addGroup(group.id)}><Plus size={18} /></button>
                </article>
              ))}
              {!availableGroups.length && <div className="admission-manager-empty compact">All available field groups have been added.</div>}
            </div>
          </section>

          <section className="admission-manager-card admission-builder-selected">
            <div className="admission-builder-panel-header">
              <div><h3>Opted Fields</h3><p>Choose whether each field is required, optional, or not used.</p></div>
              <span className="admission-manager-count">{builder.fields?.length || 0}</span>
            </div>
            <div className="admission-builder-selected-list">
              {(builder.fields || []).map(selectedGroup => {
                const group = ADMISSION_FIELD_GROUPS.find(item => item.id === selectedGroup.groupId);
                if (!group) return null;
                return (
                  <article className="admission-builder-selected-group" key={group.id}>
                    <header className="admission-builder-selected-heading">
                      <div><h4>{group.label}</h4><p>{group.description}</p></div>
                      <button type="button" className="admission-builder-remove" aria-label={`Remove ${group.label}`} title="Remove field group" onClick={() => removeGroup(group.id)}><X size={17} /></button>
                    </header>
                    {group.kind === "photo" && <div className="admission-builder-photo-note">The applicant photo upload will appear in this section.</div>}
                    {group.fields.length > 0 && (
                      <div className="admission-builder-field-list">
                        <div className="admission-builder-field-header"><span>Field</span><span>Enquiry</span><span>Admission</span></div>
                        {group.fields.map(field => {
                          const value = selectedGroup.settings?.[field.id] || { enquiry: field.defaultEnquiry, admission: field.defaultAdmission };
                          return (
                            <div className="admission-builder-field-row" key={field.id}>
                              <label className="admission-builder-field-label" title={field.note || field.label}>{field.label}{field.note && <small>{field.note}</small>}</label>
                              <select aria-label={`${field.label} enquiry requirement`} value={value.enquiry} onChange={event => changeRequirement(group.id, field.id, "enquiry", event.target.value)}>
                                {FIELD_REQUIREMENT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                              </select>
                              <select aria-label={`${field.label} admission requirement`} value={value.admission} onChange={event => changeRequirement(group.id, field.id, "admission", event.target.value)}>
                                {FIELD_REQUIREMENT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
              {!(builder.fields || []).length && <div className="admission-manager-empty">No groups added yet. Use the plus buttons to add form fields.</div>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="admission-manager">
      <section className="admission-manager-card admission-manager-controls">
        <div className="admission-manager-year-field">
          <label htmlFor="admission-manager-year">Academic Year</label>
          <input id="admission-manager-year" value={settings.academicYear} onChange={event => setSettings(previous => ({ ...previous, academicYear: event.target.value }))} onBlur={() => persistSettings({ academicYear: settings.academicYear })} placeholder="2026-2027" maxLength={20} />
        </div>
        <label className="admission-manager-mobile-toggle">
          <input type="checkbox" checked={settings.mobileAdmissionEnabled} onChange={event => saveMobileOption(event.target.checked)} disabled={!canManage || saving} />
          <span className="admission-manager-toggle-track"><span /></span>
          <span><strong>Enable Mobile Admission Form</strong><small>Allow the configured form to be used on mobile devices.</small></span>
        </label>
        <div className="admission-manager-action-menu">
          <button type="button" className="admission-manager-select-button" onClick={() => setOpenActions(open => !open)} aria-expanded={openActions}><span>Select actions</span><ChevronDown size={15} /></button>
          {openActions && <div className="admission-manager-action-dropdown">
            <button type="button" onClick={() => runMenuAction("terms")}>Update Admission Form Terms &amp; Conditions</button>
            <button type="button" onClick={() => runMenuAction("empty-enquiry")}>Download Empty Enquiry Form (PDF)</button>
            <button type="button" onClick={() => runMenuAction("empty-admission")}>Download Empty Admission Form (PDF)</button>
            <button type="button" onClick={() => runMenuAction("documents")}>Download Admission Form Documents</button>
            <button type="button" onClick={() => runMenuAction("branches")}>Get Organization Branches Enquiry Form</button>
            <button type="button" onClick={() => runMenuAction("enquiry")}>Go to Enquiry Form</button>
          </div>}
        </div>
      </section>

      {notice && <div className="admission-manager-notice"><CheckCircle2 size={16} /> <span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15}/></button></div>}
      {!canManage && <div className="admission-manager-alert"><AlertCircle size={16} /> This account can view form templates. A school admin or principal is required to save settings.</div>}

      <section className="admission-manager-card admission-open-forms">
        <div className="admission-open-forms-header">
          <div><span className="admission-manager-eyebrow">ADMISSIONS</span><h2>Manage Open Admission/Enquiry Forms</h2><p>Configure the fields shown to families and download blank, print-ready PDF forms.</p></div>
          <div className="admission-open-form-actions">
            <button type="button" className="admission-manager-secondary" onClick={() => downloadFormTemplate(getTemplateForDownload(), "enquiry", "", settings.termsAndConditions)}><Download size={15} /> Download PDF Form</button>
            <button type="button" className="admission-manager-primary" onClick={startNewForm} disabled={!canManage}><Plus size={16} /> Add New</button>
          </div>
        </div>
        <div className="admission-manager-search"><Search size={16}/><input aria-label="Search admission form templates" value={search} onChange={event => setSearch(event.target.value)} placeholder="Start typing here to filter list..." /></div>
        <div className="admission-manager-forms-table-wrap">
          <table className="admission-manager-forms-table">
            <thead><tr><th>Form Name</th><th>Academic Year</th><th>Form Fields</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredForms.map(form => (
                <tr key={form.id}>
                  <td><strong>{form.name}</strong><small>Updated {form.updatedAt ? new Date(form.updatedAt).toLocaleDateString("en-IN") : "—"}</small></td>
                  <td>{form.academicYear || settings.academicYear}</td>
                  <td>{(form.fields || []).length} groups</td>
                  <td><span className={`admission-manager-status ${form.status === "Closed" ? "closed" : "open"}`}>{form.status || "Open"}</span></td>
                  <td><div className="admission-manager-row-actions">
                    <button type="button" title="Edit form" aria-label={`Edit ${form.name}`} onClick={() => editForm(form)}><Pencil size={15}/></button>
                    <button type="button" title="Use this form" aria-label={`Use ${form.name}`} onClick={() => { window.localStorage.setItem("schoolWorld.activeAdmissionFormId", form.id); onOpenAdmission?.(); }}><ExternalLink size={15}/></button>
                    <button type="button" title="Download printable enquiry PDF" aria-label={`Download PDF for ${form.name}`} onClick={() => downloadFormTemplate(form, "enquiry", "", settings.termsAndConditions)}><Download size={15}/></button>
                    <button type="button" className="remove" title="Delete form" aria-label={`Delete ${form.name}`} onClick={() => removeForm(form)} disabled={!canManage}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredForms.length && <div className="admission-manager-empty"><FileText size={28}/><strong>No admission/enquiry form templates found</strong><span>Click Add New to build your first form for this academic year.</span></div>}
        </div>
      </section>

      {showTerms && <div className="admission-manager-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowTerms(false); }}>
        <section className="admission-manager-modal" role="dialog" aria-modal="true" aria-labelledby="admission-terms-title">
          <header><div><span className="admission-manager-eyebrow">FORM SETTINGS</span><h2 id="admission-terms-title">Admission Form Terms &amp; Conditions</h2></div><button type="button" onClick={() => setShowTerms(false)} aria-label="Close"><X size={18}/></button></header>
          <p>These terms are saved with this school's admission form settings.</p>
          <textarea value={termsDraft} onChange={event => setTermsDraft(event.target.value)} rows={8} maxLength={12000} placeholder="Enter admission terms and conditions..." />
          <footer><button type="button" className="admission-manager-secondary" onClick={() => setShowTerms(false)}>Cancel</button><button type="button" className="admission-manager-primary" onClick={saveTerms} disabled={saving || !canManage}><Save size={15}/> {saving ? "Saving…" : "Save terms"}</button></footer>
        </section>
      </div>}
    </div>
  );
}
