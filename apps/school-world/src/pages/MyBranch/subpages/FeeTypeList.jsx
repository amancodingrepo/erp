import React from "react";
import { ClipboardList, Eye, EyeOff, Pencil, Search, Trash2, X } from "lucide-react";
import { taxesFor } from "./feeTypeUtils.js";

export default function FeeTypeList({ context }) {
  const { text, feeTypes, filteredTypes, query, setQuery, toggleVisible, saving, beginEdit, deleteType, loading, onBack } = context;
  return (<section className="fees-setup-table-card">
      <div className="fees-setup-table-toolbar"><div><strong>{text("Fee Types")}</strong><span>{feeTypes.length} {text("saved types")}</span></div><label className="fees-setup-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list…")}/>{query && <button type="button" onClick={() => setQuery("")} aria-label={text("Clear search")}><X size={13}/></button>}</label></div>
      <div className="fees-setup-table-scroll"><table className="fees-setup-table"><thead><tr><th>{text("Name")}</th><th>{text("Is Refundable")}</th><th>{text("Is Visible")}</th><th>{text("Taxes")}</th><th>{text("Actions")}</th></tr></thead><tbody>
        {filteredTypes.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td><span className={"fees-setup-state " + (item.refundable ? "yes" : "no")}>{text(item.refundable ? "Yes" : "No")}</span></td><td><button type="button" className={"fees-setup-state-button " + (item.visible ? "yes" : "no")} onClick={() => toggleVisible(item)} disabled={saving} title={text("Click to change visibility")}>{item.visible ? <><Eye size={12}/>{text("Yes")}</> : <><EyeOff size={12}/>{text("No")}</>}</button></td><td>{taxesFor(item.taxes).length ? <div className="fees-setup-tax-pills">{taxesFor(item.taxes).map(tax => <span key={tax}>{tax}</span>)}</div> : <span className="fees-setup-muted">—</span>}</td><td><div className="fees-setup-row-actions"><button type="button" onClick={() => beginEdit(item)} disabled={saving}><Pencil size={13}/>{text("Edit")}</button><button type="button" className="danger" onClick={() => deleteType(item)} disabled={saving}><Trash2 size={13}/>{text("Delete")}</button></div></td></tr>)}
        {!loading && !filteredTypes.length && <tr><td colSpan={5}><div className="fees-setup-empty"><ClipboardList size={24}/><strong>{query ? text("No fee types matched your search.") : text("No fee types have been created yet.")}</strong><span>{text("Use Add Fee Type to create the first record.")}</span></div></td></tr>}
      </tbody></table>{loading && <div className="fees-setup-loading">{text("Loading saved fee types…")}</div>}</div>
      <div className="fees-setup-table-footer"><span>{text("Showing")} {filteredTypes.length} {text("of")} {feeTypes.length} {text("fee types")}</span><button type="button" className="fees-setup-secondary" onClick={onBack}>{text("Back to My Branch")}</button></div>
    </section>);
}
