import React from "react";
import { X } from "lucide-react";
import { Field } from "./StudentFormFields.jsx";

export default function ImmunizationScheduleDialog({ context }) {
  const { showImmunization, setShowImmunization, vaccine, setVaccine, editingVaccine, t, notify, data, update } = context;
  return (
    showImmunization && <div className="legacy-modal-backdrop"><div className="legacy-modal"><div className="legacy-modal-head"><h2>{t("Add / Update Immunization Schedule")}</h2><button onClick={() => setShowImmunization(false)}><X size={18}/></button></div><div className="legacy-form-grid"><Field label="Vaccination Name" value={vaccine.name} onChange={v => setVaccine({...vaccine,name:v})} required/><Field label="Schedule Date" value={vaccine.scheduleDate} onChange={v => setVaccine({...vaccine,scheduleDate:v})} type="date"/><Field label="Administered Date" value={vaccine.administeredDate} onChange={v => setVaccine({...vaccine,administeredDate:v})} type="date"/><Field label="Status" value={vaccine.status} onChange={v => setVaccine({...vaccine,status:v})} options={["Scheduled", "Administered", "Overdue", "Skipped"]}/><Field label="Remarks" value={vaccine.remarks} onChange={v => setVaccine({...vaccine,remarks:v})} className="span-two"/><Field label="Supportive Image (file name)" value={vaccine.image} onChange={v => setVaccine({...vaccine,image:v})}/></div><div className="legacy-modal-actions"><button className="plain-button" onClick={() => setShowImmunization(false)}>{t("Cancel")}</button><button className="legacy-save" onClick={() => { if(!vaccine.name.trim()){notify("Enter a vaccination name.");return;} const list=[...data.immunizations]; if(editingVaccine >= 0) list[editingVaccine]=vaccine; else list.push(vaccine); update("immunizations", list); setShowImmunization(false); notify("Immunization schedule added to the form. Select Save to persist it."); }}>{t("Save schedule")}</button></div></div></div>
  );
}
