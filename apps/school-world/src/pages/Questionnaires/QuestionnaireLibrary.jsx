import React from "react";
import { Plus, Search, Eye, Pencil, Users, ClipboardList, FileUp, X, CalendarDays, FileText, LoaderCircle } from "lucide-react";
import { formatDate } from "./questionnaireUtils.js";

export default function QuestionnaireLibrary(props) {
  const { startNew, showPdfImport, setShowPdfImport, pdfFiles, setPdfFiles, setError, importingPdf, createFromPdf, search, setSearch, filteredItems, items, loadData, openEditor, openDetail, openAssignments, openSubmissions } = props;
  return (
    <>
<div className="questionnaires-toolbar">
        <div className="questionnaires-toolbar-actions">
          <button type="button" className="questionnaires-link-action" onClick={startNew}><Plus size={16} /> Add Questionnaires</button>
          <button type="button" className={"questionnaires-link-action " + (showPdfImport ? "selected" : "")} onClick={() => { setShowPdfImport(value => !value); setPdfFiles([]); setError(""); }}><FileUp size={16} /> Add Questionnaire From PDF</button>
        </div>
        <div className="questionnaires-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Start typing to filter list..." aria-label="Search questionnaires" /></div>
      </div>
      {showPdfImport && <div className="questionnaires-pdf-import">
        <label className="questionnaires-file-picker"><FileText size={18} /><span>{pdfFiles.length ? pdfFiles.map(file => file.name).join(", ") : "Choose one or more PDF files"}</span><input type="file" accept="application/pdf,.pdf" multiple onChange={event => { setPdfFiles(Array.from(event.target.files || [])); setError(""); }} /></label>
        <button type="button" className="questionnaires-primary" onClick={createFromPdf} disabled={importingPdf || !pdfFiles.length}>{importingPdf ? <LoaderCircle size={15} className="questionnaires-spin" /> : <Plus size={15} />}{importingPdf ? " Creating…" : " Create"}</button>
        <p>PDFs are kept as attachments. Review imported content and add individual questions before assigning it to students. Maximum 5 MB per PDF.</p>
      </div>}
      <section className="questionnaires-table-card">
        <div className="questionnaires-table-heading"><div><h3>Questionnaire Library</h3><span>{filteredItems.length} questionnaire{filteredItems.length === 1 ? "" : "s"}</span></div><button type="button" className="questionnaires-icon-button" title="Refresh" aria-label="Refresh questionnaires" onClick={() => loadData()}><CalendarDays size={16} /></button></div>
        <div className="questionnaires-table-wrap"><table className="questionnaires-table">
          <thead><tr><th>Title</th><th>Type</th><th>Valid From Date</th><th>Valid Till Date</th><th>Total Marks</th><th>Actions</th></tr></thead>
          <tbody>{filteredItems.map(item => <tr key={item.id}>
            <td><strong>{item.title || "Untitled questionnaire"}</strong>{item.subject && <small>{item.subject}</small>}</td>
            <td><span className="questionnaires-type-pill">{item.type || "Survey"}</span></td>
            <td>{formatDate(item.validFrom)}</td><td>{formatDate(item.validTo)}</td><td className="questionnaires-total-cell">{Number(item.totalMarks || 0).toFixed(2)}</td>
            <td><div className="questionnaires-row-actions">
              <button type="button" onClick={() => openEditor(item)} title="Edit questionnaire"><Pencil size={14} /><span>Edit</span></button>
              <button type="button" onClick={() => openDetail(item)} title="View questionnaire"><Eye size={14} /><span>View</span></button>
              <button type="button" onClick={() => openAssignments(item)} title="Assign classes"><Users size={14} /><span>Assign Classes</span></button>
              <button type="button" onClick={() => openSubmissions(item)} title="View submissions"><ClipboardList size={14} /><span>Submissions</span></button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {!filteredItems.length && <div className="questionnaires-empty"><FileText size={28} /><strong>{items.length ? "No matching questionnaires" : "No questionnaires created yet"}</strong><span>{items.length ? "Try a different search term." : "Use Add Questionnaires to create your first survey, quiz or assessment."}</span></div>}</div>
      </section>
    </>
  );
}
