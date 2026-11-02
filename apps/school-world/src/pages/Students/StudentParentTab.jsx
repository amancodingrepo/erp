import React from "react";
import { Save } from "lucide-react";
import { Field, NameParts } from "./StudentFormFields.jsx";

export default function StudentParentTab({ context }) {
  const { t, data, setData, update, saving, save } = context;
  return (
    <>

          <div className="legacy-parent-form">
            <Field label="Login Method" value={data.loginMethod} onChange={v => update("loginMethod", v)} options={["Phone", "Email"]}/>
            <Field label="Email" value={data.email} onChange={v => update("email", v)} type="email" className="wide-field"/>
            <Field label="Primary Parent" required value={data.primaryParent} onChange={v => update("primaryParent", v)} options={["Mother", "Father", "Guardian"]} className="wide-field"/>
            <NameParts label="Mother Name" prefix="mother" data={data} setData={setData}/>
            <NameParts label="Father Name" prefix="father" data={data} setData={setData}/>
            <NameParts label="Guardian Name" prefix="guardian" data={data} setData={setData}/>
            <Field label="Mother Phone" required value={data.motherPhone} onChange={v => update("motherPhone", v)} type="tel"/>
            <Field label="Alternate Phone" value={data.alternatePhone} onChange={v => update("alternatePhone", v)} type="tel"/>
            <Field label="Alternate Phone Relation" value={data.alternateRelation} onChange={v => update("alternateRelation", v)} options={["Not Specified", "Mother", "Father", "Guardian", "Relative", "Other"]}/>
            <Field label="Mother Date of Birth" value={data.motherDob} onChange={v => update("motherDob", v)} type="date"/>
            <Field label="Address" value={data.address} onChange={v => update("address", v)} className="wide-field" placeholder={t("Street")}/>
            <Field label="City" value={data.city} onChange={v => update("city", v)}/>
            <Field label="State" value={data.state} onChange={v => update("state", v)}/>
            <Field label="Zip" value={data.zip} onChange={v => update("zip", v)}/>
            <Field label="Country" value={data.country} onChange={v => update("country", v)}/>
          </div>
          <div className="legacy-tab-footer"><button type="button" className="legacy-save" disabled={saving} onClick={() => save("Parent")}><Save size={15}/>{t(saving ? "Saving…" : "Save")}</button></div>
        
    </>
  );
}
