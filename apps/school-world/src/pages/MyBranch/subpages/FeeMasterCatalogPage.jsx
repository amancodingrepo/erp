import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ClipboardList, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import FeeMasterCatalogEditor from "./FeeMasterCatalogEditor.jsx";
import FeeMasterCatalogTable from "./FeeMasterCatalogTable.jsx";
import { createId, blankFromFields } from "./feeMasterCatalogUtils.js";
import { apiGet, apiPut } from "../../../api.js";

export default function FeeMasterCatalogPage({ onBack, notify, t, moduleKey, title, description, fields }) {
  const text = typeof t === "function" ? t : value => value;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("list");
  const [draft, setDraft] = useState(() => blankFromFields(fields));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet("/module-data/" + encodeURIComponent(moduleKey)).then(result => {
      if (cancelled) return;
      const saved = Array.isArray(result?.data?.items) ? result.data.items : [];
      setItems(saved);
      setLoadError("");
    }).catch(error => {
      if (!cancelled) setLoadError(error.message || title + " could not be loaded.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleKey, title]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(item => !needle || fields.some(field => String(item[field.key] ?? "").toLowerCase().includes(needle)))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: "base" }));
  }, [items, query, fields]);

  function beginAdd() {
    setDraft(blankFromFields(fields));
    setPage("form");
  }
  function beginEdit(item) {
    setDraft({ ...blankFromFields(fields), ...item });
    setPage("form");
  }
  async function persist(next, successMessage) {
    if (loadError) {
      notify?.(title + " was not changed because its saved records could not be loaded. Refresh and try again.");
      return false;
    }
    setSaving(true);
    try {
      await apiPut("/module-data/" + encodeURIComponent(moduleKey), { data: { items: next } });
      setItems(next);
      setLoadError("");
      notify?.(successMessage);
      return true;
    } catch (error) {
      notify?.(title + " could not be saved: " + (error.message || "Please try again."));
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    const normalized = {};
    for (const field of fields) {
      const raw = draft[field.key];
      if (field.required && !String(raw ?? "").trim()) {
        notify?.("Enter " + field.label.toLowerCase() + ".");
        return;
      }
      if (field.type === "number" && String(raw ?? "").trim() !== "") {
        const value = Number(raw);
        const maxValue = field.key === "value" && draft.calculationType === "Percentage" ? 100 : field.max;
        if (!Number.isFinite(value) || value < (field.min ?? 0) || (maxValue !== undefined && value > maxValue)) {
          notify?.(field.label + " must be between " + (field.min ?? 0) + " and " + (maxValue ?? "the allowed maximum") + ".");
          return;
        }
        normalized[field.key] = value;
      } else {
        normalized[field.key] = String(raw ?? "").trim();
      }
    }
    if (normalized.name && items.some(item => String(item.id) !== String(draft.id || "") && String(item.name || "").trim().toLowerCase() === normalized.name.toLowerCase())) {
      notify?.("A record with this name already exists.");
      return;
    }
    const now = new Date().toISOString();
    const saved = { ...draft, ...normalized, id: draft.id || createId(moduleKey), createdAt: draft.createdAt || now, updatedAt: now };
    const next = draft.id ? items.map(item => String(item.id) === String(draft.id) ? saved : item) : [saved, ...items];
    if (await persist(next, draft.id ? title + " updated." : title + " saved.")) setPage("list");
  }
  async function remove(item) {
    if (!window.confirm('Delete "' + String(item.name || "this record") + '" from ' + title + '?')) return;
    await persist(items.filter(row => String(row.id) !== String(item.id)), title + " deleted.");
  }

  return <section className="my-branch-feature-view fees-setup-page fee-master-catalog-page">
    <button type="button" className="my-branch-back-link" onClick={() => page === "form" ? setPage("list") : onBack?.()}><ArrowLeft size={15}/>{page === "form" ? text("Back to List") : text(" Back to Manage your Branch")}</button>
    <section className="fees-setup-header">
      <div><span className="fees-setup-eyebrow">{text("ADMINISTRATIVE · FEE SETTINGS")}</span>
        <div className="fees-setup-title-line"><span className="fees-setup-title-icon"><ClipboardList size={22}/></span><h2>{text(page === "form" ? (draft.id ? "Edit " : "Add ") + title.replace(/^Manage /, "") : title)}</h2></div>
        <p>{text(description)}</p>
      </div>
      {page === "list" && <button type="button" className="fees-setup-primary" onClick={beginAdd} disabled={loading || Boolean(loadError)}><Plus size={15}/>{text("Add Record")}</button>}
    </section>
    {loadError && <div className="fees-setup-alert" role="alert">{text("Saved records could not be loaded: " + loadError)} <button type="button" onClick={() => window.location.reload()}>{text("Refresh")}</button></div>}
    {page === "form" ? <FeeMasterCatalogEditor context={{ text,fields,draft,setDraft,save,saving,loadError,setPage }} /> : <FeeMasterCatalogTable context={{ text,title,items,fields,filteredItems,query,setQuery,beginEdit,remove,saving,loading,onBack }} />}
  </section>;
}
