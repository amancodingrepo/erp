import React,{useEffect,useState} from 'react';
import { Building2, RefreshCw, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../api.js';
import CreateSchoolForm from "./CreateSchoolForm.jsx";
import RegisteredSchoolsList from "./RegisteredSchoolsList.jsx";
import SchoolProfileEditor from "./SchoolProfileEditor.jsx";
import TemplateAssignmentsPanel from "../Templates/Assignments/TemplateAssignmentsPanel.jsx";

const blankSchoolForm = () => ({
  name:'', code:'', adminEmail:'', adminPassword:'',
  address:'', phone:'', email:'', timezone:'Asia/Kolkata',
  logoDataUrl:'', logoFileName:''
});
const blankProfile = () => ({
  id:'', name:'', code:'', address:'', phone:'', email:'', timezone:'Asia/Kolkata',
  logoDataUrl:'', logoFileName:''
});

export default function SuperAdminPage({user,onLogout}){
 const [schools,setSchools]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [form,setForm]=useState(blankSchoolForm);
 const [busy,setBusy]=useState(false);
 const [editingSchoolId,setEditingSchoolId]=useState('');
 const [profile,setProfile]=useState(blankProfile);
 const [profileLoading,setProfileLoading]=useState(false);
 const [profileSaving,setProfileSaving]=useState(false);
 const [profileLogoDirty,setProfileLogoDirty]=useState(false);

 async function load(){
   setLoading(true);setError('');
   try { const result=await apiGet('/superadmin/schools'); setSchools(result.schools||[]); }
   catch(e){ setError(e.message); }
   finally { setLoading(false); }
 }
 useEffect(()=>{load();},[]);

 async function create(event){
   event.preventDefault();setBusy(true);setError('');setSuccess('');
   try {
     const payload={...form};
     delete payload.logoDataUrl;
     if(form.logoDataUrl)payload.logoDataUrl=form.logoDataUrl;
     const result=await apiPost('/superadmin/schools',payload);
     setSuccess('Created '+result.school.name+'. School admin: '+result.adminEmail+'. School profile and optional logo were stored in the database.');
     setForm(blankSchoolForm());
     await load();
   } catch(e){setError(e.message);}
   finally {setBusy(false);}
 }

 async function openProfile(school){
   if(editingSchoolId===school.id){setEditingSchoolId('');return;}
   setEditingSchoolId(school.id);setProfileLoading(true);setError('');setSuccess('');setProfile(blankProfile());setProfileLogoDirty(false);
   try {
     const result=await apiGet('/superadmin/schools/'+encodeURIComponent(school.id)+'/profile');
     const saved=result.school||{};
     const config=saved.config&&typeof saved.config==='object'?saved.config:{};
     setProfile({
       id:saved.id,name:saved.name||'',code:saved.code||'',address:saved.address||'',
       phone:saved.phone||'',email:saved.email||'',timezone:saved.timezone||config.timezone||'Asia/Kolkata',
       logoDataUrl:config.logoDataUrl||'',logoFileName:config.logoFileName||''
     });
   } catch(e){setError(e.message);setEditingSchoolId('');}
   finally {setProfileLoading(false);}
 }

 async function saveProfile(event){
   event.preventDefault();
   if(!profile.id||profileSaving)return;
   setProfileSaving(true);setError('');setSuccess('');
   try {
     const payload={name:profile.name,address:profile.address,phone:profile.phone,email:profile.email,timezone:profile.timezone};
     if(profileLogoDirty){
       if(profile.logoDataUrl){payload.logoDataUrl=profile.logoDataUrl;payload.logoFileName=profile.logoFileName;}
       else payload.removeLogo=true;
     }
     await apiPatch('/superadmin/schools/'+encodeURIComponent(profile.id)+'/profile',payload);
     setProfileLogoDirty(false);
     setSuccess('Saved '+profile.name+' profile, contact fields, and logo to the database.');
     await load();
   } catch(e){setError(e.message);}
   finally {setProfileSaving(false);}
 }

 const currentSchool=schools.find(school=>school.id===editingSchoolId);

 return <div className="db-superadmin">
  <header><div className="db-superadmin-brand"><Building2 size={24}/><div><strong>School World</strong><small>Super Admin · School Accounts & Branding</small></div></div><div className="db-superadmin-user"><span>{user.email}</span><button type="button" onClick={onLogout}><LogOut size={15}/> Sign out</button></div></header>
  <main>
   <div className="db-superadmin-title"><div><span className="db-auth-eyebrow">TENANT ADMINISTRATION</span><h1>School accounts</h1><p>Create schools and edit each school's saved name, address, contacts, timezone, and logo.</p></div><button type="button" className="db-superadmin-refresh" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
   {error&&<div className="db-auth-error"><AlertTriangle size={16}/>{error}</div>}
   {success&&<div className="db-auth-success"><CheckCircle2 size={16}/>{success}</div>}
   <div className="db-superadmin-grid">
    <CreateSchoolForm form={form} setForm={setForm} create={create} busy={busy}/>
    <RegisteredSchoolsList schools={schools} loading={loading} editingSchoolId={editingSchoolId} openProfile={openProfile}/>
    <SchoolProfileEditor editingSchoolId={editingSchoolId} setEditingSchoolId={setEditingSchoolId} profile={profile} setProfile={setProfile} currentSchool={currentSchool} profileLoading={profileLoading} profileSaving={profileSaving} saveProfile={saveProfile} setProfileLogoDirty={setProfileLogoDirty}/>
   </div>
   <TemplateAssignmentsPanel />
  </main>
 </div>;
}
