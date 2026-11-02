import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Link2, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../api.js";
import ManageExternalLinkEditor from "./ManageExternalLinkEditor.jsx";
import "./ManageExternalLinksPage.css";

export default function ManageExternalLinksPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [links, setLinks] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  async function loadPage({ quiet = false, preserveNotice = false } = {}) {
    quiet ? setRefreshing(true) : setLoading(true);
    setError("");
    if (!preserveNotice) setFeedback("");
    try {
      const result = await apiGet("/external-links");
      const rows = Array.isArray(result?.links) ? result.links : [];
      setLinks(rows);
      try {
        const gradeResult = await apiGet("/external-link-grades");
        setGrades(Array.isArray(gradeResult?.grades) ? gradeResult.grades : []);
      } catch (gradeError) {
        setGrades([]);
        setError(gradeError?.message || "Links loaded, but saved grade records could not be loaded.");
      }
    } catch (requestError) {
      setError(requestError?.message || "External links could not be loaded from the database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadPage(); }, []);
  const gradeNames = useMemo(() => new Map(grades.map(grade => [String(grade.id), grade.className])), [grades]);
  const visibleLinks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return links;
    return links.filter(link => {
      const gradeText = (link.gradeIds || []).map(id => gradeNames.get(String(id)) || "").join(" ");
      return [link.url, link.description, gradeText, link.isCctvCameraLink ? "cctv camera" : ""]
        .some(value => String(value || "").toLocaleLowerCase().includes(needle));
    });
  }, [links, query, gradeNames]);
  function openAddForm() { setEditingLink(null); setEditorOpen(true); setError(""); setFeedback(""); }
  function openEditForm(link) { setEditingLink(link); setEditorOpen(true); setError(""); setFeedback(""); }
  function closeEditor() { if (saving) return; setEditorOpen(false); setEditingLink(null); setError(""); }

  async function saveLink(payload) {
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      if (editingLink?.id) await apiPatch("/external-links/" + encodeURIComponent(editingLink.id), payload);
      else await apiPost("/external-links", payload);
      const message = editingLink?.id ? "External link updated successfully." : "External link saved to the database.";
      setEditorOpen(false);
      setEditingLink(null);
      await loadPage({ quiet: true, preserveNotice: true });
      setFeedback(message);
      notify?.(message);
    } catch (requestError) {
      setError(requestError?.message || "External link could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLink(link) {
    if (!window.confirm("Delete this external link?\n\n" + link.url + "\n\nThis removes the saved link and its grade assignments.")) return;
    setError("");
    setFeedback("");
    try {
      await apiDelete("/external-links/" + encodeURIComponent(link.id));
      await loadPage({ quiet: true, preserveNotice: true });
      setFeedback("External link deleted.");
      notify?.("External link deleted.");
    } catch (requestError) {
      setError(requestError?.message || "External link could not be deleted.");
    }
  }

  if (editorOpen) {
    return <section className="manage-external-links-page">
      <button type="button" className="mel-back" onClick={onBack}><ArrowLeft size={14}/>{text("Back to My Branch")}</button>
      <ManageExternalLinkEditor link={editingLink} grades={grades} saving={saving} onCancel={closeEditor} onSave={saveLink} t={text}/>
    </section>;
  }

  return <section className="manage-external-links-page">
    <button type="button" className="mel-back" onClick={onBack}><ArrowLeft size={14}/>{text("Back to My Branch")}</button>
    <header className="mel-heading">
      <div className="mel-heading-copy">
        <span className="mel-eyebrow"><ExternalLink size={13}/>ADMINISTRATIVE · LINKS</span>
        <h2>{text("Manage External Links")}</h2>
        <p>{text("Add school-specific links, control grade and daycare access, and edit or delete saved links.")}</p>
      </div>
      <div className="mel-heading-actions">
        <button type="button" className="mel-button mel-button-light" onClick={() => void loadPage({ quiet: true })} disabled={loading || refreshing}><RefreshCw size={14}/>{text("Refresh")}</button>
        <button type="button" className="mel-button mel-button-primary" onClick={openAddForm} disabled={loading}><Plus size={15}/>{text("Add Link")}</button>
      </div>
    </header>

    {error && <div className="mel-alert" role="alert"><AlertCircle size={16}/><span>{text(error)}</span><button type="button" onClick={() => setError("")} aria-label={text("Dismiss error")}>×</button></div>}
    {feedback && !error && <div className="mel-alert mel-alert-success" role="status"><CheckCircle2 size={16}/><span>{text(feedback)}</span></div>}

    <section className="mel-toolbar">
      <div className="mel-list-count"><strong>{visibleLinks.length}</strong> {text("of")} {links.length} {text("external links")}</div>
      <label className="mel-search"><Search size={15}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list…")}/></label>
    </section>

    <section className="mel-table-card">
      {loading ? <div className="mel-empty"><LoaderCircle size={22} className="mel-spin"/><strong>{text("Loading saved external links…")}</strong></div> :
        visibleLinks.length ? <div className="mel-table-wrap"><table className="mel-table">
          <thead><tr><th>{text("External Links")}</th><th>{text("Description")}</th><th>{text("Available Grades")}</th><th>{text("Actions")}</th></tr></thead>
          <tbody>{visibleLinks.map(link => {
            const assignedGrades = (link.gradeIds || []).map(id => gradeNames.get(String(id))).filter(Boolean);
            const gradeSummary = link.availableToAllGrades ? text("All grades") : assignedGrades.join(", ") || text("Selected grades");
            return <tr key={link.id}>
              <td className="mel-link-cell"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>{link.isCctvCameraLink && <small>{text("CCTV Camera Link")}</small>}</td>
              <td className="mel-description-cell">{link.description || "—"}</td>
              <td><span className="mel-grade-tag">{gradeSummary}</span></td>
              <td><div className="mel-row-actions">
                <button type="button" onClick={() => openEditForm(link)}><Pencil size={12}/>{text("Edit")}</button>
                <button type="button" className="mel-delete" onClick={() => void deleteLink(link)}><Trash2 size={12}/>{text("Delete")}</button>
              </div></td>
            </tr>;
          })}</tbody>
        </table></div> :
          <div className="mel-empty">
            <span className="mel-empty-icon"><Link2 size={23}/></span>
            <strong>{text(links.length ? "No links match your search" : "No external links saved")}</strong>
            <p>{text(links.length ? "Try another search term." : "Add the first external link. Link details and grade assignments will be saved in relational database tables.")}</p>
            {!links.length && <button type="button" className="mel-button mel-button-primary" onClick={openAddForm}><Plus size={14}/>{text("Add Link")}</button>}
          </div>}
    </section>
    <footer className="mel-footer-note"><CheckCircle2 size={13}/>{text("External links, grade assignments, access flags, and times are stored in relational tables, not JSON/JSONB.")}</footer>
  </section>;
}
