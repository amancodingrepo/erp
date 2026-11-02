import React from "react";
import useModuleDataField from "../../useModuleDataField.js";

export default function DayCareModulePage({ students = [], t }) {
  const [dayCareState, setDayCareState] = useModuleDataField("Day Care", "dayCareState", {});
  const todayStudents = students.slice(0, 12);
  return <section className="module-card"><div className="module-card-title"><h2>{t("Day-care register")}</h2><span>{todayStudents.length} {t("sample records")}</span></div><div className="module-table-wrap"><table className="module-table"><thead><tr><th>{t("Student")}</th><th>{t("Class")}</th><th>{t("Parent phone")}</th><th>{t("Check-in status")}</th><th>{t("Action")}</th></tr></thead><tbody>{todayStudents.map(student=>{const status=dayCareState[student.id]||"Not checked in";return <tr key={student.id}><td><strong>{student.name}</strong><small>{student.id}</small></td><td>{student.className}</td><td>{student.phone||"—"}</td><td><span className={`module-status ${status==="Checked in"?"active":"inactive"}`}>{t(status)}</span></td><td><button className="module-small-button" type="button" onClick={()=>setDayCareState(prev=>({...prev,[student.id]:status==="Checked in"?"Checked out":"Checked in"}))}>{t(status==="Checked in"?"Check out":"Check in")}</button></td></tr>})}</tbody></table></div><p className="module-note">{t("Check-in changes are saved in the school database.")}</p></section>;
}
