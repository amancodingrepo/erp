import React from "react";
import { AdmitField, AdmitNameFields, AdmitSectionHeading } from "./AdmitStudentFields.jsx";

const LOGIN_METHODS = ["Phone", "Email"];
const RELATIONS = ["Mother", "Father", "Guardian", "Other", "Not Specified"];

export default function AdmitStudentParentTab({ parent, setParentField }) {
  function setNamePart(prefix, key, value) {
    setParentField(prefix + key[0].toUpperCase() + key.slice(1), value);
  }

  return <section className="admit-tab-panel">
    <AdmitSectionHeading title="Parent / Guardian Details" description="Add the primary parent or guardian contact and portal sign-in details." />
    <div className="admit-form-grid two admit-parent-login">
      <AdmitField label="Login Method" value={parent.loginMethod || "Phone"} options={LOGIN_METHODS} onChange={value => setParentField("loginMethod", value)} />
      <AdmitField label="Email" type="email" value={parent.email} required={parent.loginMethod === "Email"} onChange={value => setParentField("email", value)} />
      <AdmitField label="Password" type="password" value={parent.password} required onChange={value => setParentField("password", value)} hint="Set a password for the parent portal. Existing parent accounts keep their current password." />
      <AdmitField label="Relation" value={parent.relation || "Not Specified"} required options={RELATIONS} onChange={value => setParentField("relation", value)} />
    </div>

    <div className="admit-parent-name-grid">
      <AdmitNameFields label="Mother Name" value={{ first: parent.motherFirst, middle: parent.motherMiddle, last: parent.motherLast }}
        onChange={(key, value) => setNamePart("mother", key, value)} />
      <AdmitNameFields label="Father Name" value={{ first: parent.fatherFirst, middle: parent.fatherMiddle, last: parent.fatherLast }}
        onChange={(key, value) => setNamePart("father", key, value)} />
      <AdmitNameFields label="Guardian Name" value={{ first: parent.guardianFirst, middle: parent.guardianMiddle, last: parent.guardianLast }}
        onChange={(key, value) => setNamePart("guardian", key, value)} />
    </div>

    <div className="admit-form-grid two admit-parent-contact-grid">
      <AdmitField label="Phone" type="tel" value={parent.phone} required onChange={value => setParentField("phone", value)} placeholder="Primary parent phone" />
      <AdmitField label="Alternate Phone" type="tel" value={parent.alternatePhone} onChange={value => setParentField("alternatePhone", value)} />
      <AdmitField label="Alternate Phone Relation" value={parent.alternatePhoneRelation || "Not Specified"} options={RELATIONS} onChange={value => setParentField("alternatePhoneRelation", value)} />
      <AdmitField label="Date of Birth" type="date" value={parent.dob} onChange={value => setParentField("dob", value)} />
      <AdmitField label="Street / Address" value={parent.address} onChange={value => setParentField("address", value)} className="admit-span-two" />
      <AdmitField label="City" value={parent.city} onChange={value => setParentField("city", value)} />
      <AdmitField label="State" value={parent.state} onChange={value => setParentField("state", value)} />
      <AdmitField label="Zip" value={parent.zip} onChange={value => setParentField("zip", value)} />
      <AdmitField label="Country" value={parent.country || "India"} onChange={value => setParentField("country", value)} />
    </div>
  </section>;
}
