import React from "react";
import { ArrowLeft, CalendarDays, Copy, Download, Eye, Plus, Search, Users, X } from "lucide-react";
import { money } from "./feeTemplateUtils.js";

export default function FeeTemplateListView({ context }) {
  const { text, filterYear, setFilterYear, academicYears, filterStudentType, setFilterStudentType, filteredTemplates, loading, query, setQuery, templateTotal, editTemplate, openApply, copyTemplate, saving, exportTemplate, templates, onBack } = context;
  return (
    <>
      <section className="fees-template-filter-card">
        <label>{text("Academic Year")}<select value={filterYear} onChange={event => setFilterYear(event.target.value)}><option value="">{text("-- All Years --")}</option>{academicYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        <label>{text("Student Type")}<select value={filterStudentType} onChange={event => setFilterStudentType(event.target.value)}><option value="">{text("-- Select --")}</option><option>All Students</option><option>New Students</option><option>Existing Students</option></select></label>
      </section>
      <section className="fees-setup-table-card">
        <div className="fees-setup-table-toolbar"><div><strong>{text("Fee Templates")}</strong><span>{filteredTemplates.length} {text("matching templates")}</span></div><label className="fees-setup-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={text("Start typing to filter list…")}/>{query && <button type="button" onClick={() => setQuery("")} aria-label={text("Clear search")}><X size={13}/></button>}</label></div>
        <div className="fees-setup-table-scroll"><table className="fees-setup-table fees-template-table"><thead><tr><th>{text("Name")}</th><th>{text("Academic Year")}</th><th>{text("Apply to Student Type")}</th><th>{text("Has Optional Fees")}</th><th>{text("Actions")}</th></tr></thead><tbody>
          {filteredTemplates.map(template => <tr key={template.id}><td><strong>{template.name}</strong><small>{(template.installments || []).length} {text("installments")} · {money(templateTotal(template))}</small></td><td>{template.academicYear}</td><td>{text(template.studentType)}</td><td><span className={"fees-setup-state " + (template.hasOptionalFees ? "yes" : "no")}>{text(template.hasOptionalFees ? "Yes" : "No")}</span></td><td><div className="fees-template-row-actions"><button type="button" onClick={() => editTemplate(template)} title={text("View / edit template")}><Eye size={13}/>{text("View")}</button><button type="button" onClick={() => openApply(template)} title={text("Apply template to students")}><Users size={13}/>{text("Apply")}</button><button type="button" onClick={() => copyTemplate(template)} disabled={saving} title={text("Copy template")}><Copy size={13}/>{text("Copy")}</button><button type="button" onClick={() => exportTemplate(template)} title={text("Export fee template")}><Download size={13}/>{text("Export")}</button></div></td></tr>)}
          {!loading && !filteredTemplates.length && <tr><td colSpan={5}><div className="fees-setup-empty"><CalendarDays size={24}/><strong>{query || filterYear || filterStudentType ? text("No templates match these filters.") : text("No fee templates have been created yet.")}</strong><span>{text("Create a template to define fee installments for a student group and academic year.")}</span></div></td></tr>}
        </tbody></table>{loading && <div className="fees-setup-loading">{text("Loading fee templates…")}</div>}</div>
        <div className="fees-setup-table-footer"><span>{text("Showing")} {filteredTemplates.length} {text("of")} {templates.length} {text("templates")}</span><button type="button" className="fees-setup-secondary" onClick={onBack}>{text("Back to My Branch")}</button></div>
      </section>
    </>
  );
}
