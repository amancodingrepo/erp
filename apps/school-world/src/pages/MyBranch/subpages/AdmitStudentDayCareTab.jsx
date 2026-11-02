import React from "react";
import { Baby } from "lucide-react";
import { AdmitField, AdmitYesNo, AdmitSectionHeading } from "./AdmitStudentFields.jsx";

export default function AdmitStudentDayCareTab({ dayCare, setDayCareField }) {
  return <section className="admit-tab-panel">
    <AdmitSectionHeading title="Day Care" description="Record day-care enrollment and the authorized pickup arrangements." />
    <div className="admit-form-grid two">
      <AdmitYesNo label="Requires Day Care" value={dayCare.enabled || "No"} onChange={value => setDayCareField("enabled", value)} />
      <AdmitField label="Start Date" type="date" value={dayCare.startDate || ""} onChange={value => setDayCareField("startDate", value)} />
      <AdmitField label="Drop-off Time" type="time" value={dayCare.dropOffTime || ""} onChange={value => setDayCareField("dropOffTime", value)} />
      <AdmitField label="Pickup Time" type="time" value={dayCare.pickupTime || ""} onChange={value => setDayCareField("pickupTime", value)} />
      <AdmitField label="Authorized Pickup Person" value={dayCare.pickupPerson || ""} onChange={value => setDayCareField("pickupPerson", value)} />
      <AdmitField label="Pickup Contact Number" type="tel" value={dayCare.pickupPhone || ""} onChange={value => setDayCareField("pickupPhone", value)} />
      <AdmitField label="Day Care Notes" value={dayCare.notes || ""} onChange={value => setDayCareField("notes", value)} className="admit-span-two" />
    </div>
    <div className="admit-tab-information"><Baby size={17} /><span>Day-care details are saved with the student profile and can be updated later.</span></div>
  </section>;
}
