import React from "react";
import { ArrowLeft, Search, ClipboardList } from "lucide-react";
import { formatDate } from "./questionnaireUtils.js";

export default function QuestionnaireSubmissions(props) {
  const { detail, setView, submissionsSearch, setSubmissionsSearch, filteredSubmissions, submissions } = props;
  return (
    <section className="questionnaires-submissions-view">
      <div className="questionnaires-subpage-toolbar"><button type="button" className="questionnaires-secondary" onClick={() => setView("list")}><ArrowLeft size={15} /> Back to List</button><div><strong>Submissions — {detail.title}</strong><span>Review student responses and marks.</span></div><div className="questionnaires-search"><Search size={16} /><input value={submissionsSearch} onChange={event => setSubmissionsSearch(event.target.value)} placeholder="Search by name or class..." aria-label="Search submissions" /></div></div>
      <div className="questionnaires-table-card"><div className="questionnaires-table-wrap"><table className="questionnaires-table"><thead><tr><th>Name</th><th>Class</th><th>Marks</th><th>Date</th></tr></thead><tbody>{filteredSubmissions.map(item => <tr key={item.id}><td><strong>{item.name || "Unknown student"}</strong></td><td>{item.className || "—"}</td><td>{item.marks ?? "Pending"}</td><td>{formatDate(item.date)}</td></tr>)}</tbody></table>
        {!filteredSubmissions.length && <div className="questionnaires-empty"><ClipboardList size={28} /><strong>{submissions.length ? "No matching submissions" : "No submissions yet"}</strong><span>{submissions.length ? "Try a different search term." : "Student responses will appear here when submitted."}</span></div>}</div></div>
    </section>
  );
}
