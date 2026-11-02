import React from "react";
import { Plus } from "lucide-react";

export default function StudentImmunizationTab({ context }) {
  const { t, data, setVaccine, setEditingVaccine, setShowImmunization, update } = context;
  return (
    <>

          <div className="module-toolbar"><button className="legacy-primary" onClick={() => { setVaccine({ name: "", scheduleDate: "", administeredDate: "", remarks: "", status: "Scheduled", image: "" }); setEditingVaccine(-1); setShowImmunization(true); }}><Plus size={15}/>{t(" Add / Update Immunization Schedule")}</button></div>
          <div className="legacy-table-wrap"><table className="legacy-table"><thead><tr>{["Vaccination Name", "Schedule Date", "Administered Date", "Remarks", "Status", "Supportive Image", "Action"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data.immunizations.length ? data.immunizations.map((v,i)=><tr key={`${v.name}-${i}`}><td>{v.name}</td><td>{v.scheduleDate || "—"}</td><td>{v.administeredDate || "—"}</td><td>{v.remarks || "—"}</td><td>{v.status}</td><td>{v.image || "—"}</td><td><button className="small-icon-button" onClick={() => {setVaccine(v);setEditingVaccine(i);setShowImmunization(true);}}>{t("Edit")}</button> <button className="small-icon-button red-text" onClick={() => update("immunizations", data.immunizations.filter((_,ix)=>ix!==i))}>{t("Delete")}</button></td></tr>) : <tr><td colSpan="7" className="legacy-empty-row">{t("Immunization details are not available.")}</td></tr>}</tbody></table></div>
        
    </>
  );
}
