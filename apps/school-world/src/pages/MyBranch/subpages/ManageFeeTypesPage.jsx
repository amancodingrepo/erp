import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ClipboardList, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import FeeTypeEditor from "./FeeTypeEditor.jsx";
import FeeTypeList from "./FeeTypeList.jsx";
import { blankDraft, taxesFor, makeId } from "./feeTypeUtils.js";
import { apiGet, apiPut } from "../../../api.js";

export default function ManageFeeTypesPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("list");
  const [draft, setDraft] = useState(blankDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet("/module-data/manage-fee-types")
      .then(result => {
        if (cancelled) return;
        const items = Array.isArray(result?.data?.items) ? result.data.items : [];
        setFeeTypes(items.map(item => ({
          id: String(item.id || makeId()), name: String(item.name || ""),
          refundable: Boolean(item.refundable), visible: item.visible !== false,
          taxes: { cgst: Boolean(item.taxes?.cgst), sgst: Boolean(item.taxes?.sgst), igst: Boolean(item.taxes?.igst) },
          createdAt: item.createdAt || "", updatedAt: item.updatedAt || ""
        })));
      })
      .catch(error => { if (!cancelled) setLoadError(error.message || "Fee types could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feeTypes.filter(item => !q || [item.name, item.refundable ? "refundable" : "not refundable", item.visible ? "visible" : "hidden", taxesFor(item.taxes).join(" ")].join(" ").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  }, [feeTypes, query]);

  function updateTax(key, checked) {
    setDraft(previous => {
      const taxes = { ...previous.taxes, [key]: checked };
      if (checked && key === "igst") { taxes.cgst = false; taxes.sgst = false; }
      if (checked && (key === "cgst" || key === "sgst")) taxes.igst = false;
      return { ...previous, taxes };
    });
  }

  async function persist(nextRows, message) {
    if (loadError) { notify?.("Fee types were not changed because the saved list could not be loaded. Refresh the page and try again."); return false; }
    setSaving(true);
    try {
      await apiPut("/module-data/manage-fee-types", { data: { items: nextRows } });
      setFeeTypes(nextRows);
      setLoadError("");
      notify?.(message);
      return true;
    } catch (error) {
      notify?.("Fee types could not be saved: " + (error.message || "Please try again."));
      return false;
    } finally { setSaving(false); }
  }
  function beginAdd() { setDraft(blankDraft()); setPage("form"); }
  function beginEdit(item) {
    setDraft({ id: item.id, name: item.name, refundable: Boolean(item.refundable), visible: item.visible !== false, taxes: { cgst: Boolean(item.taxes?.cgst), sgst: Boolean(item.taxes?.sgst), igst: Boolean(item.taxes?.igst) } });
    setPage("form");
  }
  async function saveFeeType(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) { notify?.("Enter a fee type name."); return; }
    if (feeTypes.some(item => item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== draft.id)) { notify?.("A fee type with this name already exists."); return; }
    const now = new Date().toISOString();
    const saved = {
      id: draft.id || makeId(), name, refundable: Boolean(draft.refundable), visible: Boolean(draft.visible),
      taxes: { cgst: Boolean(draft.taxes.cgst), sgst: Boolean(draft.taxes.sgst), igst: Boolean(draft.taxes.igst) },
      createdAt: feeTypes.find(item => item.id === draft.id)?.createdAt || now, updatedAt: now
    };
    const next = draft.id ? feeTypes.map(item => item.id === draft.id ? saved : item) : [...feeTypes, saved];
    if (await persist(next, draft.id ? "Fee type updated." : "Fee type created.")) setPage("list");
  }
  async function toggleVisible(item) {
    await persist(feeTypes.map(row => row.id === item.id ? { ...row, visible: !row.visible, updatedAt: new Date().toISOString() } : row), item.visible ? "Fee type hidden." : "Fee type made visible.");
  }
  async function deleteType(item) {
    if (!window.confirm("Delete fee type \"" + item.name + "\"? Existing templates may still display its saved name.")) return;
    await persist(feeTypes.filter(row => row.id !== item.id), "Fee type deleted.");
  }

  return <section className="my-branch-feature-view fees-setup-page">
    <button type="button" className="my-branch-back-link" onClick={() => page === "form" ? setPage("list") : onBack?.()}><ArrowLeft size={15}/>{page === "form" ? text("Back to List") : text(" Back to Manage your Branch")}</button>
    <section className="fees-setup-header">
      <div><span className="fees-setup-eyebrow">{text("ADMINISTRATIVE · FEE SETTINGS")}</span>
        <div className="fees-setup-title-line"><span className="fees-setup-title-icon"><ClipboardList size={22}/></span><h2>{text(page === "form" ? (draft.id ? "Edit Fee Type" : "Add Fee Type") : "Manage Fee Types")}</h2></div>
        <p>{text(page === "form" ? "Configure refund behavior, visibility, and GST applicability for this fee type." : "Create and maintain fee types used by fee templates and school fee workflows.")}</p>
      </div>
      {page === "list" && <button type="button" className="fees-setup-primary" onClick={beginAdd} disabled={loading || Boolean(loadError)}><Plus size={15}/>{text("Add Fee Type")}</button>}
    </section>
    {loadError && <div className="fees-setup-alert" role="alert">{text("Saved fee types could not be loaded: " + loadError)} <button type="button" onClick={() => window.location.reload()}>{text("Refresh")}</button></div>}
    {page === "form" ? <FeeTypeEditor context={{ text,draft,setDraft,updateTax,saveFeeType,saving,loadError,setPage }} /> : <FeeTypeList context={{ text,feeTypes,filteredTypes,query,setQuery,toggleVisible,saving,beginEdit,deleteType,loading,onBack }} />}
  </section>;
}
