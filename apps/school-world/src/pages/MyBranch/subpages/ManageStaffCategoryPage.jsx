import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, Pencil, Plus, RefreshCw, Save, ToggleLeft, ToggleRight, X } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../../../api.js";
import "./ManageStaffCategoryPage.css";

export default function ManageStaffCategoryPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet("/staff-categories");
      setCategories(Array.isArray(result?.categories) ? result.categories : []);
    } catch (requestError) {
      setError(requestError?.message || "Staff categories could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCategories(); }, []);

  const activeCount = categories.filter(item => item.isActive).length;
  const inactiveCount = categories.length - activeCount;
  const visibleCategories = useMemo(
    () => categories.filter(item => showInactive ? !item.isActive : item.isActive),
    [categories, showInactive]
  );

  function resetForm(clearSuccess = true) {
    setName("");
    setDescription("");
    setEditingId("");
    setError("");
    if (clearSuccess) setSuccess("");
  }
  function editCategory(category) {
    setEditingId(category.id);
    setName(category.name || "");
    setDescription(category.description || "");
    setError("");
    setSuccess("");
  }

  async function saveCategory(event) {
    event.preventDefault();
    const categoryName = name.trim();
    if (!categoryName) return setError("Enter a staff category name.");
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const wasEditing = Boolean(editingId);
      if (wasEditing) {
        await apiPatch("/staff-categories/" + encodeURIComponent(editingId), { name: categoryName, description: description.trim() });
      } else {
        await apiPost("/staff-categories", { name: categoryName, description: description.trim() });
      }
      resetForm(false);
      await loadCategories();
      const message = wasEditing ? "Staff category updated." : "Staff category created and saved to the database.";
      setSuccess(message);
      notify?.(message);
    } catch (requestError) {
      setError(requestError?.message || "Staff category could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(category) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPatch("/staff-categories/" + encodeURIComponent(category.id), { isActive: !category.isActive });
      setSuccess(category.isActive ? "Staff category deactivated." : "Staff category activated.");
      await loadCategories();
    } catch (requestError) {
      setError(requestError?.message || "Staff category status could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="staff-category-page">
      <button type="button" className="sc-back" onClick={onBack}><ArrowLeft size={15} />{text("Back to My Branch")}</button>
      <header className="sc-heading">
        <div><h2>{text("Manage Staff Category")}</h2><p>{text("Create and manage staff categories saved in the relational database. One Way Communication uses these same categories.")}</p></div>
        <button type="button" className="sc-secondary" onClick={() => void loadCategories()} disabled={loading || saving}><RefreshCw size={15} className={loading ? "sc-spin" : ""}/>{text("Refresh")}</button>
      </header>

      {error && <div className="sc-message error" role="alert"><AlertCircle size={16}/><span>{text(error)}</span><button type="button" onClick={() => setError("")} aria-label={text("Dismiss error")}><X size={13}/></button></div>}
      {success && !error && <div className="sc-message success" role="status"><CheckCircle2 size={16}/><span>{text(success)}</span></div>}

      <div className="sc-layout">
        <section className="sc-panel">
          <header className="sc-panel-heading"><h3>{text(editingId ? "Edit Staff Category" : "Add Staff Category")}</h3><p>{text("Only categories saved here appear in One Way Communication.")}</p></header>
          <form className="sc-form" onSubmit={saveCategory}>
            <label className="sc-field"><span>{text("Category Name")} *</span><input value={name} onChange={event => setName(event.target.value)} required maxLength={100} placeholder={text("e.g. Teaching Staff")} /></label>
            <label className="sc-field"><span>{text("Description")}</span><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={4} placeholder={text("Optional category description")} /></label>
            <div className="sc-form-actions">
              {editingId && <button type="button" className="sc-secondary" onClick={resetForm} disabled={saving}>{text("Cancel edit")}</button>}
              <button type="submit" className="sc-primary" disabled={saving || loading}>
                {saving ? <LoaderCircle size={15} className="sc-spin"/> : editingId ? <Save size={15}/> : <Plus size={15}/>}
                {text(saving ? "Saving…" : editingId ? "Save Changes" : "Add Category")}
              </button>
            </div>
          </form>
        </section>

        <section className="sc-panel sc-category-list-panel">
          <header className="sc-list-heading">
            <div><h3>{text("Saved Staff Categories")}</h3><p>{text("Total")}: {categories.length} · {text("Active")}: {activeCount} · {text("Inactive")}: {inactiveCount}</p></div>
            <div className="sc-tabs">
              <button type="button" className={!showInactive ? "selected" : ""} onClick={() => setShowInactive(false)}>{text("Active")} ({activeCount})</button>
              <button type="button" className={showInactive ? "selected" : ""} onClick={() => setShowInactive(true)}>{text("Inactive")} ({inactiveCount})</button>
            </div>
          </header>
          {loading ? <div className="sc-empty"><LoaderCircle className="sc-spin" size={20}/>{text("Loading saved categories…")}</div> :
            visibleCategories.length ? <div className="sc-table-wrap"><table className="sc-table"><thead><tr><th>{text("Category")}</th><th>{text("Description")}</th><th>{text("Status")}</th><th>{text("Actions")}</th></tr></thead><tbody>
              {visibleCategories.map(category => <tr key={category.id}>
                <td><strong>{category.name}</strong></td><td>{category.description || "—"}</td>
                <td><span className={"sc-status " + (category.isActive ? "active" : "inactive")}>{text(category.isActive ? "Active" : "Inactive")}</span></td>
                <td><div className="sc-row-actions">
                  <button type="button" className="sc-row-button" onClick={() => editCategory(category)} disabled={saving}><Pencil size={13}/>{text("Edit")}</button>
                  <button type="button" className="sc-row-button" onClick={() => void toggleStatus(category)} disabled={saving}>{category.isActive ? <ToggleRight size={14}/> : <ToggleLeft size={14} />}{text(category.isActive ? "Deactivate" : "Activate")}</button>
                </div></td>
              </tr>)}
            </tbody></table></div> :
            <div className="sc-empty"><strong>{text(showInactive ? "No inactive categories" : "No saved staff categories")}</strong><span>{text(showInactive ? "Deactivated categories will appear here." : "Add your first staff category using the form.")}</span></div>}
        </section>
      </div>
    </section>
  );
}
