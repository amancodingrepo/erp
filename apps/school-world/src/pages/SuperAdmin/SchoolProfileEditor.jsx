import React from "react";
import { Save, X } from "lucide-react";
import SchoolProfileFields from "./SchoolProfileFields.jsx";
import SchoolLogoPicker from "./SchoolLogoPicker.jsx";

export default function SchoolProfileEditor({
  editingSchoolId, setEditingSchoolId, profile, setProfile, currentSchool,
  profileLoading, profileSaving, saveProfile, setProfileLogoDirty
}) {
  if (!editingSchoolId) return null;
  const updateLogo = logo => {
    setProfile(previous=>({...previous,logoDataUrl:logo.dataUrl,logoFileName:logo.fileName}));
    setProfileLogoDirty(true);
  };
  return (
    <div className="db-superadmin-edit-profile">
      <div className="db-superadmin-edit-heading"><div><span className="db-auth-eyebrow">SCHOOL PROFILE</span><h2>{profile.name||currentSchool?.name||"Edit school"}</h2><p>Saved directly to the existing schools database record.</p></div><button type="button" className="db-superadmin-close-editor" onClick={()=>setEditingSchoolId("")} aria-label="Close profile editor"><X size={17}/></button></div>
      {profileLoading ? <p>Loading profile…</p> : <form onSubmit={saveProfile}>
        <SchoolProfileFields record={profile} codeReadOnly onChange={(field,value)=>setProfile(previous=>({...previous,[field]:value}))}/>
        <SchoolLogoPicker value={profile.logoDataUrl} fileName={profile.logoFileName} onChange={updateLogo} onRemove={()=>{setProfile(previous=>({...previous,logoDataUrl:"",logoFileName:""}));setProfileLogoDirty(true);}} disabled={profileSaving}/>
        <div className="db-superadmin-edit-actions"><button type="button" className="db-superadmin-cancel-edit" onClick={()=>setEditingSchoolId("")} disabled={profileSaving}>Cancel</button><button type="submit" className="db-superadmin-save-profile" disabled={profileSaving||profileLoading}><Save size={15}/>{profileSaving?"Saving…":"Save school profile"}</button></div>
      </form>}
    </div>
  );
}
