import React from "react";
import { Camera, CloudDownload, ExternalLink, FileText, Save, UserCircle, Users } from "lucide-react";
import { Field, YesNo } from "./StudentFormFields.jsx";

export default function StudentDetailsTab({ context }) {
  const { t, data, update, classOptions, photo, photoSaving, handleStudentPhotoUpload, onSave, onOpenAdmission, shortName, notify, saving, save } = context;
  return (
    <>

        <section className="legacy-demographics student-demographics-card">
          <div className="student-details-column">
            <section className="student-form-section">
              <h2 className="student-form-section-title"><Users size={17}/>{t(" Personal Details")}</h2>
              <div className="legacy-demographics-grid student-personal-fields">
          <div className="legacy-field"><span><b className="required-star">*</b>{t("Name")}</span><div className="name-parts-inputs">
            <input value={data.firstName} onChange={e => update("firstName", e.target.value)} placeholder={t("First Name")} aria-label={t("First name")}/>
            <input value={data.middleName} onChange={e => update("middleName", e.target.value)} placeholder={t("Middle Name")} aria-label={t("Middle name")}/>
            <input value={data.lastName} onChange={e => update("lastName", e.target.value)} placeholder={t("Last Name")} aria-label={t("Last name")}/>
          </div></div>
          <Field label="Date of Birth" type="date" required value={data.dob} onChange={v => update("dob", v)}/>
          <Field label="Gender" required value={data.gender} onChange={v => update("gender", v)} options={["Male", "Female", "Other", "Not specified"]}/>
          <Field label="Academic Year" className="academic-year-field" required value={data.academicYear} onChange={v => update("academicYear", v)} options={["2026-2027", "2025-2026", "2024-2025", "2023-2024"]}/>
          <Field label="Class" required value={data.className} onChange={v => update("className", v)} options={Array.from(new Set(["PRE NURSERY A", "PRE NURSERY B", "NURSERY A", "NURSERY B", "LKG A", "UKG A", "CLASS 1", "CLASS 2", "CLASS 3", "CLASS 4", "CLASS 5", ...classOptions]))}/>
          <Field label="Enrollment Date" type="date" value={data.enrollmentDate} onChange={v => update("enrollmentDate", v)}/>
          <Field label="Enrollment No." value={data.enrollmentNo} onChange={v => update("enrollmentNo", v)} placeholder={t("Enrollment Number")}/>
          <Field label="Houses" value={data.house} onChange={v => update("house", v)} options={["--Select House--", "Red House", "Blue House", "Green House", "Yellow House"]}/>
          <Field label="Roll Number" value={data.rollNumber} onChange={v => update("rollNumber", v)}/>
          <YesNo label="Lunch From School" value={data.lunchFromSchool} onChange={v => update("lunchFromSchool", v)}/>
          <Field label="Aadhar Number" value={data.aadhar} onChange={v => update("aadhar", v)} placeholder={t("Aadhar Number")}/>
              </div>
            </section>
            <section className="student-form-section">
              <h2 className="student-form-section-title"><FileText size={17}/>{t("Identity & Other Details")}</h2>
              <div className="legacy-demographics-grid student-identity-fields">          <Field label="Jan Aadhar Number" value={data.janAadhar} onChange={v => update("janAadhar", v)}/>
          <Field label="Scholar Number" value={data.scholarNumber} onChange={v => update("scholarNumber", v)}/>
          <Field label="SSSM Id Number" value={data.sssmId} onChange={v => update("sssmId", v)}/>
          <Field label="Religion" value={data.religion} onChange={v => update("religion", v)} options={["-- Select Religion --", "Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"]}/>
          <Field label="Category" value={data.category} onChange={v => update("category", v)} options={["OTHER", "General", "OBC", "SC", "ST", "EWS"]}/>
          <Field label="Caste" value={data.caste} onChange={v => update("caste", v)}/>
          <Field label="Blood Group" value={data.bloodGroup} onChange={v => update("bloodGroup", v)} options={["Blood Group", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]}/>
          <Field label="Disability" value={data.disability} onChange={v => update("disability", v)} options={["None selected", "None", "Visual impairment", "Hearing impairment", "Locomotor disability", "Other"]}/>
          <YesNo label="RTE Student" value={data.rteStudent} onChange={v => update("rteStudent", v)}/>
          <Field label="Nationality" value={data.nationality} onChange={v => update("nationality", v)}/>
          <Field label="Admitted Class" value={data.admittedClass} onChange={v => update("admittedClass", v)}/>
          <Field label="Annual Income" value={data.annualIncome} onChange={v => update("annualIncome", v)}/>
          <YesNo label="Is Only Child" value={data.onlyChild} onChange={v => update("onlyChild", v)}/>
          <Field label="P E N" value={data.pen} onChange={v => update("pen", v)}/>
          <Field label="APAAR Id Number" value={data.apaarId} onChange={v => update("apaarId", v)}/>
          <Field label="G R N" value={data.grn} onChange={v => update("grn", v)}/>
          <Field label="Saral Id" value={data.saralId} onChange={v => update("saralId", v)}/>
              </div>
            </section>
          </div>
        <aside className="legacy-student-photo">
          {photo ? <img src={photo} alt={t("Student preview")}/> : <div className="legacy-photo-placeholder"><UserCircle size={112} strokeWidth={1.1}/></div>}
          <label className={`photo-upload-button${photoSaving ? " photo-uploading" : ""}`} aria-disabled={photoSaving}><Camera size={15}/><span>{t(photoSaving ? "Saving photo…" : "Change Photo")}</span><input type="file" accept="image/*" disabled={photoSaving} aria-label={t("Change student photo")} onChange={handleStudentPhotoUpload}/></label>
          <button className="admission-info-link" onClick={() => { onSave?.(data, "all", photo); onOpenAdmission?.(); }}><ExternalLink size={14}/>{t(" Admission Information")}</button>
          <button className="download-docs-button" onClick={() => { const content = `Student summary\nName: ${shortName}\nClass: ${data.className}\nAcademic Year: ${data.academicYear}\nParent Phone: ${data.motherPhone}`; const url = URL.createObjectURL(new Blob([content], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = `${shortName.toLowerCase().replaceAll(" ", "-")}-demo-docs.txt`; a.click(); URL.revokeObjectURL(url); notify("Downloaded a sample summary, not official documents."); }}><CloudDownload size={15}/>{t(" DOWNLOAD DOCS")}</button>
        </aside>
        </section>
        <div className="legacy-demographic-footer student-demographic-footer"><span><b className="required-star">*</b>{t(" Required fields")}</span><button type="button" className="legacy-save" disabled={saving} onClick={() => save("all")}><Save size={15}/>{t(saving ? "Saving…" : "Save student details")}</button></div>
      
    </>
  );
}
