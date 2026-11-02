import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Download,
  Edit2, Plus, RefreshCw, Save, Search, Trash2, Users, X
} from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import "./ManageClassesPage.css";

const EMPTY_FORM = {
  name: "", section: "", displayName: "", availableFrom: "", availableTo: "",
  virtualClassroom: false, hiddenGrade: false, status: "Active", displayOrder: "",
  subjectMappings: []
};
const clean = value => String(value ?? "").trim().replace(/\\s+/g, " ");

function normalizeClasses(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && clean(item.name)).map((item, index) => ({
    id: String(item.id || ""),
    name: clean(item.name),
    section: clean(item.section),
    displayName: clean(item.displayName),
    availableFrom: String(item.availableFrom || ""),
    availableTo: String(item.availableTo || ""),
    virtualClassroom: Boolean(item.virtualClassroom),
    hiddenGrade: Boolean(item.hiddenGrade),
    status: item.status === "Inactive" ? "Inactive" : "Active",
    displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index + 1,
    subjectMappings: Array.isArray(item.subjectMappings) ? item.subjectMappings.map(mapping => ({
      subjectId: String(mapping.subjectId || ""),
      subjectName: clean(mapping.subjectName),
      enabled: mapping.enabled !== false,
      extraCurricular: Boolean(mapping.extraCurricular),
      optional: Boolean(mapping.optional),
      packageSubject: Boolean(mapping.packageSubject),
      language: Boolean(mapping.language),
      teacherId: String(mapping.teacherId || "")
    })) : [],
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  })).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

function csvCell(value) { return '"' + String(value ?? "").replace(/"/g, '""') + '"'; }

export default function ManageClassesPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadPage({ quiet = false } = {}) {
    quiet ? setRefreshing(true) : setLoading(true);
    setError(""); setFeedback("");
    try {
      const results = await Promise.allSettled([
        apiGet("/school-classes"),
        apiGet("/school-subjects"),
        apiGet("/people")
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      const classData = results[0].value;
      setClasses(normalizeClasses(Array.isArray(classData?.classes) ? classData.classes : []));
      if (results[1].status === "fulfilled") {
        const data = results[1].value;
        setSubjects(Array.isArray(data?.subjects) ? data.subjects.filter(s => s && clean(s.name) && s.status !== "Inactive") : []);
      } else setSubjects([]);
      if (results[2].status === "fulfilled") {
        const people = Array.isArray(results[2].value?.people) ? results[2].value.people : [];
        setTeachers(people.filter(person => String(person.personType || "").toLowerCase() === "teacher" && String(person.status || "Active").toLowerCase() === "active")
          .map(person => ({ id: String(person.id), name: clean(person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ")) }))
          .filter(person => person.name).sort((a,b) => a.name.localeCompare(b.name)));
      } else setTeachers([]);
      if (results[1].status === "rejected" || results[2].status === "rejected") {
        setError("Classes loaded, but subjects or teachers could not be loaded. Refresh to try again.");
      }
    } catch (e) {
      setError(e?.message || "Classes could not be loaded. Please refresh and try again.");
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void loadPage(); }, []);

  const visibleClasses = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return classes.filter(item => (includeHidden || !item.hiddenGrade) &&
      (!needle || [item.name, item.section, item.displayName, ...item.subjectMappings.map(m => m.subjectName)].some(v => String(v || "").toLocaleLowerCase().includes(needle))));
  }, [classes, query, includeHidden]);

  const activeCount = classes.filter(item => item.status === "Active").length;
  const mappingCount = classes.reduce((sum, item) => sum + item.subjectMappings.filter(m => m.enabled).length, 0);

  function updateForm(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function clearNotices() { setError(""); setFeedback(""); }
  async function addGradesOneToTen() {
    clearNotices();
    const grades = [
      { grade: 1, name: "Class 1st" },
      { grade: 2, name: "Class 2nd" },
      { grade: 3, name: "Class 3rd" },
      { grade: 4, name: "Class 4th" },
      { grade: 5, name: "Class 5th" },
      { grade: 6, name: "Class 6th" },
      { grade: 7, name: "Class 7th" },
      { grade: 8, name: "Class 8th" },
      { grade: 9, name: "Class 9th" },
      { grade: 10, name: "Class 10th" }
    ];
    const existingKeys = new Set(classes.map(item =>
      clean(item.name).toLocaleLowerCase() + "::" + clean(item.section).toLocaleLowerCase()
    ));
    const missing = grades.filter(item => !existingKeys.has(item.name.toLocaleLowerCase() + "::a"));
    if (!missing.length) {
      setFeedback("Classes 1st to 10th with Section A already exist.");
      return;
    }
    if (!window.confirm(
      "Create the following missing classes with Section A?\n\n" +
      missing.map(item => item.name).join(", ") +
      "\n\nExisting class records will be kept. Subjects and teachers can be assigned afterward."
    )) return;

    const savedAt = new Date().toISOString();
    const newClasses = missing.map(item => ({
      ...EMPTY_FORM,
      id: "",
      name: item.name,
      section: "A",
      displayName: "",
      availableFrom: "",
      availableTo: "",
      virtualClassroom: false,
      hiddenGrade: false,
      status: "Active",
      displayOrder: item.grade,
      subjectMappings: [],
      createdAt: savedAt,
      updatedAt: savedAt
    }));
    setSaving(true);
    try {
      await persist([...classes, ...newClasses]);
      const successMessage = "Created " + newClasses.length + " class(es): " +
        newClasses.map(item => item.name).join(", ") + " (Section A).";
      setFeedback(successMessage);
      notify?.(successMessage);
    } catch (e) {
      setError(e?.message || "Classes 1st to 10th could not be created. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openAddForm() {
    clearNotices(); setEditingId("");
    setForm({ ...EMPTY_FORM, displayOrder: String(classes.length + 1), subjectMappings: subjects.map(subject => ({
      subjectId: String(subject.id || subject.code || subject.name), subjectName: clean(subject.name),
      enabled: false, extraCurricular: false, optional: false, packageSubject: false, language: false, teacherId: ""
    })) });
    setFormOpen(true);
  }
  function openEditForm(item) {
    clearNotices(); setEditingId(item.id);
    const oldById = new Map(item.subjectMappings.map(m => [m.subjectId || m.subjectName, m]));
    const subjectMappings = subjects.map(subject => {
      const id = String(subject.id || subject.code || subject.name);
      const previous = oldById.get(id) || oldById.get(clean(subject.name));
      return previous ? { ...previous, subjectId: id, subjectName: clean(subject.name) } : {
        subjectId: id, subjectName: clean(subject.name), enabled: false,
        extraCurricular: false, optional: false, packageSubject: false, language: false, teacherId: ""
      };
    });
    setForm({ name:item.name, section:item.section, displayName:item.displayName, availableFrom:item.availableFrom,
      availableTo:item.availableTo, virtualClassroom:item.virtualClassroom, hiddenGrade:item.hiddenGrade,
      status:item.status, displayOrder:String(item.displayOrder), subjectMappings });
    setFormOpen(true);
  }
  function closeForm() { if (saving) return; setFormOpen(false); setEditingId(""); setForm(EMPTY_FORM); clearNotices(); }
  function updateMapping(subjectId, key, value) {
    setForm(current => ({ ...current, subjectMappings: current.subjectMappings.map(mapping =>
      mapping.subjectId === subjectId ? { ...mapping, [key]: value, ...(key === "enabled" && !value ? { teacherId: "" } : {}) } : mapping) }));
  }

  async function persist(nextClasses) {
    const normalized = normalizeClasses(nextClasses);
    const response = await apiPut("/school-classes/sync", { classes: normalized });
    if (!Array.isArray(response?.classes)) throw new Error("The server did not return the saved class records.");
    const savedClasses = normalizeClasses(response.classes);
    setClasses(savedClasses);
    return savedClasses;
  }

  async function handleSubmit(event) {
    event.preventDefault(); clearNotices();
    const name = clean(form.name), section = clean(form.section), displayName = clean(form.displayName);
    if (!name) return setError("Class Name is required.");
    if (name.length > 100 || section.length > 50 || displayName.length > 120) return setError("Class Name, Section, or Display Name is too long.");
    if (form.availableFrom && form.availableTo && form.availableFrom > form.availableTo) return setError("Available To must be on or after Available From.");
    const duplicate = classes.find(item => item.id !== editingId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.section.toLocaleLowerCase() === section.toLocaleLowerCase());
    if (duplicate) return setError("A class with this name and section already exists.");
    const savedAt = new Date().toISOString();
    const record = {
      id: editingId || "", name, section, displayName, availableFrom: form.availableFrom, availableTo: form.availableTo,
      virtualClassroom: Boolean(form.virtualClassroom), hiddenGrade: Boolean(form.hiddenGrade),
      status: form.status === "Inactive" ? "Inactive" : "Active",
      displayOrder: form.displayOrder === "" ? classes.length + 1 : Math.max(1, Number(form.displayOrder) || 1),
      subjectMappings: form.subjectMappings.filter(m => m.enabled).map(m => ({ ...m, teacherId: m.teacherId || "" })),
      createdAt: editingId ? classes.find(item => item.id === editingId)?.createdAt || savedAt : savedAt, updatedAt: savedAt
    };
    setSaving(true);
    try {
      await persist(editingId ? classes.map(item => item.id === editingId ? record : item) : [...classes, record]);
      setFormOpen(false); setEditingId(""); setForm(EMPTY_FORM); setQuery("");
      const message = editingId ? "Class updated successfully." : "Class added successfully.";
      setFeedback(message); notify?.(message);
    } catch (e) { setError(e?.message || "Class could not be saved. Please try again."); }
    finally { setSaving(false); }
  }

  async function handleDelete(item) {
    clearNotices();
    if (!window.confirm("Delete class “" + item.name + (item.section ? " - " + item.section : "") + "”? This cannot be undone.")) return;
    setSaving(true);
    try { await persist(classes.filter(current => current.id !== item.id)); setFeedback("Class deleted successfully."); notify?.("Class deleted."); }
    catch (e) { setError(e?.message || "Class could not be deleted. Please try again."); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["Class Name","Section","Display Name","Display Order","Available From","Available To","Virtual Classroom","Status","Subjects","Subject Teacher Mappings"]];
    visibleClasses.forEach(item => rows.push([item.name,item.section,item.displayName,item.displayOrder,item.availableFrom,item.availableTo,item.virtualClassroom ? "Yes" : "No",item.status,
      item.subjectMappings.filter(m=>m.enabled).map(m=>m.subjectName).join("; "),
      item.subjectMappings.filter(m=>m.enabled).map(m=>m.subjectName + ": " + (teachers.find(t=>t.id===m.teacherId)?.name || "Not assigned")).join("; ")]));
    const blob = new Blob(["\\uFEFF" + rows.map(row=>row.map(csvCell).join(",")).join("\\r\\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob), link=document.createElement("a"); link.href=url; link.download="school-world-classes.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="manage-classes-page">
    {error && <div className="mc-alert" role="alert"><AlertCircle size={16}/><span>{text(error)}</span><button type="button" onClick={()=>setError("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {feedback && !error && <div className="mc-alert success" role="status"><CheckCircle2 size={16}/><span>{text(feedback)}</span></div>}
    {!formOpen ? <>
      <header className="mc-heading"><div><span className="mc-eyebrow"><ClipboardList size={13}/>ACADEMICS · CLASS SETUP</span><h2>{text("Manage Classes")}</h2><p>{text("Create classes and sections, configure subjects, and assign teachers to each subject.")}</p></div>
        <div className="mc-actions"><button className="mc-button secondary" type="button" onClick={()=>void loadPage({quiet:true})} disabled={loading||refreshing}><RefreshCw size={14} className={refreshing?"mc-spin":""}/>{text("Refresh")}</button><button className="mc-button secondary" type="button" onClick={exportCsv} disabled={loading||!visibleClasses.length}><Download size={14}/>{text("Export CSV")}</button><button className="mc-button secondary" type="button" onClick={()=>void addGradesOneToTen()} disabled={loading||saving}><Plus size={14}/>{text("Add Classes 1–10")}</button><button className="mc-button primary" type="button" onClick={openAddForm}><Plus size={15}/>{text("Create Class")}</button></div>
      </header>
      <div className="mc-metrics"><button type="button" onClick={()=>setQuery("")}><span className="mc-metric-icon"><ClipboardList size={18}/></span><span><small>{text("Total Classes")}</small><strong>{classes.length}</strong></span></button><button type="button" onClick={()=>{setQuery("");setIncludeHidden(false);}}><span className="mc-metric-icon active"><CheckCircle2 size={18}/></span><span><small>{text("Active Classes")}</small><strong>{activeCount}</strong></span></button><button type="button" onClick={()=>setQuery("")}><span className="mc-metric-icon"><BookOpen size={18}/></span><span><small>{text("Subject Assignments")}</small><strong>{mappingCount}</strong></span></button></div>
      <section className="mc-panel"><div className="mc-toolbar"><div className="mc-count"><strong>{visibleClasses.length}</strong> classes shown</div><div className="mc-filters"><label className="mc-search"><Search size={16}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={text("Search class, section or subject…")}/></label><label className="mc-hidden"><input type="checkbox" checked={includeHidden} onChange={e=>setIncludeHidden(e.target.checked)}/>{text("Include Hidden Grades")}</label></div></div>
        {loading ? <div className="mc-empty"><RefreshCw className="mc-spin" size={22}/><strong>Loading classes…</strong></div> : visibleClasses.length ? <div className="mc-list-table-wrap"><table className="mc-table"><thead><tr><th>Class and Section Name</th><th>Display Order</th><th>Display Name</th><th>Subjects / Teachers</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleClasses.map(item=><tr key={item.id}><td><strong>{item.name}</strong>{item.section&&<small>Section {item.section}</small>}{item.hiddenGrade&&<span className="mc-hidden-badge">Hidden grade</span>}</td><td>{item.displayOrder}</td><td>{item.displayName||"—"}</td><td><div className="mc-subject-summary">{item.subjectMappings.filter(m=>m.enabled).length ? item.subjectMappings.filter(m=>m.enabled).map(m=><span className="mc-subject-pair" key={m.subjectId}><strong className="mc-subject-name">{m.subjectName}</strong><small className="mc-teacher-name">{teachers.find(t=>t.id===m.teacherId)?.name||"Teacher not assigned"}</small></span>) : <em>No subjects assigned</em>}</div></td><td><span className={"mc-status "+(item.status==="Active"?"active":"inactive")}>{item.status}</span></td><td><div className="mc-row-actions"><button type="button" onClick={()=>openEditForm(item)} disabled={saving}><Edit2 size={13}/>Edit</button><button type="button" className="delete" onClick={()=>void handleDelete(item)} disabled={saving}><Trash2 size={13}/>Delete</button></div></td></tr>)}</tbody></table></div> : <div className="mc-empty"><span className="mc-empty-icon"><ClipboardList size={23}/></span><strong>{classes.length?"No classes match your search":"No classes added yet"}</strong><p>{classes.length?"Try another search or include hidden grades.":"Create the first class to configure its sections, subjects and teachers."}</p><button type="button" className="mc-button primary" onClick={openAddForm}><Plus size={14}/>Create Class</button></div>}
      </section>
      <footer className="mc-footer"><CheckCircle2 size={13}/>Class, section, availability, and teacher-subject mappings are saved as relational database records. No class JSON/JSONB payload is used.</footer>
    </> : <>
      <header className="mc-form-heading"><div><span className="mc-eyebrow"><ClipboardList size={13}/>ACADEMICS · CLASS SETUP</span><h2>{text(editingId?"Edit Class":"Add Class")}</h2><p>{text("Set up the class details and select subjects and their teachers.")}</p></div><button type="button" className="mc-button secondary" onClick={closeForm} disabled={saving}><ArrowLeft size={14}/>Back to List</button></header>
      <form className="mc-form" onSubmit={handleSubmit}>
        <section className="mc-section"><header><h3>Class Details</h3><p>Class name, section, visibility and availability.</p></header><div className="mc-grid">
          <label><span>Class Name <b>*</b></span><input required maxLength={100} value={form.name} onChange={e=>updateForm("name",e.target.value)} placeholder="e.g. Class 1"/></label>
          <label><span>Section</span><input maxLength={50} value={form.section} onChange={e=>updateForm("section",e.target.value)} placeholder="e.g. A"/></label>
          <label><span>Display Name</span><input maxLength={120} value={form.displayName} onChange={e=>updateForm("displayName",e.target.value)} placeholder="e.g. Grade 1 - A"/></label>
          <label><span>Display Order</span><input type="number" min="1" value={form.displayOrder} onChange={e=>updateForm("displayOrder",e.target.value)} placeholder="1"/></label>
          <label><span>Available From</span><input type="date" value={form.availableFrom} onChange={e=>updateForm("availableFrom",e.target.value)}/></label>
          <label><span>Available To</span><input type="date" value={form.availableTo} onChange={e=>updateForm("availableTo",e.target.value)}/></label>
          <label><span>Status</span><select value={form.status} onChange={e=>updateForm("status",e.target.value)}><option>Active</option><option>Inactive</option></select></label>
          <label className="mc-check"><input type="checkbox" checked={form.hiddenGrade} onChange={e=>updateForm("hiddenGrade",e.target.checked)}/><span>Hidden Grade</span></label>
          <label className="mc-check wide"><input type="checkbox" checked={form.virtualClassroom} onChange={e=>updateForm("virtualClassroom",e.target.checked)}/><span>Generate Virtual Classroom</span></label>
        </div></section>
        <section className="mc-section"><header><h3>Subjects and Teacher Mapping</h3><p>Enable each subject for this class, set its classification, and assign a teacher. Teacher assignment is saved with the class.</p></header>
          {!subjects.length ? <div className="mc-note">No active subjects were found in Manage Subjects. Add subjects there first, then return here to map them to this class.</div> : <div className="mc-table-wrap"><table className="mc-subject-table"><thead><tr><th>Subject</th><th>Include</th><th>Extra Curricular</th><th>Optional</th><th>Package Subject</th><th>Language</th><th>Teacher</th></tr></thead><tbody>{form.subjectMappings.map(mapping=><tr key={mapping.subjectId}><td><strong>{mapping.subjectName}</strong></td><td><input aria-label={"Include "+mapping.subjectName} type="checkbox" checked={mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"enabled",e.target.checked)}/></td><td><input aria-label={"Extra curricular "+mapping.subjectName} type="checkbox" checked={mapping.extraCurricular} disabled={!mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"extraCurricular",e.target.checked)}/></td><td><input aria-label={"Optional "+mapping.subjectName} type="checkbox" checked={mapping.optional} disabled={!mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"optional",e.target.checked)}/></td><td><input aria-label={"Package subject "+mapping.subjectName} type="checkbox" checked={mapping.packageSubject} disabled={!mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"packageSubject",e.target.checked)}/></td><td><input aria-label={"Language "+mapping.subjectName} type="checkbox" checked={mapping.language} disabled={!mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"language",e.target.checked)}/></td><td><select aria-label={"Teacher for "+mapping.subjectName} value={mapping.teacherId} disabled={!mapping.enabled} onChange={e=>updateMapping(mapping.subjectId,"teacherId",e.target.value)}><option value="">Select teacher</option>{teachers.map(teacher=><option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></td></tr>)}</tbody></table>{!teachers.length&&<div className="mc-note">No active teachers found. Add or activate teachers in Manage Staff to assign them to subjects.</div>}</div>}
        </section>
        <footer className="mc-form-footer"><button type="button" className="mc-button secondary" onClick={closeForm} disabled={saving}><X size={14}/>Cancel</button><button type="submit" className="mc-button primary" disabled={saving}>{saving?<RefreshCw size={14} className="mc-spin"/>:<Save size={14}/>} {saving?"Saving…":"Save Class"}</button></footer>
      </form>
    </>}
  </section>;
}
