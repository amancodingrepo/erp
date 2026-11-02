import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Edit2, Plus,
  RefreshCw, Save, Search, Tag, Trash2, X
} from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import "./ManageSubjectCategoriesPage.css";


function normalizeCategories(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item.name === "string" && item.name.trim())
    .map(item => ({ id: String(item.id || ""), name: item.name.trim() }))
    .filter((item, index, items) => items.findIndex(other => other.name.toLowerCase() === item.name.toLowerCase()) === index)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export default function ManageSubjectCategoriesPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [categoryName, setCategoryName] = useState("");

  async function loadCategories({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    setFeedback("");
    try {
      const response = await apiGet("/school-subject-categories");
      setCategories(normalizeCategories(Array.isArray(response?.categories) ? response.categories : []));
    } catch (requestError) {
      setError(requestError?.message || "Subject categories could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const visibleCategories = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return categories.filter(category => !needle || category.name.toLocaleLowerCase().includes(needle));
  }, [categories, query]);

  function clearNotices() {
    setError("");
    setFeedback("");
  }

  function openAddForm() {
    clearNotices();
    setEditingId("");
    setCategoryName("");
    setFormOpen(true);
  }

  function openEditForm(category) {
    clearNotices();
    setEditingId(category.id);
    setCategoryName(category.name);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId("");
    setCategoryName("");
    clearNotices();
  }

  async function persistCategories(nextCategories) {
    const normalized = normalizeCategories(nextCategories);
    const response = await apiPut("/school-subject-categories/sync", { categories: normalized });
    const savedCategories = normalizeCategories(Array.isArray(response?.categories) ? response.categories : []);
    setCategories(savedCategories);
    return savedCategories;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearNotices();
    const name = categoryName.trim();
    if (!name) {
      setError("Subject Category is required.");
      return;
    }
    const duplicate = categories.find(category =>
      category.name.toLocaleLowerCase() === name.toLocaleLowerCase() && category.id !== editingId
    );
    if (duplicate) {
      setError("This subject category already exists. Enter a different name.");
      return;
    }

    setSaving(true);
    try {
      let nextCategories;
      if (editingId) {
        nextCategories = categories.map(category => category.id === editingId ? { ...category, name } : category);
      } else {
        nextCategories = [...categories, { id: "", name }];
      }
      await persistCategories(nextCategories);
      setFormOpen(false);
      setEditingId("");
      setCategoryName("");
      setQuery("");
      const message = editingId ? "Subject category updated successfully." : "Subject category added successfully.";
      setFeedback(message);
      notify?.(message);
    } catch (requestError) {
      setError(requestError?.message || "Subject category could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    clearNotices();
    const confirmed = window.confirm("Delete the subject category “" + category.name + "”? This cannot be undone.");
    if (!confirmed) return;

    setSaving(true);
    try {
      const next = categories.filter(item => item.id !== category.id);
      await persistCategories(next);
      if (editingId === category.id) closeForm();
      setFeedback("Subject category deleted successfully.");
      notify?.("Subject category deleted.");
    } catch (requestError) {
      setError(requestError?.message || "Subject category could not be deleted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="subject-category-page">
      <button type="button" className="subject-category-back" onClick={onBack}>
        <ArrowLeft size={15} /> {text("Back to Manage your Branch")}
      </button>

      {error && <div className="subject-category-alert" role="alert"><AlertCircle size={16} /><span>{text(error)}</span><button type="button" className="subject-category-dismiss" onClick={() => setError("")} aria-label={text("Dismiss")}><X size={15} /></button></div>}
      {feedback && !error && <div className="subject-category-alert success" role="status"><CheckCircle2 size={16} /><span>{text(feedback)}</span></div>}

      {!formOpen ? (
        <>
          <header className="subject-category-heading">
            <div>
              <span className="subject-category-eyebrow"><Tag size={12} /> {text("ACADEMICS · SUBJECT SETUP")}</span>
              <h2>{text("Manage Subject Categories")}</h2>
              <p>{text("Add, edit, search, and maintain subject categories for your school.")}</p>
            </div>
            <div className="subject-category-heading-actions">
              <button type="button" className="subject-category-button" onClick={() => void loadCategories({ quiet: true })} disabled={refreshing || loading}>
                <RefreshCw size={14} className={refreshing ? "subject-category-spin" : ""} /> {text("Refresh")}
              </button>
              <button type="button" className="subject-category-button primary" onClick={openAddForm}>
                <Plus size={15} /> {text("Add Subject Category")}
              </button>
            </div>
          </header>

          <section className="subject-category-panel">
            <div className="subject-category-toolbar">
              <div className="subject-category-summary">
                <span className="subject-category-count">{categories.length}</span>
                <span>{text(categories.length === 1 ? "subject category" : "subject categories")}</span>
              </div>
              <label className="subject-category-search">
                <Search size={15} />
                <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list...")} aria-label={text("Filter subject categories")} />
              </label>
            </div>

            {loading ? (
              <div className="subject-category-empty">
                <span className="subject-category-empty-icon"><RefreshCw size={20} className="subject-category-spin" /></span>
                <strong>{text("Loading subject categories…")}</strong>
                <p>{text("Retrieving category records saved for this school.")}</p>
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className="subject-category-empty">
                <span className="subject-category-empty-icon"><BookOpen size={22} /></span>
                <strong>{text(query.trim() ? "No matching categories found" : "No subject categories yet")}</strong>
                <p>{text(query.trim() ? "Try another category name or clear the search." : "Create your first subject category to get started.")}</p>
                {query.trim() ? (
                  <button type="button" className="subject-category-button" onClick={() => setQuery("")}>{text("Clear search")}</button>
                ) : (
                  <button type="button" className="subject-category-button primary" onClick={openAddForm}><Plus size={14} /> {text("Add Subject Category")}</button>
                )}
              </div>
            ) : (
              <div className="subject-category-table-wrap">
                <table className="subject-category-table">
                  <thead>
                    <tr><th>{text("Subject Category")}</th><th aria-label={text("Actions")}>{text("Actions")}</th></tr>
                  </thead>
                  <tbody>
                    {visibleCategories.map(category => (
                      <tr key={category.id}>
                        <td><span className="subject-category-name-cell"><span className="subject-category-name-icon"><BookOpen size={14} /></span>{category.name}</span></td>
                        <td>
                          <div className="subject-category-row-actions">
                            <button type="button" onClick={() => openEditForm(category)} disabled={saving}><Edit2 size={12} /> {text("Edit")}</button>
                            <button type="button" className="delete" onClick={() => void handleDelete(category)} disabled={saving}><Trash2 size={12} /> {text("Delete")}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <footer className="subject-category-page-footer"><CheckCircle2 size={13} /> {text("Changes are saved to this school's existing database storage.")}</footer>
        </>
      ) : (
        <>
          <header className="subject-category-heading">
            <div>
              <span className="subject-category-eyebrow"><Tag size={12} /> {text("ACADEMICS · SUBJECT SETUP")}</span>
              <h2>{text("Manage Subject Categories")}</h2>
              <p>{text("Create a new category or update the selected category.")}</p>
            </div>
          </header>
          <section className="subject-category-form-panel">
            <div className="subject-category-form-heading">
              <div>
                <h3>{text(editingId ? "Edit Subject Category" : "Add Subject Category")}</h3>
                <p>{text("Enter a unique category name and save your changes.")}</p>
              </div>
              <button type="button" className="subject-category-button" onClick={closeForm} disabled={saving}><X size={14} /> {text("Back to List")}</button>
            </div>
            <form className="subject-category-form" onSubmit={handleSubmit}>
              <label className="subject-category-field">
                <span><span className="required">*</span> {text("Subject Category")}</span>
                <input autoFocus required maxLength={100} value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder={text("Subject Category")} aria-label={text("Subject Category")} />
                <small>{text("Required. Category names must be unique within this school's subject category list.")}</small>
              </label>
              <div className="subject-category-form-footer">
                <button type="button" className="subject-category-button" onClick={closeForm} disabled={saving}>{text("Cancel")}</button>
                <div className="subject-category-form-actions">
                  <button type="button" className="subject-category-button" onClick={closeForm} disabled={saving}><ArrowLeft size={14} /> {text("Back to List")}</button>
                  <button type="submit" className="subject-category-button primary" disabled={saving}>
                    {saving ? <RefreshCw size={14} className="subject-category-spin" /> : <Save size={14} />}
                    {text(saving ? "Saving…" : "Save")}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </>
      )}
    </section>
  );
}
