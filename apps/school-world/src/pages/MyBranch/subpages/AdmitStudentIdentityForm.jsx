import React from "react";
import { useSchoolList, withCurrent } from "../../../useSchoolList.js";
import { Camera, CloudDownload, RefreshCw, UserRound } from "lucide-react";
import { AdmitField, AdmitNameFields, AdmitYesNo, AdmitSectionHeading } from "./AdmitStudentFields.jsx";

const GENDER_OPTIONS = ["Not Specified", "Male", "Female", "Other"];
const RELIGION_OPTIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DISABILITY_OPTIONS = ["None selected", "Visual Impairment", "Hearing Impairment", "Locomotor Disability", "Learning Disability", "Autism", "Multiple Disabilities", "Other"];

export default function AdmitStudentIdentityForm({
  student, setField, classes = [], academicYears = [], houses = [], photo, onPhotoChange,
  onDownloadDocs, onGenerateEnrollment
}) {
  const [categories] = useSchoolList("studentCategories");
  function chooseClass(value) {
    const picked = classes.find(item => String(item.class_name || item.className || item.name) === value);
    setField("className", value);
    setField("section", picked?.section || "");
  }

  return <section className="admit-student-details">
    <AdmitSectionHeading title="Student Details" description="Enter the student's personal, academic and identification details." />
    <div className="admit-student-profile-grid">
      <div className="admit-student-fields">
        <AdmitNameFields label="Name" value={{ first: student.firstName, middle: student.middleName, last: student.lastName }}
          required onChange={(key, value) => setField(key === "first" ? "firstName" : key === "middle" ? "middleName" : "lastName", value)} />
        <div className="admit-form-grid two">
          <AdmitField label="Date of Birth" type="date" value={student.dob} required onChange={value => setField("dob", value)} />
          <AdmitField label="Gender" value={student.gender} options={GENDER_OPTIONS} onChange={value => setField("gender", value)} />
          <AdmitField label="Academic Year" value={student.academicYear} required options={academicYears} onChange={value => setField("academicYear", value)} />
          <AdmitField label="Class" value={student.className} required options={classes.map(item => ({
            value: item.class_name || item.className || item.name,
            label: (item.class_name || item.className || item.name) + (item.section ? " (" + item.section + ")" : "")
          }))} onChange={chooseClass} />
          <AdmitField label="Enrollment Date" type="date" value={student.enrollmentDate} onChange={value => setField("enrollmentDate", value)} />
          <div className="admit-field">
            <span>Enrollment No.</span>
            <div className="admit-input-with-action">
              <input value={student.enrollmentNumber || ""} onChange={event => setField("enrollmentNumber", event.target.value)} placeholder="Enrollment Number" />
              <button type="button" title="Generate enrollment number" aria-label="Generate enrollment number" onClick={onGenerateEnrollment}><RefreshCw size={15} /></button>
            </div>
          </div>
          <AdmitField label="Roll Number" value={student.rollNumber} onChange={value => setField("rollNumber", value)} />
          {houses.length
            ? <AdmitField label="House" value={student.house} options={houses} onChange={value => setField("house", value)} />
            : <AdmitField label="House" value={student.house} onChange={value => setField("house", value)} placeholder="House name" />}
          <AdmitYesNo label="Lunch From School" value={student.lunchFromSchool} onChange={value => setField("lunchFromSchool", value)} />
          <AdmitField label="Aadhaar Number" value={student.aadhaarNumber} onChange={value => setField("aadhaarNumber", value)} />
          <AdmitField label="Jan Aadhaar Number" value={student.janAadhaarNumber} onChange={value => setField("janAadhaarNumber", value)} />
          <AdmitField label="Scholar Number" value={student.scholarNumber} onChange={value => setField("scholarNumber", value)} />
          <AdmitField label="SSSM ID Number" value={student.sssmIdNumber} onChange={value => setField("sssmIdNumber", value)} />
          <AdmitField label="Religion" value={student.religion} options={RELIGION_OPTIONS} onChange={value => setField("religion", value)} />
          <AdmitField label="Category" value={student.category || ""} options={categories.length ? withCurrent(categories, student.category) : null} hint={categories.length ? undefined : "This school has no student categories yet; type one, or add them under Campus desk → Categories."} onChange={value => setField("category", value)} />
          <AdmitField label="Caste" value={student.caste} onChange={value => setField("caste", value)} />
          <AdmitField label="Blood Group" value={student.bloodGroup} options={BLOOD_GROUP_OPTIONS} onChange={value => setField("bloodGroup", value)} />
          <AdmitField label="Disability" value={student.disability || "None selected"} options={DISABILITY_OPTIONS} onChange={value => setField("disability", value)} />
          <AdmitYesNo label="RTE Student" value={student.rteStudent} onChange={value => setField("rteStudent", value)} />
          <AdmitField label="Nationality" value={student.nationality || ""} onChange={value => setField("nationality", value)} />
          <AdmitField label="Admitted Class" value={student.admittedClass} onChange={value => setField("admittedClass", value)} />
          <AdmitField label="Annual Income" type="number" min="0" step="1" value={student.annualIncome} onChange={value => setField("annualIncome", value)} />
          <AdmitYesNo label="Is Only Child" value={student.isOnlyChild} onChange={value => setField("isOnlyChild", value)} />
          <AdmitField label="PEN" value={student.pen} onChange={value => setField("pen", value)} />
          <AdmitField label="APAAR ID Number" value={student.apaarIdNumber} onChange={value => setField("apaarIdNumber", value)} />
          <AdmitField label="GRN" value={student.grn} onChange={value => setField("grn", value)} />
          <AdmitField label="Saral ID" value={student.saralId} onChange={value => setField("saralId", value)} />
        </div>
      </div>
      <aside className="admit-student-photo-panel">
        <div className="admit-student-photo">
          {photo ? <img src={photo} alt="Student preview" /> : <UserRound size={66} strokeWidth={1.1} />}
        </div>
        <label className="admit-photo-upload"><Camera size={15} /> Upload Photo
          <input type="file" accept="image/*" onChange={event => { onPhotoChange(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        <button type="button" className="admit-download-docs" onClick={onDownloadDocs}><CloudDownload size={15} /> DOWNLOAD DOCS</button>
        <p>Use a clear passport-size photo.</p>
      </aside>
    </div>
  </section>;
}
