import React from "react";
import { ClipboardList, Pencil, Search, Trash2, X } from "lucide-react";

export default function FeeMasterCatalogTable({ context }) {
  const { text, title, items, fields, filteredItems, query, setQuery, beginEdit, remove, saving, loading, onBack } = context;
  return (<section className="fees-setup-table-card">
      <div className="fees-setup-table-toolbar"><div><strong>{text("Saved Records")}</strong><span>{items.length} {text("records")}</span></div><label className="fees-setup-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list…")}/>{query && <button type="button" onClick={() => setQuery("")} aria-label={text("Clear search")}><X size={13}/></button>}</label></div>
      <div className="fees-setup-table-scroll"><table className="fees-setup-table"><thead><tr>{fields.map(field => <th key={field.key}>{text(field.label)}</th>)}<th>{text("Actions")}</th></tr></thead><tbody>
        {filteredItems.map(item => <tr key={item.id}>{fields.map(field => <td key={field.key}>{field.key === "calculationType" ? text(item[field.key] || "Fixed Amount") : item[field.key] === undefined || item[field.key] === "" ? "—" : String(item[field.key])}</td>)}<td><div className="fees-setup-row-actions"><button type="button" onClick={() => beginEdit(item)} disabled={saving}><Pencil size={13}/>{text("Edit")}</button><button type="button" className="danger" onClick={() => remove(item)} disabled={saving}><Trash2 size={13}/>{text("Delete")}</button></div></td></tr>)}
        {!loading && !filteredItems.length && <tr><td colSpan={fields.length + 1}><div className="fees-setup-empty"><ClipboardList size={24}/><strong>{text(query ? "No records matched your search." : "No records have been created yet.")}</strong><span>{text("Use Add Record to create the first entry.")}</span></div></td></tr>}
      </tbody></table>{loading && <div className="fees-setup-loading">{text("Loading saved records…")}</div>}</div>
      <div className="fees-setup-table-footer"><span>{text("Showing")} {filteredItems.length} {text("of")} {items.length} {text("records")}</span><button type="button" className="fees-setup-secondary" onClick={onBack}>{text("Back to My Branch")}</button></div>
    </section>);
}
