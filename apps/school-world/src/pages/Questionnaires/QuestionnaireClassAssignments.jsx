import React from "react";
import { ArrowLeft, Save, LoaderCircle } from "lucide-react";
import { classDisplay } from "./questionnaireUtils.js";

export default function QuestionnaireClassAssignments(props) {
  const { detail, setView, saving, saveAssignments, classes, setDetailAllClasses, updateDetailClass } = props;
  return (
    <section className="questionnaires-assign-view">
      <div className="questionnaires-subpage-toolbar"><button type="button" className="questionnaires-secondary" onClick={() => setView("list")}><ArrowLeft size={15} /> Back to List</button><div><strong>Assign Classes to Questionnaire</strong><span>{detail.title}</span></div><button type="button" className="questionnaires-primary" onClick={saveAssignments} disabled={saving}>{saving ? <LoaderCircle size={15} className="questionnaires-spin" /> : <Save size={15} />}{saving ? " Saving…" : " Save"}</button></div>
      <div className="questionnaires-class-assignment-card">
        <label className="questionnaires-class-choice all"><input type="checkbox" checked={Boolean(detail.allClasses)} onChange={event => setDetailAllClasses(event.target.checked)} /> <strong>All Classes</strong></label>
        <div className="questionnaires-assignment-grid">{classes.map(classItem => {
          const checked = Boolean(detail.allClasses) || (detail.classes || []).some(item => item.id === classItem.id);
          return <label key={classItem.id} className="questionnaires-assignment-row"><input type="checkbox" checked={checked} disabled={Boolean(detail.allClasses)} onChange={event => updateDetailClass(classItem, event.target.checked)} /><span>{classDisplay(classItem)}</span></label>;
        })}</div>
        {!classes.length && <div className="questionnaires-empty compact">No active classes are available. Add classes in school setup first.</div>}
      </div>
    </section>
  );
}
