import React from "react";
import { Building2, Pencil } from "lucide-react";

export default function RegisteredSchoolsList({ schools, loading, editingSchoolId, openProfile }) {
  return (
    <section className="db-superadmin-panel">
      <div className="db-superadmin-list-heading"><h2>Registered schools</h2><span>{schools.length} accounts</span></div>
      {loading ? <p>Loading schools…</p> : schools.length ? <div className="db-superadmin-school-list">{schools.map(school=><article key={school.id} className={editingSchoolId===school.id?"is-editing":""}>
        <div className="db-superadmin-school-icon">{school.has_logo&&<span className="db-superadmin-logo-dot"/>}<Building2 size={19}/></div>
        <div className="db-superadmin-school-copy"><strong>{school.name}</strong><small>{school.code} · {school.student_count} students · {school.account_count} accounts</small><small>{school.address||"Address not entered"}{school.phone?" · "+school.phone:""}{school.email?" · "+school.email:""}</small></div>
        <span className={"db-superadmin-active "+(school.is_active?"":"off")}>{school.is_active?"Active":"Inactive"}</span>
        <button type="button" className="db-superadmin-edit-button" onClick={()=>openProfile(school)}><Pencil size={14}/>{editingSchoolId===school.id?"Close":"Edit profile"}</button>
      </article>)}</div> : <p>No schools found.</p>}
      <p className="db-superadmin-note">Each profile updates the selected school only. Existing students, fee records, accounts, and other school data are kept intact.</p>
    </section>
  );
}
