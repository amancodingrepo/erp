import React from "react";
import { Check, CalendarDays, ChevronDown, ClipboardList, Plus, Search, Users } from "lucide-react";
import { studentClassKey, studentIdentity, studentIsActive, studentParentClassification } from "./feeTemplateUtils.js";

export default function ApplyFeeTemplateWorkspace({ context }) {
  const { screen, applyTemplate, text, changeApplyTemplate, applyBusy, templates, applyStudentType, updateApplyFilters, applyNationalityOpen, setApplyNationalityOpen, applyNationalities, nationalityOptions, applyParentType, applyClassRow, assignmentLoadError, refreshTemplateAssignments, classOptions, applyClassSelectedKeys, setApplyClassSelectedKeys, students, studentClassKey, studentIsActive, studentIdentity, assignedTemplateForStudent, enterApplyClass, applyClassBulkCandidates, runApplyTemplate, finishApplyToClasses, applySelectedIds, setApplySelectedIds, eligibleStudentsInClass, applyStudentCandidates, studentParentClassification, applyProgress, selectedApplyStudents, applyClass, setScreen, setApplyClass } = context;
  return (
    <section className="fees-template-apply-workspace">
      <div className="fees-template-apply-filter-card">
        <label>{text("Fee Template Name")}
          <select value={applyTemplate.id} onChange={event => changeApplyTemplate(event.target.value)} disabled={applyBusy}>
            {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <label>{text("Apply By Student Type")}
          <select value={applyStudentType} onChange={event => updateApplyFilters({ studentType: event.target.value })} disabled={applyBusy}>
            <option>All Students</option><option>New Students</option><option>Existing Students</option>
          </select>
        </label>
        <div className="fees-template-nationality-field">
          <span>{text("Apply By Nationality")}</span>
          <button type="button" className="fees-template-nationality-trigger" aria-expanded={applyNationalityOpen} onClick={() => setApplyNationalityOpen(open => !open)} disabled={applyBusy}>
            {applyNationalities.length === nationalityOptions.length && nationalityOptions.length ? text("All selected (" + nationalityOptions.length + ")") : text(applyNationalities.length + " selected")}
            <span aria-hidden="true">▾</span>
          </button>
          {applyNationalityOpen && <div className="fees-template-nationality-menu">
            <label><input type="checkbox" checked={nationalityOptions.length > 0 && applyNationalities.length === nationalityOptions.length} onChange={event => updateApplyFilters({ nationalities: event.target.checked ? nationalityOptions.map(option => option.key) : [] })}/><span>{text("Select All")}</span></label>
            {nationalityOptions.map(option => <label key={option.key}><input type="checkbox" checked={applyNationalities.includes(option.key)} onChange={event => {
              const next = event.target.checked ? [...new Set([...applyNationalities, option.key])] : applyNationalities.filter(value => value !== option.key);
              updateApplyFilters({ nationalities: next });
            }}/><span>{text(option.label)}</span></label>)}
            {!nationalityOptions.length && <p>{text("No nationality values are recorded for students.")}</p>}
          </div>}
        </div>
        <label>{text("Apply By Parent Type")}
          <select value={applyParentType} onChange={event => updateApplyFilters({ parentType: event.target.value })} disabled={applyBusy}>
            <option>All</option><option>Staff Parent</option><option>Non-Staff Parent</option>
          </select>
        </label>
        {screen === "apply-students" && <div className="fees-template-apply-class-summary"><span>{text("Class")}</span><strong>{applyClassRow?.label || "—"}</strong></div>}
      </div>

      {assignmentLoadError && (screen === "apply-classes" || screen === "apply-students") && <div className="fees-setup-alert" role="alert">{text("Existing fee-template assignments could not be verified. Applying templates is disabled until the fee ledger can be checked.")} <button type="button" onClick={refreshTemplateAssignments}>{text("Retry")}</button><small>{assignmentLoadError}</small></div>}
      {screen === "apply-classes" && <section className="fees-template-apply-stage">
        <div className="fees-template-apply-stage-heading"><div><h3>{text("Select Classes")}</h3><p>{text("Select one or more classes, or open a class to choose individual students.")}</p></div><span>{applyClassSelectedKeys.length} {text("selected")}</span></div>
        <div className="fees-setup-table-scroll fees-template-apply-class-scroll">
          <table className="fees-setup-table fees-template-apply-class-table">
            <thead><tr>
              <th><label className="fees-template-select-all"><input type="checkbox" checked={classOptions.length > 0 && classOptions.every(option => applyClassSelectedKeys.includes(option.key))} onChange={event => setApplyClassSelectedKeys(event.target.checked ? classOptions.map(option => option.key) : [])} disabled={applyBusy}/>{text("Select All")}</label></th>
              <th>{text("Class")}</th><th>{text("Students")}</th><th>{text("Action")}</th>
            </tr></thead>
            <tbody>
              {classOptions.map(option => {
                const classStudents = students.filter(student => studentClassKey(student) === option.key && studentIsActive(student) && studentIdentity(student));
                const assignedCount = classStudents.filter(student => assignedTemplateForStudent(student)).length;
                const eligibleCount = classStudents.length - assignedCount;
                return <tr key={option.key}>
                  <td><input type="checkbox" aria-label={text("Select class " + option.label)} checked={applyClassSelectedKeys.includes(option.key)} onChange={event => setApplyClassSelectedKeys(previous => event.target.checked ? [...new Set([...previous, option.key])] : previous.filter(key => key !== option.key))} disabled={applyBusy || Boolean(assignmentLoadError) || eligibleCount === 0}/></td>
                  <td><strong>{option.label}</strong></td>
                  <td><span>{eligibleCount} {text("eligible")}</span>{assignedCount > 0 && <small className="fees-template-assigned-count">{assignedCount} {text("already assigned")}</small>}</td>
                  <td><button type="button" className="fees-template-apply-link" onClick={() => enterApplyClass(option)} disabled={applyBusy || Boolean(assignmentLoadError) || eligibleCount === 0}>{text("Apply to Students")}</button></td>
                </tr>;
              })}
              {!classOptions.length && <tr><td colSpan={4}><div className="fees-setup-empty"><Users size={22}/><strong>{text("No classes found.")}</strong><span>{text("Student records need a class before fee templates can be applied.")}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="fees-template-apply-actions">
          <span>{applyClassBulkCandidates.length} {text("eligible student(s) in selected classes")}</span>
          <div><button type="button" className="fees-setup-primary" onClick={() => runApplyTemplate(applyClassBulkCandidates)} disabled={applyBusy || Boolean(assignmentLoadError) || !applyClassSelectedKeys.length || !applyClassBulkCandidates.length}>{applyBusy ? text("Applying…") : text("Apply")}</button>
            <button type="button" className="fees-setup-secondary" onClick={finishApplyToClasses} disabled={applyBusy}>{text("Back to List")}</button></div>
        </div>
      </section>}

      {screen === "apply-students" && <section className="fees-template-apply-stage">
        <div className="fees-template-apply-stage-heading"><div><h3>{text("Select Students")}</h3><p>{text("Students remain listed while the filters determine which checkboxes are selected.")}</p></div><span>{applySelectedIds.length} {text("selected")}</span></div>
        <div className="fees-setup-table-scroll fees-template-apply-student-scroll">
          <table className="fees-template-apply-student-table">
            <thead><tr><th colSpan={2}><label className="fees-template-select-all"><input type="checkbox" checked={allApplySelected} onChange={event => setApplySelectedIds(event.target.checked ? eligibleStudentsInClass.map(studentIdentity) : [])} disabled={applyBusy || !applyStudentCandidates.length}/>{text("Select All Students in Class")}</label></th></tr></thead>
            <tbody>
              {Array.from({ length: Math.ceil(applyStudentCandidates.length / 2) }, (_, rowIndex) => {
                const left = applyStudentCandidates[rowIndex * 2];
                const right = applyStudentCandidates[rowIndex * 2 + 1];
                return <tr key={rowIndex}>{[left, right].map((student, columnIndex) => student ? <td key={studentIdentity(student)}>
                  <label className={"fees-template-apply-student-option" + (assignedTemplateForStudent(student) ? " is-assigned" : "")} title={assignedTemplateForStudent(student) ? text("Remove the existing fee template before assigning another one.") : ""}>
                    <input type="checkbox" checked={!assignedTemplateForStudent(student) && applySelectedIds.includes(studentIdentity(student))} onChange={event => setApplySelectedIds(previous => event.target.checked ? [...new Set([...previous, studentIdentity(student)])] : previous.filter(id => id !== studentIdentity(student)))} disabled={applyBusy || Boolean(assignmentLoadError) || Boolean(assignedTemplateForStudent(student))}/>
                    <span><strong>{student.name || student.fullName || text("Unnamed student")}</strong><small>{text("Scholar No.:")} {student.scholarNumber || student.enrollmentNumber || student.id || "—"}{student.enrollmentNumber ? " · " + text("Enrollment No.:") + " " + student.enrollmentNumber : ""}</small>{assignedTemplateForStudent(student) && <em>{text("Template already applied")}: {assignedTemplateForStudent(student).templateName} · {text("reverse any payment and remove it before applying another template")}</em>}</span>
                  </label>
                </td> : <td key={"empty-" + rowIndex + "-" + columnIndex} className="fees-template-apply-empty-cell" />)}</tr>;
              })}
              {!applyStudentCandidates.length && <tr><td colSpan={2}><div className="fees-setup-empty"><Users size={22}/><strong>{text("No active students found in this class.")}</strong><span>{text("Choose another class or check student status.")}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
        {applyParentType !== "All" && !applyStudentCandidates.some(student => studentParentClassification(student)) && <p className="fees-template-apply-help">{text("Parent-type details are not recorded for students in this class, so the parent filter cannot select them.")}</p>}
        {applyProgress && <div className="fees-apply-progress" role="status">{applyProgress}</div>}
        <div className="fees-template-apply-actions">
          <span>{selectedApplyStudents.filter(student => studentClassKey(student) === applyClass).length} {text("student(s) selected")}</span>
          <div><button type="button" className="fees-setup-primary" disabled={applyBusy || Boolean(assignmentLoadError) || !selectedApplyStudents.some(student => studentClassKey(student) === applyClass)} onClick={() => runApplyTemplate(selectedApplyStudents.filter(student => studentClassKey(student) === applyClass))}>{applyBusy ? text("Applying…") : text("Apply")}</button>
            <button type="button" className="fees-setup-secondary" onClick={() => { setScreen("apply-classes"); setApplyClass(""); setApplySelectedIds([]); setApplyNationalityOpen(false); }} disabled={applyBusy}>{text("Back to List")}</button></div>
        </div>
      </section>}
    </section>
  );
}
