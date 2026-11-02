import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, RefreshCw, Save, X } from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import { normalizeSelectedOptionalSubjectIds, persistentStudentDbId, toggleOptionalSubjectSelection } from "./optionalSubjectSelection.js";
import "./StudentOptionalSubjectsPanel.css";

const clean = value => String(value ?? "").trim().replace(/\s+/g, " ");
const classLabel = item => clean(item?.displayName || [clean(item?.name), clean(item?.section)].filter(Boolean).join(" "));

export default function StudentOptionalSubjectsPanel({ classRecords = [], yearOptions = [], initialClassId = "", initialAcademicYear = "", onDataLoaded, onContextChange, t }) {
  const text = typeof t === "function" ? t : value => value;
  const classOptions = useMemo(() => classRecords
    .filter(item => item?.id && item.status !== "Inactive" && (item.subjectMappings || []).some(m => m && m.enabled !== false && m.optional))
    .map(item => ({ id: String(item.id), label: classLabel(item), count: (item.subjectMappings || []).filter(m => m && m.enabled !== false && m.optional).length }))
    .sort((a,b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" })), [classRecords]);
  const [classId, setClassId] = useState(initialClassId);
  const [academicYear, setAcademicYear] = useState(initialAcademicYear);
  const [data, setData] = useState({ class: null, academicYear: "", subjects: [], students: [] });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { if (!classId && classOptions[0]?.id) setClassId(classOptions[0].id); }, [classOptions, classId]);
  useEffect(() => { if (!academicYear && yearOptions[0]) setAcademicYear(yearOptions[0]); }, [academicYear, yearOptions]);
  useEffect(() => { onContextChange?.({ classId, academicYear }); }, [classId, academicYear]);

  useEffect(() => {
    if (!classId || !academicYear) return undefined;
    let cancelled = false;
    setLoading(true); setError(""); setMessage("");
    apiGet("/student-optional-subjects?classId=" + encodeURIComponent(classId) + "&academicYear=" + encodeURIComponent(academicYear))
      .then(result => {
        if (cancelled) return;
        const next = { class: result?.class || null, academicYear: String(result?.academicYear || academicYear), subjects: Array.isArray(result?.subjects) ? result.subjects : [], students: Array.isArray(result?.students) ? result.students : [] };
        setData(next);
        setDrafts(Object.fromEntries(next.students.map(s => [String(s.id), normalizeSelectedOptionalSubjectIds(s.selectedSubjectIds, next.subjects.map(item => item.id))])));
        onDataLoaded?.(next);
      })
      .catch(reason => { if (!cancelled) setError(reason?.message || "Student optional-subject selections could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [classId, academicYear, reloadKey]);

  async function save(student) {
    // The table/Performance Report roster is keyed by student code; persistence
    // endpoints and relational FKs require the student's database UUID.
    const studentKey = String(student?.id || "");
    const studentId = persistentStudentDbId(student);
    if (!studentKey || !studentId) {
      setError("The student's database ID is missing. Reload the list and try again.");
      return;
    }
    const allowed = data.subjects.map(item => item.id);
    const subjectIds = normalizeSelectedOptionalSubjectIds(drafts[studentKey] ?? student.selectedSubjectIds ?? [], allowed);
    setSavingId(studentKey); setError(""); setMessage("");
    try {
      const result = await apiPut("/student-optional-subjects/" + encodeURIComponent(studentId), { classId, academicYear, subjectIds });
      const saved = normalizeSelectedOptionalSubjectIds(result?.subjectIds ?? subjectIds, allowed);
      const next = { ...data, students: data.students.map(row => String(row.id) === studentKey ? { ...row, selectedSubjectIds: saved } : row) };
      setData(next); setDrafts(current => ({ ...current, [studentKey]: saved })); onDataLoaded?.(next);
      setMessage("Saved optional subjects for " + (student.name || student.studentCode || studentKey) + ".");
    } catch (reason) {
      setError(reason?.message || "Optional-subject selection could not be saved.");
    } finally { setSavingId(""); }
  }

  return <section className="pr-panel">
    <div className="pr-panel-header">
      <div><h3>{text("Student-wise optional subject selection")}</h3><p>{text("Choose optional subjects for each student. Choices are saved to the school's relational database for the selected class and academic year.")}</p></div>
      <span className="pr-chip">{data.students.length} {text("active students")}</span>
    </div>
    {error && <div className="pr-notice pr-notice-error" role="alert"><X size={16}/><span>{error}</span></div>}
    {message && <div className="pr-notice pr-notice-success" role="status"><CheckCircle2 size={16}/><span>{message}</span></div>}
    <div className="pr-panel-body">
      <div className="pr-filters">
        <label className="pr-field">{text("Class / Section")}<select value={classId} onChange={e => setClassId(e.target.value)} required><option value="">{text("Choose class with optional subjects")}</option>{classOptions.map(item => <option key={item.id} value={item.id}>{item.label} · {item.count} {text("optional")}</option>)}</select></label>
        <label className="pr-field">{text("Academic year")}<select value={academicYear} onChange={e => setAcademicYear(e.target.value)} required>{Array.from(new Set([academicYear, ...yearOptions].filter(Boolean))).map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        <div className="pr-field"><span>{text("Selection data")}</span><div className="pr-inline-meta"><span className="pr-chip">{data.subjects.length} {text("optional subjects")}</span><button type="button" className="pr-button pr-button-small" onClick={() => setReloadKey(k => k + 1)} disabled={loading}><RefreshCw size={13}/>{text("Reload list")}</button></div></div>
      </div>
      {!classOptions.length && <div className="pr-notice"><BookOpen size={16}/><span>{text("No active class has optional subjects configured. Open Manage Classes and mark the relevant subjects as Optional first.")}</span></div>}
      {loading ? <div className="pr-loading"><span className="pr-spinner"/>{text("Loading student selections from the database…")}</div>
       : !classId ? <div className="pr-table-empty">{text("Choose a class that has at least one active optional subject.")}</div>
       : !data.subjects.length ? <div className="pr-notice"><BookOpen size={16}/><span>{text("No active optional subjects are mapped to this class. Configure subjects in Manage Classes.")}</span></div>
       : <div className="pr-table-wrap"><table className="pr-table pr-optional-selection-table">
        <thead><tr><th>{text("Student")}</th><th>{text("Roll number")}</th><th>{text("Select optional subjects")}</th><th>{text("Selected")}</th><th>{text("Action")}</th></tr></thead>
        <tbody>{data.students.length ? data.students.map(student => {
          const studentId = String(student.id);
          const selected = normalizeSelectedOptionalSubjectIds(drafts[studentId] ?? student.selectedSubjectIds ?? [], data.subjects.map(s => s.id));
          return <tr key={studentId}>
            <td><strong>{student.name || text("Unnamed student")}</strong><span className="pr-secondary">{student.studentCode || studentId}{student.section ? " · " + text("Section") + " " + student.section : ""}</span></td>
            <td>{student.rollNumber || "—"}</td>
            <td><div className="pr-optional-choice-list">{data.subjects.map(subject => <label key={subject.id} className="pr-optional-choice"><input type="checkbox" checked={selected.includes(String(subject.id))} onChange={e => setDrafts(current => ({ ...current, [studentId]: toggleOptionalSubjectSelection(current[studentId] ?? student.selectedSubjectIds ?? [], subject.id, e.target.checked, data.subjects.map(s => s.id)) }))}/><span>{subject.name}{subject.code ? " (" + subject.code + ")" : ""}</span></label>)}</div></td>
            <td><span className={"pr-chip " + (selected.length ? "pr-chip-green" : "pr-chip-muted")}>{selected.length}</span></td>
            <td><button type="button" className="pr-button pr-button-primary pr-button-small" onClick={() => void save(student)} disabled={savingId === studentId || loading}><Save size={13}/>{savingId === studentId ? text("Saving…") : text("Save selection")}</button></td>
          </tr>;
        }) : <tr><td colSpan={5} className="pr-table-empty">{text("No active students were found in this class for the selected academic year.")}</td></tr>}</tbody>
      </table></div>}
      <p className="pr-field-help">{text("Only active optional subjects mapped to the selected class can be saved. Primary / compulsory subjects are not selectable here.")}</p>
    </div>
  </section>;
}
