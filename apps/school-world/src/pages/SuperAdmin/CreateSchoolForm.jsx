import React from "react";
import { Plus } from "lucide-react";
import SchoolProfileFields from "./SchoolProfileFields.jsx";
import SchoolLogoPicker from "./SchoolLogoPicker.jsx";

export default function CreateSchoolForm({ form, setForm, create, busy }) {
  const updateLogo = logo => setForm(previous => ({...previous, logoDataUrl:logo.dataUrl, logoFileName:logo.fileName}));
  return (
    <section className="db-superadmin-panel">
      <h2><Plus size={18}/> Create a school</h2>
      <p>Enter the school details and school administrator login. All branding fields are saved in the current database.</p>
      <form onSubmit={create}>
        <SchoolProfileFields record={form} showCode onChange={(field,value)=>setForm(previous=>({...previous,[field]:value}))}/>
        <SchoolLogoPicker value={form.logoDataUrl} fileName={form.logoFileName} onChange={updateLogo} onRemove={()=>setForm(previous=>({...previous,logoDataUrl:"",logoFileName:""}))} disabled={busy}/>
        <div className="db-superadmin-form-divider"><span>School administrator login</span></div>
        <label>School admin email<input type="email" required value={form.adminEmail} onChange={event=>setForm(previous=>({...previous,adminEmail:event.target.value}))} placeholder="admin@school.edu"/></label>
        <label>Initial password<input type="password" minLength={10} required value={form.adminPassword} onChange={event=>setForm(previous=>({...previous,adminPassword:event.target.value}))} placeholder="At least 10 characters"/></label>
        <button className="db-auth-submit" disabled={busy}>{busy?"Creating…":"Create school account"}</button>
      </form>
    </section>
  );
}
