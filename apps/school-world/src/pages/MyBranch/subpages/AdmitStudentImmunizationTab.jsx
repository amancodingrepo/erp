import React from "react";
import { Plus, Trash2, Syringe } from "lucide-react";
import { AdmitField, AdmitSectionHeading } from "./AdmitStudentFields.jsx";

const VACCINE_OPTIONS = ["BCG", "Hepatitis B", "OPV", "DTP / DTaP", "Hib", "IPV", "MMR", "Varicella", "Typhoid", "Hepatitis A", "Tetanus Booster", "Other"];
const STATUS_OPTIONS = ["Pending", "Completed", "Not Required"];

export default function AdmitStudentImmunizationTab({ entries = [], setEntries }) {
  function update(id, patch) {
    setEntries(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item));
  }
  function addEntry() {
    const id = "vaccine-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    setEntries(previous => [...previous, { id, vaccine: "", dueDate: "", administeredDate: "", status: "Pending", notes: "" }]);
  }
  function removeEntry(id) {
    setEntries(previous => previous.filter(item => item.id !== id));
  }
  return <section className="admit-tab-panel">
    <div className="admit-section-toolbar">
      <AdmitSectionHeading title="Immunization Schedule" description="Track vaccination due dates and completed doses for the student." />
      <button type="button" className="admit-inline-primary" onClick={addEntry}><Plus size={15} /> Add Vaccine</button>
    </div>
    {entries.length ? <div className="admit-immunization-list">{entries.map((item, index) => <article className="admit-immunization-row" key={item.id}>
      <header><strong>Vaccine {index + 1}</strong><button type="button" className="admit-remove-row" aria-label={"Remove vaccine " + (index + 1)} onClick={() => removeEntry(item.id)}><Trash2 size={15} /></button></header>
      <div className="admit-form-grid two">
        <AdmitField label="Vaccine Name" value={item.vaccine} options={VACCINE_OPTIONS} onChange={value => update(item.id, { vaccine: value })} />
        <AdmitField label="Status" value={item.status} options={STATUS_OPTIONS} onChange={value => update(item.id, { status: value })} />
        <AdmitField label="Due Date" type="date" value={item.dueDate} onChange={value => update(item.id, { dueDate: value })} />
        <AdmitField label="Administered Date" type="date" value={item.administeredDate} onChange={value => update(item.id, { administeredDate: value })} />
        <AdmitField label="Notes" value={item.notes} onChange={value => update(item.id, { notes: value })} className="admit-span-two" />
      </div>
    </article>)}</div> : <div className="admit-tab-empty"><Syringe size={22} /><span>No immunization entries added. Select Add Vaccine to record a dose or due date.</span></div>}
  </section>;
}
