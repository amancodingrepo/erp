import React, { useEffect, useMemo, useState } from "react";
import { academicYearNow, academicYearOptions, currentAcademicYear } from "../../school-options.js";
import { t } from "../../i18n.jsx";
import { apiGet, apiPost } from "../../api.js";
import { LegacyHeader, LegacySidebar } from "../../LegacyShell.jsx";
import AdmissionFormSections from "./AdmissionFormSections.jsx";
import AdmissionDocumentsSection from "./AdmissionDocumentsSection.jsx";
import AdmissionFormActions from "./AdmissionFormActions.jsx";
import SavedAdmissionEnquiries from "./SavedAdmissionEnquiries.jsx";
import { Field } from "../Students/StudentFormFields.jsx";
import { ADMISSION_FIELD_GROUPS, createDefaultAdmissionForm, getFieldSetting } from "./admissionFormCatalog.js";
import { CheckCircle2 } from "lucide-react";

const currentYear = () => academicYearNow();

function readActiveAdmissionForm() {
  const config = window.SCHOOL_DIARY_CONFIG?.admissionFormBuilder || {};
  const forms = Array.isArray(config.forms) ? config.forms : [];
  let desiredId = "";
  try { desiredId = window.localStorage.getItem("schoolWorld.activeAdmissionFormId") || ""; } catch {}
  return forms.find(form => form.id === desiredId && form.status !== "Closed")
    || forms.find(form => form.status !== "Closed")
    || createDefaultAdmissionForm(config.academicYear || currentAcademicYear() || currentYear());
}

function selectedVisibleSections(form, formType) {
  return (form?.fields || []).map(selection => {
    const group = ADMISSION_FIELD_GROUPS.find(item => item.id === selection.groupId);
    if (!group) return null;
    const visibleFields = group.fields.filter(field => getFieldSetting(form, group.id, field.id, formType) !== "Not Required");
    if (group.kind === "photo") return { id: group.id, label: group.label, kind: group.kind };
    if (!visibleFields.length) return null;
    return { id: group.id, label: group.label, kind: group.kind };
  }).filter(Boolean);
}

export function AdmissionFormPage({ student, onBack, onNotify, onOpenModule, activeModule = "Admission/Enquiry Form", savedDetails, classOptions = [] }) {
  const [formDefinition] = useState(() => readActiveAdmissionForm());
  const [termsAndConditions] = useState(() => String(window.SCHOOL_DIARY_CONFIG?.admissionFormBuilder?.termsAndConditions || ""));
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [section, setSection] = useState(() => formDefinition.fields?.[0]?.groupId || "photo");
  const [vals, setVals] = useState(() => ({
    academicYear: formDefinition.academicYear || savedDetails?.academicYear || student.academicYear || currentYear(),
    formNumber: "",
    enquiryDate: new Date().toISOString().slice(0, 10),
    enquiryStatus: "Cold Enquiry",
    firstName: savedDetails?.firstName || (student.name || "").split(" ")[0] || "",
    middleName: savedDetails?.middleName || "",
    lastName: savedDetails?.lastName || (student.name || "").split(" ").slice(1).join(" "),
    gender: savedDetails?.gender || student.gender || "",
    dob: savedDetails?.dob || student.dob || "",
    mobile: savedDetails?.motherPhone || student.phone || "",
    alternateMobile: "",
    email: savedDetails?.email || student.email || "",
    emergency: "",
    fatherName: [savedDetails?.fatherFirst, savedDetails?.fatherMiddle, savedDetails?.fatherLast].filter(Boolean).join(" ") || student.father || "",
    motherName: [savedDetails?.motherFirst, savedDetails?.motherMiddle, savedDetails?.motherLast].filter(Boolean).join(" ") || student.parent || "",
    className: savedDetails?.className || student.className || "",
    previousSchool: "",
    aadhar: "",
    sssmId: "",
    nationality: savedDetails?.nationality || student.nationality || "",
    religion: savedDetails?.religion || "",
    caste: savedDetails?.caste || "",
    bloodGroup: savedDetails?.bloodGroup || student.bloodGroup || "",
    permanentAddress: savedDetails?.address || student.address || "",
    permanentPin: savedDetails?.zip || student.pinCode || "",
    currentAddress: savedDetails?.address || student.address || "",
    currentPin: savedDetails?.zip || student.pinCode || "",
    state: savedDetails?.state || student.state || "Madhya Pradesh",
    city: savedDetails?.city || student.city || "",
    country: "India",
    achievements: ""
  }));
  const [photo, setPhoto] = useState("");
  const [documents, setDocuments] = useState([]);
  const [localToast, setLocalToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [showAdmissions, setShowAdmissions] = useState(false);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);
  const change = (key, value) => setVals(previous => ({ ...previous, [key]: value }));
  const formType = vals.enquiryStatus === "Admitted" ? "admission" : "enquiry";
  const visibleSections = useMemo(() => selectedVisibleSections(formDefinition, formType), [formDefinition, formType]);
  const notify = message => { onNotify?.(message); setLocalToast(t(message)); window.setTimeout(() => setLocalToast(""), 3200); };

  useEffect(() => {
    if (!visibleSections.some(item => item.id === section)) setSection(visibleSections[0]?.id || "name");
  }, [visibleSections, section]);

  const submitAdmission = async () => {
    if (submitting) return;
    const alwaysNeeded = [];
    if (!String(vals.firstName || "").trim()) alwaysNeeded.push("First name");
    if (!String(vals.mobile || "").trim()) alwaysNeeded.push("Primary contact number");
    if (!String(vals.academicYear || "").trim()) alwaysNeeded.push("Academic year");
    if (alwaysNeeded.length) {
      notify(`Please fill the required information: ${alwaysNeeded.join(", ")}.`);
      return;
    }
    if (termsAndConditions.trim() && !termsAccepted) {
      notify("Please accept the admission form terms and conditions before saving.");
      return;
    }

    const missing = [];
    for (const selectedGroup of formDefinition.fields || []) {
      const group = ADMISSION_FIELD_GROUPS.find(item => item.id === selectedGroup.groupId);
      if (!group) continue;
      for (const field of group.fields) {
        if (getFieldSetting(formDefinition, group.id, field.id, formType) !== "Required" || field.type === "computed") continue;
        const value = field.id === "documents" ? documents.length : vals[field.id];
        if (value === undefined || value === null || !String(value).trim()) missing.push(field.label);
      }
    }
    if (missing.length) {
      notify(`Please complete required fields: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", and others" : ""}.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost("/admissions", {
        ...vals,
        studentName: [vals.firstName, vals.middleName, vals.lastName].filter(Boolean).join(" ").trim(),
        primaryContact: vals.mobile,
        classApplied: vals.className,
        photoDataUrl: photo || null,
        selectedDocumentNames: documents,
        formTemplateId: formDefinition.id,
        formTemplateName: formDefinition.name,
        formType,
        termsAndConditions,
        acceptedTerms: termsAccepted
      });
      setVals(previous => ({ ...previous, formNumber: result.admission.formNumber }));
      setAdmissions(previous => [result.admission, ...previous.filter(item => item.formNumber !== result.admission.formNumber)]);
      notify(`Admission enquiry ${result.admission.formNumber} saved to the school database. Selected document names are recorded; file contents are not uploaded.`);
    } catch (error) {
      notify(`Admission enquiry was not saved: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const loadAdmissions = async () => {
    setLoadingAdmissions(true);
    try {
      const result = await apiGet("/admissions");
      setAdmissions(Array.isArray(result.admissions) ? result.admissions : []);
      setShowAdmissions(true);
    } catch (error) {
      notify(`Saved enquiries could not be loaded: ${error.message}`);
    } finally {
      setLoadingAdmissions(false);
    }
  };

  const jumpTo = id => {
    setSection(id);
    document.getElementById(`admission-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const row = (label, key, type = "text", options = null, note = "", requirement = "Optional") => (
    <Field
      key={key}
      label={label}
      value={vals[key] ?? ""}
      onChange={value => change(key, value)}
      type={type}
      options={options}
      note={note}
      required={requirement === "Required"}
    />
  );

  const uploadPhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file for the student photo.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => notify("The selected photo could not be read.");
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => notify("The selected photo could not be opened.");
      image.onload = () => {
        const maxDimension = 480;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) { notify("The browser could not process this photo."); return; }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.8));
        event.target.value = "";
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const hasDocumentsGroup = visibleSections.some(item => item.id === "documents");
  return <div className="legacy-app admission-app">
    <LegacyHeader />
    <LegacySidebar onBack={onBack} onNotify={notify} onModuleSelect={onOpenModule} onOpenAdmission={onOpenModule ? () => onOpenModule("Admission/Enquiry Form") : undefined} activeModule={activeModule} admission />
    <main className="admission-main">
      <div className="admission-top-fields">
        <Field label="Academic Year" value={vals.academicYear} onChange={value => change("academicYear", value)} options={academicYearOptions(vals.academicYear, formDefinition.academicYear, currentYear())} required />
        <Field label="Form Number" value={vals.formNumber} onChange={value => change("formNumber", value)} />
        <Field label="Enquiry Date" value={vals.enquiryDate} onChange={value => change("enquiryDate", value)} type="date" />
        <Field label="Enquiry Status" value={vals.enquiryStatus} onChange={value => change("enquiryStatus", value)} options={["Cold Enquiry", "Warm Enquiry", "Hot Enquiry", "Admitted", "Not Interested"]} />
      </div>
      <div className="admission-layout">
        <aside className="admission-section-nav">
          {visibleSections.map(item => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => jumpTo(item.id)}>{t(item.label)}</button>)}
        </aside>
        <div className="admission-form-content">
          <AdmissionFormSections context={{ row, vals, photo, uploadPhoto, classOptions, formDefinition, formType, change }} />
          {hasDocumentsGroup && <AdmissionDocumentsSection context={{ documents, setDocuments }} />}
          {termsAndConditions.trim() && <section className="admission-card admission-terms-card" id="admission-terms">
            <h2>{t("Terms & Conditions")}</h2>
            <div className="admission-terms-text">{termsAndConditions}</div>
            <label className="admission-terms-accept"><input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} /> <span>{t("I have read and agree to the terms and conditions above.")}</span></label>
          </section>}
          <AdmissionFormActions context={{ t, submitAdmission, submitting, notify, loadAdmissions, loadingAdmissions, onBack }} />
          <SavedAdmissionEnquiries context={{ showAdmissions, admissions }} />
        </div>
      </div>
      {localToast && <div className="legacy-local-toast"><CheckCircle2 size={17}/>{localToast}</div>}
    </main>
  </div>;
}
