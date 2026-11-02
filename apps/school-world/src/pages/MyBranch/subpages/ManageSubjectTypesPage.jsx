import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Edit2, Plus,
  RefreshCw, Save, Search, Tag, Trash2, X
} from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import "./ManageSubjectTypesPage.css";

function normalizeSubjectTypes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item.name === "string" && item.name.trim())
    .map(item => ({ id: String(item.id || ""), name: item.name.trim() }))
    .filter((item, index, list) =>
      list.findIndex(other => other.name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) === index
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export default function ManageSubjectTypesPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [subjectTypes, setSubjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [subjectTypeName, setSubjectTypeName] = useState("");

  async function loadSubjectTypes({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    setFeedback("");
    try {
      const response = await apiGet("/school-subject-types");
      setSubjectTypes(normalizeSubjectTypes(Array.isArray(response?.subjectTypes) ? response.subjectTypes : []));
    } catch (requestError) {
      setError(requestError?.message || "Subject types could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadSubjectTypes();
  }, []);

  const visibleSubjectTypes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return subjectTypes.filter(item => !needle || item.name.toLocaleLowerCase().includes(needle));
  }, [subjectTypes, query]);

  function clearNotices() {
    setError("");
    setFeedback("");
  }

  function openAddForm() {
    clearNotices();
    setEditingId("");
    setSubjectTypeName("");
    setFormOpen(true);
  }

  function openEditForm(subjectType) {
    clearNotices();
    setEditingId(subjectType.id);
    setSubjectTypeName(subjectType.name);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId("");
    setSubjectTypeName("");
    clearNotices();
  }

  async function persistSubjectTypes(nextSubjectTypes) {
    const normalized = normalizeSubjectTypes(nextSubjectTypes);
    const response = await apiPut("/school-subject-types/sync", { subjectTypes: normalized });
    const savedTypes = normalizeSubjectTypes(Array.isArray(response?.subjectTypes) ? response.subjectTypes : []);
    setSubjectTypes(savedTypes);
    return savedTypes;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearNotices();
    const name = subjectTypeName.trim();
    if (!name) {
      setError("Subject Type is required.");
      return;
    }
    if (name.length > 150) {
      setError("Subject Type must be 150 characters or fewer.");
      return;
    }
    const duplicate = subjectTypes.find(item =>
      item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.id !== editingId
    );
    if (duplicate) {
      setError("This subject type already exists. Enter a different name.");
      return;
    }

    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      const next = wasEditing
        ? subjectTypes.map(item => item.id === editingId ? { ...item, name } : item)
        : [...subjectTypes, { id: "", name }];
      await persistSubjectTypes(next);
      setFormOpen(false);
      setEditingId("");
      setSubjectTypeName("");
      setQuery("");
      const message = wasEditing
        ? "Subject type updated successfully."
        : "Subject type added successfully.";
      setFeedback(message);
      notify?.(message);
    } catch (requestError) {
      setError(requestError?.message || "Subject type could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subjectType) {
    clearNotices();
    if (!window.confirm("Delete the subject type “" + subjectType.name + "”? This cannot be undone.")) return;
    setSaving(true);
    try {
      await persistSubjectTypes(subjectTypes.filter(item => item.id !== subjectType.id));
      if (editingId === subjectType.id) closeForm();
      setFeedback("Subject type deleted successfully.");
      notify?.("Subject type deleted.");
    } catch (requestError) {
      setError(requestError?.message || "Subject type could not be deleted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="subject-type-page">
      <button type="button" className="subject-type-back" onClick={onBack}>
        <ArrowLeft size={14} /> {text("Back to Manage your Branch")}
      </button>

      {error && (
        <div className="subject-type-alert" role="alert">
          <AlertCircle size={15} />
          <span>{text(error)}</span>
          <button type="button" onClick={() => setError("")} aria-label={text("Dismiss")}><X size={14}/></button>
        </div>
      )}
      {feedback && !error && (
        <div className="subject-type-alert success" role="status"><CheckCircle2 size={15}/><span>{text(feedback)}</span></div>
      )}

      {!formOpen ? (
        <>
          <header className="subject-type-heading">
            <div>
              <h2>{text("Manage Subject Types")}</h2>
              <p>{text("Add new subject types or update existing subject types.")}</p>
            </div>
            <div className="subject-type-heading-actions">
              <button type="button" className="subject-type-button" onClick={() => void loadSubjectTypes({ quiet: true })} disabled={refreshing || loading}>
                <RefreshCw size={13} className={refreshing ? "subject-type-spin" : ""}/>{text("Refresh")}
              </button>
              <button type="button" className="subject-type-button primary" onClick={openAddForm}>
                <Plus size={14}/>{text("Add Subject Type")}
              </button>
            </div>
          </header>

          <div className="subject-type-toolbar">
            <div className="subject-type-count"><strong>{subjectTypes.length}</strong>{text(subjectTypes.length === 1 ? "subject type" : "subject types")}</div>
            <label className="subject-type-search">
              <Search size={13}/>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list...")} aria-label={text("Search subject types")}/>
            </label>
          </div>

          <div className="subject-type-table-wrap">
            {loading ? (
              <div className="subject-type-empty">
                <span className="subject-type-empty-icon"><RefreshCw size={19} className="subject-type-spin"/></span>
                <strong>{text("Loading subject types…")}</strong>
                <p>{text("Retrieving subject type records saved for this school.")}</p>
              </div>
            ) : visibleSubjectTypes.length === 0 ? (
              <div className="subject-type-empty">
                <span className="subject-type-empty-icon"><BookOpen size={21}/></span>
                <strong>{text(query.trim() ? "No matching subject types found" : "No subject types yet")}</strong>
                <p>{text(query.trim() ? "Try another subject type name or clear the search." : "Add your first subject type to get started.")}</p>
                {query.trim()
                  ? <button type="button" className="subject-type-button" onClick={() => setQuery("")}>{text("Clear Search")}</button>
                  : <button type="button" className="subject-type-button primary" onClick={openAddForm}><Plus size={13}/>{text("Add Subject Type")}</button>}
              </div>
            ) : (
              <table className="subject-type-table">
                <thead><tr><th>{text("Subject Type")}</th><th>{text("Actions")}</th></tr></thead>
                <tbody>
                  {visibleSubjectTypes.map(subjectType => (
                    <tr key={subjectType.id}>
                      <td><span className="subject-type-value"><span className="subject-type-value-icon"><BookOpen size={12}/></span>{subjectType.name}</span></td>
                      <td>
                        <div className="subject-type-row-actions">
                          <button type="button" onClick={() => openEditForm(subjectType)} disabled={saving} aria-label={"Edit " + subjectType.name}>
                            <Edit2 size={11}/>{text("Edit")}
                          </button>
                          <button type="button" className="delete" onClick={() => void handleDelete(subjectType)} disabled={saving} aria-label={"Delete " + subjectType.name}>
                            <Trash2 size={11}/>{text("Delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <footer className="subject-type-page-footer"><CheckCircle2 size={12}/>{text("Changes are saved to this school's existing database storage.")}</footer>
        </>
      ) : (
        <>
          <header className="subject-type-form-heading">
            <h3>{text(editingId ? "Edit Subject Type" : "Add Subject Type")}</h3>
            <p>{text("Enter the subject type name and save your changes.")}</p>
          </header>
          <section className="subject-type-form-panel">
            <form className="subject-type-form" onSubmit={handleSubmit}>
              <label className="subject-type-field">
                <span className="subject-type-field-label"><span className="required">*</span>{text("Subject Type")}</span>
                <input autoFocus required maxLength={150} value={subjectTypeName} onChange={event => setSubjectTypeName(event.target.value)} placeholder={text("Subject Type")} aria-label={text("Subject Type")}/>
              </label>
              <div className="subject-type-note">
                <strong>{text("Note:")}</strong> {text("If you want to consider multiple subject types as a single subject type, separate subject types using an underscore (_).")}<br/>
                {text("For example, to enter one combined mark for Conversation and Recitation, use")} <strong>Conversation__Recitation</strong>.
              </div>
              <div className="subject-type-form-actions">
                <button type="submit" className="subject-type-button primary" disabled={saving}>
                  {saving ? <RefreshCw size={13} className="subject-type-spin"/> : <Save size={13}/>}
                  {text(saving ? "Saving…" : "Save")}
                </button>
                <button type="button" className="subject-type-back-list" onClick={closeForm} disabled={saving}><ArrowLeft size={12}/>{text("Back to List")}</button>
              </div>
            </form>
          </section>
        </>
      )}
    </section>
  );
}
