import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Download, Edit2, Filter,
  Plus, RefreshCw, Save, Search, Tag, Trash2, X
} from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import "./ManageSubjectsPage.css";

const EMPTY_FORM = {
  name: "",
  code: "",
  category: "",
  subjectTypes: [],
  classesText: "",
  description: "",
  status: "Active"
};


function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSubjects(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item.name === "string" && normalizeName(item.name))
    .map(item => ({
      id: String(item.id || ""),
      name: normalizeName(item.name),
      code: normalizeName(item.code),
      category: normalizeName(item.category),
      subjectTypes: Array.isArray(item.subjectTypes) ? item.subjectTypes.map(normalizeName).filter(Boolean) : [],
      classes: Array.isArray(item.classes)
        ? item.classes.map(normalizeName).filter(Boolean)
        : String(item.classesText || "").split(",").map(normalizeName).filter(Boolean),
      description: String(item.description || "").trim(),
      status: item.status === "Inactive" ? "Inactive" : "Active",
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null
    }))
    .filter((item, index, items) =>
      items.findIndex(other => other.name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) === index
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function formFromSubject(subject) {
  return {
    name: subject.name,
    code: subject.code,
    category: subject.category,
    subjectTypes: [...subject.subjectTypes],
    classesText: subject.classes.join(", "),
    description: subject.description,
    status: subject.status
  };
}

function csvCell(value) {
  const normalized = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  return '"' + normalized.replace(/"/g, '""') + '"';
}

function downloadSubjectsCsv(subjects) {
  const header = ["Subject Name", "Subject Code", "Subject Category", "Subject Types", "Classes", "Description", "Status"];
  const rows = subjects.map(subject => [
    subject.name, subject.code, subject.category, subject.subjectTypes, subject.classes, subject.description, subject.status
  ]);
  const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "school-world-subjects.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export default function ManageSubjectsPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjectTypes, setSubjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadPage({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    setFeedback("");
    try {
      const results = await Promise.allSettled([
        apiGet("/school-subjects"),
        apiGet("/school-subject-categories"),
        apiGet("/school-subject-types")
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      setSubjects(normalizeSubjects(Array.isArray(results[0].value?.subjects) ? results[0].value.subjects : []));
      setCategories(
        results[1].status === "fulfilled" && Array.isArray(results[1].value?.categories)
          ? results[1].value.categories.map(item => normalizeName(item?.name)).filter(Boolean).sort((a,b)=>a.localeCompare(b))
          : []
      );
      setSubjectTypes(
        results[2].status === "fulfilled" && Array.isArray(results[2].value?.subjectTypes)
          ? results[2].value.subjectTypes.map(item => normalizeName(item?.name)).filter(Boolean).sort((a,b)=>a.localeCompare(b))
          : []
      );
      if (results[1].status === "rejected" || results[2].status === "rejected") {
        setError("Subjects loaded, but subject categories or subject types could not be loaded. Refresh to try again.");
      }
    } catch (requestError) {
      setError(requestError?.message || "Subjects could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const visibleSubjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return subjects.filter(subject => {
      if (categoryFilter !== "All" && subject.category !== categoryFilter) return false;
      if (statusFilter !== "All" && subject.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        subject.name, subject.code, subject.category, subject.description,
        ...subject.subjectTypes, ...subject.classes
      ].some(value => String(value || "").toLocaleLowerCase().includes(needle));
    });
  }, [subjects, query, categoryFilter, statusFilter]);

  const activeCount = subjects.filter(subject => subject.status === "Active").length;
  const inactiveCount = subjects.length - activeCount;

  function clearNotices() {
    setError("");
    setFeedback("");
  }

  function updateForm(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openAddForm() {
    clearNotices();
    setEditingId("");
    setForm({ ...EMPTY_FORM, subjectTypes: [] });
    setFormOpen(true);
  }

  function openEditForm(subject) {
    clearNotices();
    setEditingId(subject.id);
    setForm(formFromSubject(subject));
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId("");
    setForm(EMPTY_FORM);
    clearNotices();
  }

  async function persistSubjects(nextSubjects) {
    const normalized = normalizeSubjects(nextSubjects);
    const response = await apiPut("/school-subjects/sync", { subjects: normalized });
    const savedSubjects = normalizeSubjects(Array.isArray(response?.subjects) ? response.subjects : []);
    setSubjects(savedSubjects);
    return savedSubjects;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearNotices();
    const name = normalizeName(form.name);
    const code = normalizeName(form.code);
    if (!name) {
      setError("Subject Name is required.");
      return;
    }
    if (name.length > 150) {
      setError("Subject Name must be 150 characters or fewer.");
      return;
    }
    if (code.length > 50) {
      setError("Subject Code must be 50 characters or fewer.");
      return;
    }
    if (form.category && !categories.some(category => category.toLocaleLowerCase() === form.category.toLocaleLowerCase())) {
      setError("Choose a category from Manage Subject Categories, or clear the category field.");
      return;
    }
    const duplicateName = subjects.find(subject =>
      subject.name.toLocaleLowerCase() === name.toLocaleLowerCase() && subject.id !== editingId
    );
    if (duplicateName) {
      setError("A subject with this name already exists.");
      return;
    }
    if (code) {
      const duplicateCode = subjects.find(subject =>
        subject.code.toLocaleLowerCase() === code.toLocaleLowerCase() && subject.id !== editingId
      );
      if (duplicateCode) {
        setError("This Subject Code is already used by another subject.");
        return;
      }
    }

    const savedAt = new Date().toISOString();
    const subject = {
      id: editingId || "",
      name,
      code,
      category: form.category,
      subjectTypes: [...new Set(form.subjectTypes.map(normalizeName).filter(Boolean))],
      classes: [...new Set(String(form.classesText || "").split(",").map(normalizeName).filter(Boolean))],
      description: String(form.description || "").trim(),
      status: form.status === "Inactive" ? "Inactive" : "Active",
      updatedAt: savedAt,
      createdAt: editingId ? subjects.find(item => item.id === editingId)?.createdAt || savedAt : savedAt
    };

    setSaving(true);
    try {
      const nextSubjects = editingId
        ? subjects.map(item => item.id === editingId ? subject : item)
        : [...subjects, subject];
      const wasEditing = Boolean(editingId);
      await persistSubjects(nextSubjects);
      setFormOpen(false);
      setEditingId("");
      setForm(EMPTY_FORM);
      setQuery("");
      setCategoryFilter("All");
      const message = wasEditing ? "Subject updated successfully." : "Subject added successfully.";
      setFeedback(message);
      notify?.(message);
    } catch (requestError) {
      setError(requestError?.message || "Subject could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject) {
    clearNotices();
    if (!window.confirm("Delete the subject “" + subject.name + "”? This cannot be undone.")) return;
    setSaving(true);
    try {
      await persistSubjects(subjects.filter(item => item.id !== subject.id));
      setFeedback("Subject deleted successfully.");
      notify?.("Subject deleted.");
    } catch (requestError) {
      setError(requestError?.message || "Subject could not be deleted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setCategoryFilter("All");
    setStatusFilter("All");
  }

  return (
    <section className="manage-subjects-page">
      <button type="button" className="manage-subjects-back" onClick={onBack}>
        <ArrowLeft size={15} /> {text("Back to Manage your Branch")}
      </button>

      {error && <div className="manage-subjects-alert" role="alert"><AlertCircle size={16}/><span>{text(error)}</span><button type="button" onClick={() => setError("")} aria-label={text("Dismiss")}><X size={14}/></button></div>}
      {feedback && !error && <div className="manage-subjects-alert success" role="status"><CheckCircle2 size={16}/><span>{text(feedback)}</span></div>}

      {!formOpen ? (
        <>
          <header className="manage-subjects-heading">
            <div>
              <span className="manage-subjects-eyebrow"><BookOpen size={13}/>{text("ACADEMICS · SUBJECT SETUP")}</span>
              <h2>{text("Manage Subjects")}</h2>
              <p>{text("Create and maintain subjects, link categories and subject types, and assign applicable classes.")}</p>
            </div>
            <div className="manage-subjects-heading-actions">
              <button type="button" className="manage-subjects-button secondary" onClick={() => void loadPage({ quiet: true })} disabled={loading || refreshing}>
                <RefreshCw size={14} className={refreshing ? "manage-subjects-spin" : ""}/>{text("Refresh")}
              </button>
              <button type="button" className="manage-subjects-button secondary" onClick={() => downloadSubjectsCsv(visibleSubjects)} disabled={loading || visibleSubjects.length === 0}>
                <Download size={14}/>{text("Export CSV")}
              </button>
              <button type="button" className="manage-subjects-button primary" onClick={openAddForm}>
                <Plus size={15}/>{text("Add Subject")}
              </button>
            </div>
          </header>

          <div className="manage-subjects-metrics">
            <button type="button" onClick={() => { clearFilters(); }} className="manage-subjects-metric">
              <span className="manage-subjects-metric-icon"><BookOpen size={18}/></span>
              <span><small>{text("Total Subjects")}</small><strong>{subjects.length}</strong></span>
            </button>
            <button type="button" onClick={() => { setStatusFilter("Active"); setCategoryFilter("All"); setQuery(""); }} className={"manage-subjects-metric" + (statusFilter === "Active" ? " selected" : "")}>
              <span className="manage-subjects-metric-icon active"><CheckCircle2 size={18}/></span>
              <span><small>{text("Active Subjects")}</small><strong>{activeCount}</strong></span>
            </button>
            <button type="button" onClick={() => { setStatusFilter("Inactive"); setCategoryFilter("All"); setQuery(""); }} className={"manage-subjects-metric" + (statusFilter === "Inactive" ? " selected" : "")}>
              <span className="manage-subjects-metric-icon inactive"><Filter size={18}/></span>
              <span><small>{text("Inactive Subjects")}</small><strong>{inactiveCount}</strong></span>
            </button>
          </div>

          <section className="manage-subjects-panel">
            <div className="manage-subjects-toolbar">
              <div className="manage-subjects-record-count"><strong>{visibleSubjects.length}</strong><span>{text("subjects shown")}</span></div>
              <div className="manage-subjects-filters">
                <label className="manage-subjects-search"><Search size={16}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Search name, code, category, type or class…")} aria-label={text("Search subjects")}/></label>
                <label className="manage-subjects-filter"><span>{text("Category")}</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="All">{text("All categories")}</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="manage-subjects-filter"><span>{text("Status")}</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="All">{text("All statuses")}</option><option value="Active">{text("Active")}</option><option value="Inactive">{text("Inactive")}</option></select></label>
              </div>
            </div>

            {loading ? (
              <div className="manage-subjects-empty"><span className="manage-subjects-empty-icon"><RefreshCw size={22} className="manage-subjects-spin"/></span><strong>{text("Loading subjects…")}</strong><p>{text("Retrieving subjects saved for this school.")}</p></div>
            ) : visibleSubjects.length === 0 ? (
              <div className="manage-subjects-empty">
                <span className="manage-subjects-empty-icon"><BookOpen size={23}/></span>
                <strong>{text(subjects.length ? "No subjects match these filters" : "No subjects added yet")}</strong>
                <p>{text(subjects.length ? "Try another search or clear the filters." : "Add the first subject to start building your school's subject directory.")}</p>
                {subjects.length
                  ? <button type="button" className="manage-subjects-button secondary" onClick={clearFilters}>{text("Clear Filters")}</button>
                  : <button type="button" className="manage-subjects-button primary" onClick={openAddForm}><Plus size={14}/>{text("Add Subject")}</button>}
              </div>
            ) : (
              <div className="manage-subjects-table-wrap">
                <table className="manage-subjects-table">
                  <thead><tr><th>{text("Subject Name")}</th><th>{text("Subject Code")}</th><th>{text("Subject Category")}</th><th>{text("Subject Types")}</th><th>{text("Classes")}</th><th>{text("Status")}</th><th>{text("Actions")}</th></tr></thead>
                  <tbody>
                    {visibleSubjects.map(subject => (
                      <tr key={subject.id}>
                        <td><span className="manage-subjects-name"><span className="manage-subjects-name-icon"><BookOpen size={14}/></span><span>{subject.name}<small>{subject.description || text("Subject record")}</small></span></span></td>
                        <td>{subject.code || "—"}</td>
                        <td>{subject.category || "—"}</td>
                        <td><div className="manage-subjects-chips">{subject.subjectTypes.length ? subject.subjectTypes.map(type => <span key={type}>{type}</span>) : <em>—</em>}</div></td>
                        <td>{subject.classes.length ? subject.classes.join(", ") : "All / not specified"}</td>
                        <td><span className={"manage-subjects-status " + (subject.status === "Active" ? "active" : "inactive")}>{text(subject.status)}</span></td>
                        <td><div className="manage-subjects-row-actions"><button type="button" onClick={() => openEditForm(subject)} disabled={saving} aria-label={"Edit " + subject.name}><Edit2 size={12}/>{text("Edit")}</button><button type="button" className="delete" onClick={() => void handleDelete(subject)} disabled={saving} aria-label={"Delete " + subject.name}><Trash2 size={12}/>{text("Delete")}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="manage-subjects-footer"><CheckCircle2 size={13}/>{text("Subject records are saved to this school's existing database storage. No database columns are required.")}</footer>
        </>
      ) : (
        <>
          <header className="manage-subjects-form-heading">
            <div><span className="manage-subjects-eyebrow"><BookOpen size={13}/>{text("ACADEMICS · SUBJECT SETUP")}</span><h2>{text(editingId ? "Edit Subject" : "Add Subject")}</h2><p>{text("Enter subject details and save your changes.")}</p></div>
            <button type="button" className="manage-subjects-button secondary" onClick={closeForm} disabled={saving}><ArrowLeft size={14}/>{text("Back to List")}</button>
          </header>

          <form className="manage-subjects-form" onSubmit={handleSubmit}>
            <section className="manage-subjects-form-section">
              <header><h3>{text("Subject Details")}</h3><p>{text("Enter the subject name and its classification.")}</p></header>
              <div className="manage-subjects-form-grid">
                <label className="wide"><span>{text("Subject Name")} <b>*</b></span><input autoFocus required maxLength={150} value={form.name} onChange={event => updateForm("name", event.target.value)} placeholder={text("e.g. Mathematics")}/></label>
                <label><span>{text("Subject Code")}</span><input maxLength={50} value={form.code} onChange={event => updateForm("code", event.target.value)} placeholder={text("Optional unique code")}/></label>
                <label><span>{text("Subject Category")}</span><select value={form.category} onChange={event => updateForm("category", event.target.value)}><option value="">{text("Select category")}</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select>{categories.length===0 && <small>Add categories from Manage Subject Categories to populate this list.</small>}</label>
                <label><span>{text("Status")}</span><select value={form.status} onChange={event => updateForm("status", event.target.value)}><option value="Active">{text("Active")}</option><option value="Inactive">{text("Inactive")}</option></select></label>
                <label className="wide"><span>{text("Applicable Classes")}</span><input maxLength={300} value={form.classesText} onChange={event => updateForm("classesText", event.target.value)} placeholder={text("e.g. Class 1, Class 2, Class 3")}/><small>{text("Enter one or more class names separated by commas. Leave blank if applicable to all classes or not specified.")}</small></label>
                <label className="wide"><span>{text("Description / Notes")}</span><textarea maxLength={1000} rows={3} value={form.description} onChange={event => updateForm("description", event.target.value)} placeholder={text("Optional subject description or notes")}/></label>
              </div>
            </section>

            <section className="manage-subjects-form-section">
              <header><h3>{text("Subject Types")}</h3><p>{text("Select the assessment or skill types that can be recorded for this subject.")}</p></header>
              {subjectTypes.length ? (
                <div className="manage-subjects-type-picker">
                  {subjectTypes.map(type => <label key={type} className={form.subjectTypes.includes(type) ? "selected" : ""}><input type="checkbox" checked={form.subjectTypes.includes(type)} onChange={event => updateForm("subjectTypes", event.target.checked ? [...form.subjectTypes,type] : form.subjectTypes.filter(value=>value!==type))}/><span>{type}</span></label>)}
                </div>
              ) : <div className="manage-subjects-note">{text("No subject types are configured yet. You can add them from Manage Subject Types and select them here later.")}</div>}
            </section>

            <footer className="manage-subjects-form-footer">
              <button type="button" className="manage-subjects-button secondary" onClick={closeForm} disabled={saving}><X size={14}/>{text("Cancel")}</button>
              <div><button type="button" className="manage-subjects-button secondary" onClick={closeForm} disabled={saving}><ArrowLeft size={14}/>{text("Back to List")}</button><button type="submit" className="manage-subjects-button primary" disabled={saving}>{saving?<RefreshCw size={14} className="manage-subjects-spin"/>:<Save size={14}/>} {text(saving?"Saving…":"Save Subject")}</button></div>
            </footer>
          </form>
        </>
      )}
    </section>
  );
}
