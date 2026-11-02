import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, AlertCircle, CheckCircle2, LoaderCircle, Save, UserPlus,
  Users, BadgeIndianRupee, Baby, Bus, Syringe, ClipboardList, FileText, X
} from "lucide-react";
import { apiGet, apiPost } from "../../../api.js";
import AdmitStudentIdentityForm from "./AdmitStudentIdentityForm.jsx";
import AdmitStudentParentTab from "./AdmitStudentParentTab.jsx";
import AdmitStudentFeesTab from "./AdmitStudentFeesTab.jsx";
import AdmitStudentDayCareTab from "./AdmitStudentDayCareTab.jsx";
import AdmitStudentTransportTab from "./AdmitStudentTransportTab.jsx";
import AdmitStudentImmunizationTab from "./AdmitStudentImmunizationTab.jsx";
import {
  currentAcademicYear, localDateString, suggestedEnrollmentNumber, compressStudentPhoto,
  buildFeeTemplateApplication, openAdmissionDocumentChecklist
} from "./admitStudentUtils.js";

const TABS = [
  { id: "parent", label: "Parent", Icon: Users },
  { id: "fees", label: "Fees", Icon: BadgeIndianRupee },
  { id: "dayCare", label: "Day Care", Icon: Baby },
  { id: "transport", label: "Transport", Icon: Bus },
  { id: "immunization", label: "Immunization Schedule", Icon: Syringe }
];

function initialStudent() {
  return {
    firstName: "", middleName: "", lastName: "",
    dob: "", gender: "Not Specified",
    academicYear: currentAcademicYear(), className: "", section: "",
    enrollmentDate: localDateString(), enrollmentNumber: "", rollNumber: "", house: "",
    lunchFromSchool: "No", aadhaarNumber: "", janAadhaarNumber: "",
    scholarNumber: "", sssmIdNumber: "", religion: "", category: "OTHER", caste: "",
    bloodGroup: "", disability: "None selected", rteStudent: "No", nationality: "Indian",
    admittedClass: "", annualIncome: "", isOnlyChild: "No", pen: "", apaarIdNumber: "",
    grn: "", saralId: ""
  };
}
function initialParent() {
  return {
    loginMethod: "Phone", email: "", password: "", relation: "Not Specified",
    motherFirst: "", motherMiddle: "", motherLast: "",
    fatherFirst: "", fatherMiddle: "", fatherLast: "",
    guardianFirst: "", guardianMiddle: "", guardianLast: "",
    phone: "", alternatePhone: "", alternatePhoneRelation: "Not Specified",
    dob: "", address: "", city: "", state: "Madhya Pradesh", zip: "", country: "India"
  };
}
function fullName(first, middle, last) {
  return [first, middle, last].map(value => String(value || "").trim()).filter(Boolean).join(" ");
}
function safeCallNotify(notify, message) {
  if (typeof notify === "function") notify(message);
}

export default function AdmitNewStudentPage({
  onBack, onOpenAdmission, onRefreshStudents, notify, t, students = []
}) {
  const [student, setStudent] = useState(initialStudent);
  const [parent, setParent] = useState(initialParent);
  const [fees, setFees] = useState({ templateId: "", applyTemplate: false, notes: "" });
  const [dayCare, setDayCare] = useState({ enabled: "No", startDate: "", dropOffTime: "", pickupTime: "", pickupPerson: "", pickupPhone: "", notes: "" });
  const [transport, setTransport] = useState({ enabled: "No", routeName: "", pickupStop: "", dropStop: "", vehicleNumber: "", startDate: "", journeyType: "Both Ways", notes: "" });
  const [immunizationSchedule, setImmunizationSchedule] = useState([]);
  const [photo, setPhoto] = useState("");
  const [activeTab, setActiveTab] = useState("parent");
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([currentAcademicYear()]);
  const [routes, setRoutes] = useState([]);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [lookupWarning, setLookupWarning] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const text = typeof t === "function" ? t : value => value;

  useEffect(() => {
    let active = true;
    async function loadLookups() {
      const results = await Promise.allSettled([
        apiGet("/bootstrap"),
        apiGet("/transport/routes"),
        apiGet("/module-data/manage-fee-templates"),
        apiGet("/module-data/manage-fee-types")
      ]);
      if (!active) return;
      const warnings = [];
      if (results[0].status === "fulfilled") {
        const data = results[0].value;
        const classRows = Array.isArray(data.classes) ? data.classes : [];
        setClasses(classRows);
        const years = Array.isArray(data.academicYears) ? data.academicYears.map(item => item.label).filter(Boolean) : [];
        const current = currentAcademicYear();
        setAcademicYears([...new Set([current, ...years])].sort((a, b) => b.localeCompare(a)));
        setStudent(previous => ({
          ...previous,
          academicYear: years.includes(current) ? current : previous.academicYear
        }));
      } else {
        warnings.push("Academic years and classes could not be loaded. Check that classes are configured.");
      }
      if (results[1].status === "fulfilled") {
        const routeRows = Array.isArray(results[1].value.routes) ? results[1].value.routes : [];
        setRoutes(routeRows);
      } else {
        warnings.push("Transport routes are unavailable right now.");
      }
      if (results[2].status === "fulfilled") {
        const rows = Array.isArray(results[2].value?.data?.items) ? results[2].value.data.items : [];
        setFeeTemplates(rows.map(item => ({
          ...item, id: String(item.id || ""), name: String(item.name || ""),
          academicYear: String(item.academicYear || ""),
          installments: Array.isArray(item.installments) ? item.installments : []
        })).filter(item => item.id && item.name));
      } else {
        warnings.push("Fee templates could not be loaded.");
      }
      if (results[3].status === "fulfilled") {
        const rows = Array.isArray(results[3].value?.data?.items) ? results[3].value.data.items : [];
        setFeeTypes(rows.filter(item => item.visible !== false));
      } else {
        warnings.push("Fee types could not be loaded, so fee template application may be unavailable.");
      }
      setLookupWarning(warnings.join(" "));
      setLoadingLookups(false);
    }
    void loadLookups();
    return () => { active = false; };
  }, []);

  const houseOptions = useMemo(() => [...new Set((students || [])
    .map(item => String(item.house || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)), [students]);

  function setStudentField(key, value) {
    setStudent(previous => ({ ...previous, [key]: value }));
    setPageError("");
  }
  function setParentField(key, value) {
    setParent(previous => ({ ...previous, [key]: value }));
    setPageError("");
  }
  function setFeeField(key, value) {
    setFees(previous => ({ ...previous, [key]: value }));
    setPageError("");
  }
  function setDayCareField(key, value) {
    setDayCare(previous => ({ ...previous, [key]: value }));
  }
  function setTransportField(key, value) {
    setTransport(previous => ({ ...previous, [key]: value }));
  }

  function generateEnrollmentNumber() {
    setStudentField("enrollmentNumber", suggestedEnrollmentNumber(student.academicYear));
  }

  async function handlePhotoChange(file) {
    if (!file) return;
    try {
      const compressed = await compressStudentPhoto(file);
      setPhoto(compressed);
      setPageError("");
    } catch (error) {
      setPageError(error.message || "The photo could not be processed.");
    }
  }

  function downloadDocs() {
    openAdmissionDocumentChecklist(student, message => setPageError(message));
  }

  function validateCustomRules() {
    if (student.academicYear && student.className && !classes.some(item =>
      String(item.class_name || item.className || item.name) === student.className)) {
      return "The selected class is not active. Refresh the page and choose an active class.";
    }
    if (parent.relation === "Not Specified") return "Please select the primary parent's relation.";
    const relationFirstName = parent.relation === "Mother" ? parent.motherFirst
      : parent.relation === "Father" ? parent.fatherFirst
      : parent.relation === "Guardian" ? parent.guardianFirst
      : [parent.motherFirst, parent.fatherFirst, parent.guardianFirst].find(value => String(value || "").trim());
    if (!String(relationFirstName || "").trim()) return "Enter the first name for the selected primary parent or guardian.";
    if (String(parent.phone || "").replace(/\D/g, "").length < 7) return "Enter a valid primary parent phone number.";
    if (String(parent.password || "").length < 6) return "Parent password must contain at least 6 characters.";
    if (parent.loginMethod === "Email" && !String(parent.email || "").trim()) return "Email is required when Login Method is Email.";
    if (parent.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email) && parent.loginMethod === "Email") return "Enter a valid parent email address.";
    if (fees.applyTemplate && !fees.templateId) return "Select a fee template or turn off Apply selected template.";
    return "";
  }

  async function saveStudent(goToAdmission) {
    if (saving) return;
    setPageError("");
    setPageNotice("");
    const form = document.getElementById("admit-new-student-form");
    if (form && !form.reportValidity()) return;
    const customValidation = validateCustomRules();
    if (customValidation) {
      setPageError(customValidation);
      if (customValidation.toLowerCase().includes("fee template")) setActiveTab("fees");
      else if (customValidation.toLowerCase().includes("parent")) setActiveTab("parent");
      return;
    }

    const template = feeTemplates.find(item => String(item.id) === String(fees.templateId));
    if (fees.applyTemplate) {
      const preview = buildFeeTemplateApplication(template, feeTypes, "pending-student-code", student.academicYear, fees.notes);
      if (preview.error) {
        setPageError(preview.error);
        setActiveTab("fees");
        return;
      }
    }

    const payload = {
      student: { ...student, photoDataUrl: photo },
      parent: { ...parent },
      fees: { ...fees, templateName: template?.name || "" },
      dayCare: { ...dayCare },
      transport: { ...transport },
      immunizationSchedule: immunizationSchedule
    };

    setSaving(true);
    try {
      const result = await apiPost("/students/admit", payload);
      const savedStudent = result.student;
      let feeApplicationWarning = "";
      if (fees.applyTemplate && template) {
        try {
          const application = buildFeeTemplateApplication(template, feeTypes, savedStudent.studentCode || savedStudent.id, student.academicYear, fees.notes);
          if (application.error) throw new Error(application.error);
          await apiPost("/fees/apply-template", application.payload);
        } catch (error) {
          feeApplicationWarning = " Student saved, but the fee template could not be applied: " + error.message;
        }
      }
      try { await onRefreshStudents?.(); } catch {}
      const message = "Student " + (savedStudent.name || fullName(student.firstName, student.middleName, student.lastName)) +
        " was saved successfully." +
        (result.parentAccountCreated ? " Parent portal account created." : result.parentAccountReused ? " Existing parent portal account was retained." : "") +
        feeApplicationWarning;
      if (goToAdmission && typeof onOpenAdmission === "function") {
        if (feeApplicationWarning) safeCallNotify(notify, message);
        onOpenAdmission(savedStudent);
        return;
      }
      safeCallNotify(notify, message);
      setPageNotice(message);
      if (!feeApplicationWarning) {
        onBack?.();
      }
    } catch (error) {
      setPageError("Student could not be saved: " + (error.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const activeTabContent = activeTab === "parent"
    ? <AdmitStudentParentTab parent={parent} setParentField={setParentField} />
    : activeTab === "fees"
      ? <AdmitStudentFeesTab fees={fees} setFeeField={setFeeField} templates={feeTemplates} />
      : activeTab === "dayCare"
        ? <AdmitStudentDayCareTab dayCare={dayCare} setDayCareField={setDayCareField} />
        : activeTab === "transport"
          ? <AdmitStudentTransportTab transport={transport} setTransportField={setTransportField} routes={routes} />
          : <AdmitStudentImmunizationTab entries={immunizationSchedule} setEntries={setImmunizationSchedule} />;

  return <section className="admit-new-student-page">
    <div className="admit-page-toolbar">
      <button type="button" className="admit-back-button" onClick={onBack}><ArrowLeft size={16} /> Back to Manage your Branch</button>
      <span className="admit-page-kicker">MY BRANCH · USERS</span>
    </div>
    <header className="admit-page-header">
      <div className="admit-page-icon"><UserPlus size={23} /></div>
      <div className="admit-page-heading-copy">
        <h2>Admit New Student</h2>
        <p>Enter student details, parent information, and optional school services.</p>
      </div>
      <div className="admit-page-header-actions">
        <button type="button" className="admit-secondary-button" onClick={downloadDocs}><FileText size={15} /> Download Docs</button>
      </div>
    </header>

    {(pageError || pageNotice || lookupWarning) && <div className={"admit-message " + (pageError ? "error" : pageNotice ? "success" : "info")} role="status">
      {pageError ? <AlertCircle size={17} /> : pageNotice ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      <span>{pageError || pageNotice || lookupWarning}</span>
      <button type="button" aria-label="Dismiss message" onClick={() => { setPageError(""); setPageNotice(""); setLookupWarning(""); }}><X size={15} /></button>
    </div>}

    <form id="admit-new-student-form" onSubmit={event => { event.preventDefault(); void saveStudent(false); }}>
      <AdmitStudentIdentityForm
        student={student}
        setField={setStudentField}
        classes={classes}
        academicYears={academicYears}
        houses={houseOptions}
        photo={photo}
        onPhotoChange={handlePhotoChange}
        onDownloadDocs={downloadDocs}
        onGenerateEnrollment={generateEnrollmentNumber}
      />

      <section className="admit-record-tabs-card">
        <div className="admit-record-tabs" role="tablist" aria-label="Student admission sections">
          {TABS.map(({ id, label, Icon }) => <button type="button" role="tab" key={id}
            aria-selected={activeTab === id} className={activeTab === id ? "active" : ""}
            onClick={() => setActiveTab(id)}><Icon size={15} />{text(label)}</button>)}
        </div>
        {loadingLookups && <div className="admit-lookups-note"><LoaderCircle size={15} className="admit-spin" /> Loading classes, routes and fee templates…</div>}
        <div className="admit-tab-content" role="tabpanel">{activeTabContent}</div>
      </section>

      <footer className="admit-form-footer">
        <div className="admit-form-footer-note"><span className="admit-required">*</span> Required fields</div>
        <div className="admit-form-footer-actions">
          <button type="button" className="admit-secondary-button" onClick={onBack}>Cancel</button>
          <button type="button" className="admit-primary-button" disabled={saving} onClick={() => void saveStudent(false)}>
            {saving ? <LoaderCircle size={16} className="admit-spin" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="admit-primary-button strong" disabled={saving} onClick={() => void saveStudent(true)}>
            {saving ? <LoaderCircle size={16} className="admit-spin" /> : <ClipboardList size={16} />}
            {saving ? "Saving…" : "Save & Go to Admission Form"}
          </button>
        </div>
      </footer>
    </form>
  </section>;
}
