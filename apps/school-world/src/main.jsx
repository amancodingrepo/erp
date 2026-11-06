import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen, Bell, Settings, UserCircle, Home, MessageCircle, CalendarDays,
  Building2, Users, Wallet, Star, ChartNoAxesColumn, Search, ChevronDown,
  ChevronLeft, ChevronRight, Pencil, UserPlus, KeyRound, Flag, DownloadCloud,
  Ban, CreditCard, UsersRound, FileText, Phone, Mail, Clock, SlidersHorizontal,
  Truck, ClipboardList, Package, Store, UploadCloud, FileSpreadsheet,
  X, CheckCircle2, AlertTriangle, ArrowUpDown, LayoutGrid, Table2
} from "lucide-react";
import "./styles.css";
import SchoolWorldLoadingSkeleton from "./shared/SchoolWorldLoadingSkeleton.jsx";
import { SidebarModulePage } from "./app/SidebarModulePage.jsx";
import { StudentEditPage } from "./pages/Students/StudentEditPage.jsx";
import { AdmissionFormPage } from "./pages/Admissions/AdmissionFormPage.jsx";
import ManageStudentsPage from "./pages/Students/ManageStudentsPage.jsx";
import { useSchoolName } from "./school-config.js";
import { LanguageProvider, LanguageToggle, t, useLanguage } from "./i18n.jsx";
import { apiGet, apiPost, apiPatch, apiPut } from "./api.js";
import { useDatabaseSession, DatabaseSessionProvider } from "./DatabaseSession.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SuperAdminPage from "./pages/SuperAdmin/SuperAdminPage.jsx";
import ChangePasswordPage from "./pages/Auth/ChangePasswordPage.jsx";
import NoticeRecipientPortal from "./pages/NoticeBoard/NoticeRecipientPortal.jsx";
import AppThemeControl from "./AppThemeControl.jsx";
import { DialogProvider } from "./components/dialogs/DialogProvider.jsx";

import { parseCsvRows, downloadCsvFile } from "./shared/csvUtils.js";
import { getNavigationHref, getModuleNavigationTarget, readUrlNavigation } from "./navigation.js";
import { currentAcademicYear, optionsFromBootstrap } from "./school-options.js";
import { clearLegacyStorage, readStoredNavigation, saveStoredNavigation } from "./browser-storage.js";
import { downloadBulkStudentExcelTemplate, parseBulkStudentWorkbook, validateBulkStudentRows, buildBulkStudentImportPayload } from "./pages/Students/bulkStudentImport.js";


function parseCsvText(text) {
  const nonempty = parseCsvRows(text);
  if (nonempty.length < 2) throw new Error("The CSV needs a header row and at least one student row.");
  const key = value => String(value||"").replace(/^\\uFEFF/,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const headers=nonempty[0].map(key);
  const aliases={
    studentId:['studentid','studentcode','id','admissionid'], name:['studentname','name','fullname'], className:['class','classname','grade'], section:['section'], academicYear:['academicyear','year'], status:['status','studentstatus'],
    father:['fathername','father'], parent:['parentname','parent','guardianname','parentguardianname'], motherName:['mothername','mother'], phone:['parentphone','phone','contactnumber','mobile','mobilenumber','phonenumber'], alternatePhone:['alternatephone','alternatecontactnumber'], email:['email','emailaddress'],
    dob:['dob','dateofbirth','birthdate'], gender:['gender'], address:['address','permanentaddress'], city:['city'], state:['state'], pinCode:['pincode','pin','postalcode'], enrollmentDate:['enrollmentdate','enrolleddate'], enrollmentNumber:['enrollmentnumber','admissionnumber','enrollmentno'], rollNumber:['rollnumber','rollno'], originalClass:['originalclass'], house:['house'], bloodGroup:['bloodgroup'], category:['category'], nationality:['nationality'], lastSeen:['lastseen'], enrolled:['enrolled'], primaryParentName:['primaryparentname'], primaryParent:['primaryparent'],
    defaulter:['feedefaulter','defaulter'], childId:['childidactive','childid'], parentId:['parentidactive','parentid'], rfid:['rfidmapped','rfid'], rfidNumber:['rfidnumber','rfidcardnumber'], routeName:['routename','route','busroute','busnumber'], siblings:['siblingids','siblings'], photoDataUrl:['photodataurl']
  };
  const headerIndex = {};
  for (const [field,names] of Object.entries(aliases)) { const idx=headers.findIndex(h=>names.includes(h)); if(idx>=0) headerIndex[field]=idx; }
  if (headerIndex.studentId===undefined || headerIndex.name===undefined) throw new Error('CSV headers must include StudentID and StudentName (or ID and Name).');
  return nonempty.slice(1).map(values=>{
    const out={};
    for(const [field,idx] of Object.entries(headerIndex)) out[field]=String(values[idx]??'').trim();
    return out;
  }).filter(row=>row.studentId && row.name);
}
function downloadStudentCsvTemplate() {
  const headers=['StudentID','StudentName','Class','Section','AcademicYear','Status','FatherName','ParentName','MotherName','ParentPhone','AlternatePhone','Email','DateOfBirth','Gender','Address','City','State','PINCode','EnrollmentDate','EnrollmentNumber','RollNumber','OriginalClass','House','BloodGroup','Category','Nationality','RouteName','FeeDefaulter','ChildIDActive','ParentIDActive','RFIDMapped','RFIDNumber','SiblingIDs'];
  const example=['STU1001','Aarav Sharma','CLASS 1 A','A',currentAcademicYear()||'2026-2027','Active','Rajesh Sharma','Rajesh Sharma','Neha Sharma','9876500001','','parent@example.com','2018-04-21','Male','Sample Street','Indore','Madhya Pradesh','452001','2026-04-10','ADM1001','1','I','Red','O+','GENERAL','Indian','Route 01','No','Yes','Yes','No','',''];
  downloadCsvFile("school-diary-student-import-template.csv", [headers, example]);
}

function readSavedNavigation(user) {
  // A copied URL or Ctrl/Cmd-click destination should take precedence over
  // the last page this person visited (browser-storage.js).
  return readUrlNavigation() || readStoredNavigation(user);
}

function syncNavigationUrl(target) {
  try {
    const nextUrl = getNavigationHref(target);
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl === currentUrl) return;
    // Each meaningful in-app page visit gets its own browser-history entry.
    window.history.pushState({ schoolWorldNavigation: target }, "", nextUrl);
  } catch (error) {
    console.warn("Could not update the current navigation URL.", error);
  }
}

const actions = [
  { key: "edit", label: "Edit", Icon: Pencil },
  { key: "sibling", label: "Add Sibling", Icon: UserPlus },
  { key: "reset", label: "Reset Password", Icon: KeyRound },
  { key: "defaulter", label: "Set as defaulter", Icon: Flag, danger: true },
  { key: "docs", label: "Download Docs", Icon: DownloadCloud },
  { key: "child", label: "Deactivate Child-ID", Icon: Ban, danger: true },
  { key: "rfid", label: "Map RFID Card", Icon: CreditCard },
  { key: "siblings", label: "Map Siblings", Icon: UsersRound },
  { key: "fees", label: "Fee Details", Icon: FileText },
  { key: "parent", label: "Deactivate Parent-ID", Icon: Ban, danger: true }
];

function SchoolDiaryApp({ user, onLogout }) {
  const schoolName = useSchoolName();
  const { language } = useLanguage(); // Re-render all pages when the global language changes.
  const [design, setDesign] = useState("cards");
  // Students and their details come only from this school's database (see clearLegacyStorage).
  const [students, setStudents] = useState(() => {
    clearLegacyStorage();
    return [];
  });
  const [dbReady, setDbReady] = useState(false);
  const [dbLoadError, setDbLoadError] = useState("");
  const csvInputRef = useRef(null);
  const [importBusy, setImportBusy] = useState(false);
  const excelInputRef = useRef(null);
  const [excelImportBusy, setExcelImportBusy] = useState(false);
  const [excelImportErrors, setExcelImportErrors] = useState([]);
  const [excelImportSummary, setExcelImportSummary] = useState("");
  const [activeTab, setActiveTab] = useState("Active");
  const [classFilter, setClassFilter] = useState("All classes");
  const [yearFilter, setYearFilter] = useState("-- All --");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modal, setModal] = useState(null);
  const [feeDetailRecords, setFeeDetailRecords] = useState([]);
  const [feeDetailsLoading, setFeeDetailsLoading] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
  }, []);
  const [form, setForm] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const saved = readSavedNavigation(user);
    return ["module", "manage", "edit", "admission"].includes(saved?.currentView) ? saved.currentView : "module";
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeSidebarModule, setActiveSidebarModule] = useState(() => readSavedNavigation(user)?.activeSidebarModule || "Dashboard");
  const [navigationRestored, setNavigationRestored] = useState(false);
  const [feesDueThroughTodayOnOpen, setFeesDueThroughTodayOnOpen] = useState(() => Boolean(readSavedNavigation(user)?.dueThroughToday));
  const [moduleReturnView, setModuleReturnView] = useState("notice-landing");
  const [moduleParentView, setModuleParentView] = useState(() => readSavedNavigation(user)?.moduleParentView || null);
  const [admissionReturnView, setAdmissionReturnView] = useState("edit");
  const [admissionReturnModule, setAdmissionReturnModule] = useState("My Branch");
  const [editReturnModule, setEditReturnModule] = useState(() => readSavedNavigation(user)?.activeSidebarModule || "My Branch");
  const initialBrowserLocation = useRef(null);
  if (initialBrowserLocation.current === null) {
    initialBrowserLocation.current = {
      currentView,
      activeSidebarModule,
      moduleParentView,
      dueThroughToday: feesDueThroughTodayOnOpen
    };
  }
  const [detailsById, setDetailsById] = useState({});

  const availableClasses = useMemo(
    () => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [students]
  );
  const availableYears = useMemo(
    () => Array.from(new Set(students.map(s => s.academicYear).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [students]
  );


  useEffect(() => {
    if (!dbReady) return undefined;

    function restoreLocationFromBrowserHistory() {
      const route = readUrlNavigation();
      if (!route) {
        // Returning to the URL the app was first opened with (often without
        // query parameters) restores the initial view instead of a blank page.
        const initial = initialBrowserLocation.current || {};
        setCurrentView(initial.currentView || "module");
        setActiveSidebarModule(initial.activeSidebarModule || "Dashboard");
        setModuleParentView(initial.moduleParentView || null);
        setFeesDueThroughTodayOnOpen(Boolean(initial.dueThroughToday));
        setEditingStudent(null);
        return;
      }

      setCurrentView(route.currentView);
      setActiveSidebarModule(route.activeSidebarModule || "Dashboard");
      setModuleParentView(route.moduleParentView || null);
      setFeesDueThroughTodayOnOpen(Boolean(route.dueThroughToday));

      if (route.currentView === "edit" && route.editingStudentId != null) {
        const targetStudent = students.find(student => String(student.id) === String(route.editingStudentId));
        if (targetStudent) {
          setEditingStudent({ ...targetStudent, _initialTab: "Student Details" });
          setEditReturnModule(route.activeSidebarModule || "My Branch");
        } else {
          setEditingStudent(null);
          setCurrentView("manage");
          setActiveSidebarModule("My Branch");
        }
      } else if (route.currentView === "manage") {
        setEditingStudent(null);
      } else if (route.currentView === "module") {
        setEditingStudent(null);
      } else if (route.currentView === "admission" && route.editingStudentId != null) {
        const targetStudent = students.find(student => String(student.id) === String(route.editingStudentId));
        if (targetStudent) setEditingStudent(targetStudent);
      }
    }

    window.addEventListener("popstate", restoreLocationFromBrowserHistory);
    return () => window.removeEventListener("popstate", restoreLocationFromBrowserHistory);
  }, [dbReady, students]);

  useEffect(() => {
    if (!dbReady || navigationRestored) return;
    const saved = readSavedNavigation(user);
    if (saved?.fromUrl) {
      if (saved.currentView === "edit" && saved.editingStudentId != null) {
        const targetStudent = students.find(student => String(student.id) === String(saved.editingStudentId));
        if (targetStudent) setEditingStudent(targetStudent);
        else { setCurrentView("manage"); setActiveSidebarModule("My Branch"); }
      } else if (saved.currentView === "admission" && !editingStudent && students.length) {
        setEditingStudent(students[0]);
      } else if (saved.currentView === "manage") {
        setEditingStudent(null);
      }
      setNavigationRestored(true);
      return;
    }
    if (saved) {
      const savedStudent = saved.editingStudentId == null ? null : students.find(student => String(student.id) === String(saved.editingStudentId));
      if ((saved.currentView === "edit" || saved.currentView === "admission") && savedStudent) setEditingStudent(savedStudent);
      else if (saved.currentView === "edit" || saved.currentView === "admission") { setCurrentView("module"); setActiveSidebarModule("Dashboard"); }
      if (saved.activeTab) setActiveTab(saved.activeTab);
      if (saved.classFilter) setClassFilter(saved.classFilter);
      if (saved.yearFilter) setYearFilter(saved.yearFilter);
      if (typeof saved.query === "string") setQuery(saved.query);
      if (saved.currentView === "manage") setEditingStudent(null);
    }
    setNavigationRestored(true);
  }, [dbReady, navigationRestored, students]);

  useEffect(() => {
    if (!dbReady || !navigationRestored) return;
    const saved = { currentView, activeSidebarModule, editingStudentId: editingStudent?.id ?? null, activeTab, classFilter, yearFilter, query };
    saveStoredNavigation(user, saved);
  }, [dbReady, navigationRestored, currentView, activeSidebarModule, editingStudent?.id, activeTab, classFilter, yearFilter, query, user?.id, user?.school?.id]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateFromDatabase() {
      setDbReady(false); setDbLoadError("");
      // Switching campus must not keep showing the previous campus's students while the new ones load.
      setStudents([]); setDetailsById({});
      try {
        const studentResult = await apiGet("/students");
        if (cancelled) return;
        setStudents(Array.isArray(studentResult.students) ? studentResult.students : []);
        const [detailResult, bootstrap] = await Promise.all([
          apiGet("/student-details").catch(() => null),
          apiGet("/bootstrap").catch(() => null),
        ]);
        if (cancelled) return;
        if (detailResult?.detailsById && typeof detailResult.detailsById === "object") setDetailsById(detailResult.detailsById);
        else setToast(t("Student details (parents, transport, fees and more) could not be loaded. Reload the page to try again."));
        if (bootstrap?.school) {
          window.SCHOOL_DIARY_CONFIG = { ...(window.SCHOOL_DIARY_CONFIG || {}), ...bootstrap.school.config, schoolId: bootstrap.school.id, schoolCode: bootstrap.school.code, schoolName: bootstrap.school.name, ...optionsFromBootstrap(bootstrap) };
          window.dispatchEvent(new Event("schooldiary:tenant-updated"));
        }
      } catch (error) {
        if (!cancelled) setDbLoadError(error.message || "Could not load school records from the database.");
      } finally { if (!cancelled) setDbReady(true); }
    }
    hydrateFromDatabase();
    return () => { cancelled = true; };
  }, [user?.school?.id]);

  useEffect(() => {
    if (modal?.key !== "fees" || !modal?.student?.id) { setFeeDetailRecords([]); setFeeDetailsLoading(false); return; }
    let cancelled=false; setFeeDetailsLoading(true);
    apiGet(`/fees?studentCode=${encodeURIComponent(modal.student.id)}`).then(result=>{if(!cancelled)setFeeDetailRecords(result.fees||[]);})
      .catch(error=>{if(!cancelled)notify(`Fee details could not be loaded: ${error.message}`);})
      .finally(()=>{if(!cancelled)setFeeDetailsLoading(false);});
    return ()=>{cancelled=true;};
  }, [modal?.key, modal?.student?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(s => {
      const statusMatch = activeTab === "All" || (activeTab === "Defaulters" ? Boolean(s.defaulter) : s.status === activeTab);
      const classMatch = classFilter === "All classes" || s.className === classFilter;
      const yearMatch = yearFilter === "-- All --" || s.academicYear === yearFilter;
      const queryMatch = !q || [s.name, s.father, s.parent, s.phone, s.className].some(v => v.toLowerCase().includes(q));
      return statusMatch && classMatch && yearMatch && queryMatch;
    }).sort((a,b) => sortBy === "name" ? a.name.localeCompare(b.name) : a.enrolled.localeCompare(b.enrolled));
  }, [students, activeTab, classFilter, yearFilter, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function notify(message, options = {}) {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(t(message));
    if (!options?.persistent) {
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast("");
        toastTimeoutRef.current = null;
      }, 3200);
    }
  }
  function clearToast() {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast("");
  }
  async function handleStudentCsvImport(event) {
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file) return;
    if(!/\.csv$/i.test(file.name) && !file.type.includes('csv') && !file.type.includes('text')) { notify("Please save the student spreadsheet as CSV UTF-8 first."); return; }
    setImportBusy(true);
    try {
      const rows=parseCsvText(await file.text());
      if(!rows.length) throw new Error("No valid student rows found. Check StudentID and StudentName columns.");
      const result=await apiPost("/students/import",{students:rows});
      const refreshed=await apiGet("/students");
      setStudents(Array.isArray(refreshed.students)?refreshed.students:[]);
      setClassFilter("All classes"); setYearFilter("-- All --"); setQuery(""); setActiveTab("All"); setPage(1);
      notify(`Student import complete: ${result.created} created, ${result.updated} updated.`);
    } catch(error) { notify(`Student import failed: ${error.message}`); }
    finally { setImportBusy(false); }
  }
  async function handleStudentExcelImport(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    setExcelImportErrors([]);
    setExcelImportSummary("");
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setExcelImportErrors([{ rowNumber: 0, fields: ["Please choose an Excel workbook (.xlsx or .xls)."] }]);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setExcelImportErrors([{ rowNumber: 0, fields: ["The Excel file is larger than 10 MB. Split it into smaller files and try again."] }]);
      return;
    }

    setExcelImportBusy(true);
    try {
      const parsed = parseBulkStudentWorkbook(await file.arrayBuffer());
      if (parsed.fileErrors.length) {
        setExcelImportErrors([{ rowNumber: 0, fields: parsed.fileErrors }]);
        return;
      }
      const validationIssues = validateBulkStudentRows(parsed.rows);
      if (validationIssues.length) {
        setExcelImportErrors(validationIssues);
        return;
      }
      const built = buildBulkStudentImportPayload(parsed.rows);
      if (built.issues.length) {
        setExcelImportErrors(built.issues);
        return;
      }

      const result = await apiPost("/students/bulk-import", { students: built.payloads });
      const refreshed = await apiGet("/students");
      const detailResult = await apiGet("/student-details").catch(() => null);
      setStudents(Array.isArray(refreshed.students) ? refreshed.students : []);
      if (detailResult?.detailsById && typeof detailResult.detailsById === "object") setDetailsById(detailResult.detailsById);
      setClassFilter("All classes");
      setYearFilter("-- All --");
      setQuery("");
      setActiveTab("All");
      setPage(1);
      setExcelImportSummary(
        "Bulk upload completed: " + result.created + " student(s) created, " +
        result.updated + " updated, " + (result.parentAccountsCreated || 0) + " parent portal account(s) created. " +
        "All rows passed required-field validation."
      );
      notify("Excel bulk upload completed successfully.");
    } catch (error) {
      setExcelImportErrors([{ rowNumber: 0, fields: [error?.message || "Excel upload failed. No students were imported. Please check the workbook and try again."] }]);
    } finally {
      setExcelImportBusy(false);
    }
  }

  function openAction(key, student) {
    if (key === "edit") {
      setEditingStudent(student);
      setEditReturnModule("My Branch");
      setActiveSidebarModule("My Branch");
      setCurrentView("edit");
      syncNavigationUrl({ view: "edit", studentId: student.id, parent: "My Branch" });
      setModal(null);
      return;
    }
    setForm({ ...student });
    setModal({ key, student });
  }
  async function updateStudent(id, changes) {
    const previous = students.find(s => String(s.id) === String(id));
    setStudents(prev => prev.map(s => String(s.id) === String(id) ? { ...s, ...changes } : s));
    try {
      const result = await apiPatch(`/students/${encodeURIComponent(id)}`, changes);
      if (result?.student) setStudents(prev => prev.map(s => String(s.id) === String(id) ? result.student : s));
      return result?.student;
    } catch (error) {
      if (previous) setStudents(prev => prev.map(s => String(s.id) === String(id) ? previous : s));
      notify(`Database save failed: ${error.message}`);
      return null;
    }
  }
  async function submitModal() {
    if (!modal) return;
    const { key, student } = modal;
    if (key === "edit") {
      if (!form.name?.trim() || !form.phone?.trim()) { notify("Student name and phone are required."); return; }
      const saved = await updateStudent(student.id, { name: form.name.trim().toUpperCase(), father: form.father || "", parent: form.parent || "", phone: form.phone, className: form.className || student.className });
      if (!saved) return;
      notify("Student record updated in the school database.");
    } else if (key === "defaulter") {
      const saved = await updateStudent(student.id, { defaulter: !student.defaulter });
      if (!saved) return;
      // Drive the counter and directory from the server-confirmed record, and
      // immediately show the list that corresponds to the action just taken.
      const isDefaulter = Boolean(saved.defaulter);
      setActiveTab(isDefaulter ? "Defaulters" : "All");
      setPage(1);
      notify(isDefaulter ? "Student marked as a fee defaulter and added to the Defaulters list." : "Student removed from the Defaulters list.");
    } else if (key === "child") {
      const currentStudent = students.find(s => String(s.id) === String(student.id)) || student;
      const willDeactivate = currentStudent.status !== "Inactive";
      const nextStatus = willDeactivate ? "Inactive" : "Active";
      const saved = await updateStudent(currentStudent.id, { childId: !willDeactivate, status: nextStatus });
      if (!saved) return;
      // Use the returned database status rather than the requested status so the
      // Active/Inactive card and list always mirror the saved student row.
      const savedStatus = saved.status === "Inactive" ? "Inactive" : "Active";
      setActiveTab(savedStatus);
      setPage(1);
      notify(savedStatus === "Inactive" ? "Child ID deactivated; student moved to Inactive and removed from Active." : "Child ID reactivated; student moved to Active.");
    } else if (key === "parent") {
      const saved = await updateStudent(student.id, { parentId: !student.parentId });
      if (!saved) return;
      notify(student.parentId ? "Parent ID deactivated." : "Parent ID reactivated.");
    } else if (key === "rfid") {
      if (!form.rfidNumber?.trim()) { notify("Enter an RFID card number to continue."); return; }
      const saved = await updateStudent(student.id, { rfid: true, rfidNumber: form.rfidNumber.trim() });
      if (!saved) return;
      notify("RFID card mapping saved.");
    } else if (key === "sibling") {
      if (!form.siblingName?.trim()) { notify("Enter the sibling's name."); return; }
      const saved = await updateStudent(student.id, { siblings: [...(student.siblings || []), form.siblingName.trim()] });
      if (!saved) return;
      notify("Sibling name saved; it is not linked to another student record.");
    } else if (key === "siblings") {
      const saved = await updateStudent(student.id, { siblings: form.siblingsText ? form.siblingsText.split(",").map(x => x.trim()).filter(Boolean) : (student.siblings || []) });
      if (!saved) return;
      notify("Sibling names saved; they are not validated links to student records.");
    } else if (key === "reset") {
      try {
        const result = await apiPost(`/students/${encodeURIComponent(student.id)}/reset-password`, {});
        notify(`Temporary password: ${result.temporaryPassword}. Share it securely; the user must change it at next sign-in.`);
      } catch (error) { notify(`Password reset failed: ${error.message}`); return; }
    } else if (key === "docs") {
      const text = `School World student summary\\nName: ${student.name}\\nClass: ${student.className}\\nParent: ${student.parent}\\nPhone: ${student.phone}\\nEnrollment: ${student.enrolled}`;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${student.name.toLowerCase().replaceAll(" ", "-")}-student-summary.txt`; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Downloaded a student summary. This is not an official school document.");
    } else if (key === "fees") {
      setModal({ key: "fees", student }); return;
    }
    setModal(null);
  }

  function actionLabel(action, student) {
    if (action.key === "defaulter" && student.defaulter) return "Remove defaulter";
    if (action.key === "child" && student.status === "Inactive") return "Reactivate Child-ID";
    if (action.key === "parent" && !student.parentId) return "Reactivate Parent-ID";
    return action.label;
  }

  const navItems = [
    [Home, "Dashboard"], [MessageCircle, "Notice Board"], [CalendarDays, "Events"], [MessageCircle, "Messages"],
    [Building2, "My Branch"], [Users, "Contacts"], [Wallet, "Fees"], [Star, "Attendance"],
    [ChartNoAxesColumn, "Attendance Dashboard"], [Users, "Day Care"], [Search, "Search Users"],
    [ChartNoAxesColumn, "Performance Report"], [FileText, "Reports"], [BookOpen, "Admission/Enquiry Form"],
    [Truck, "Transport"], [ClipboardList, "Questionnaires"], [Package, "Manage Store"], [Store, "Store Vendor"],
    [LayoutGrid, "Campus desk"]
  ];

  async function saveEditedStudent(data, scope, photoDataUrl) {
    if (!editingStudent) return false;
    const studentCode = String(editingStudent.id);
    const mergedDetails = { ...(detailsById[studentCode] || {}), ...data };
    const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ").trim();
    const fatherName = [data.fatherFirst, data.fatherMiddle, data.fatherLast].filter(Boolean).join(" ").trim();
    const motherName = [data.motherFirst, data.motherMiddle, data.motherLast].filter(Boolean).join(" ").trim();
    const guardianName = [data.guardianFirst, data.guardianMiddle, data.guardianLast].filter(Boolean).join(" ").trim();
    const primaryParentName = data.primaryParent === "Father"
      ? fatherName
      : data.primaryParent === "Guardian" ? guardianName : motherName;

    // Map the editable contact fields to the actual students table columns as well
    // as the complete details JSON. Previously email/address/alternate phone and
    // several other fields were only stored in student_details, not in students.
    const parentChanges = {
      father: fatherName,
      parent: primaryParentName || motherName || editingStudent.parent || "",
      motherName: motherName,
      primaryParentName: primaryParentName || editingStudent.primaryParentName || "",
      primaryParent: data.primaryParent || editingStudent.primaryParent || "Mother",
      phone: data.motherPhone ?? editingStudent.phone ?? "",
      alternatePhone: data.alternatePhone ?? editingStudent.alternatePhone ?? "",
      email: data.email ?? editingStudent.email ?? "",
      address: data.address ?? editingStudent.address ?? "",
      city: data.city ?? editingStudent.city ?? "",
      state: data.state ?? editingStudent.state ?? "",
      pinCode: data.zip ?? editingStudent.pinCode ?? ""
    };
    const allChanges = {
      ...parentChanges,
      name: fullName || editingStudent.name,
      className: data.className || editingStudent.className,
      academicYear: data.academicYear || editingStudent.academicYear,
      dob: data.dob ?? editingStudent.dob ?? "",
      gender: data.gender ?? editingStudent.gender ?? "Not specified",
      enrollmentDate: data.enrollmentDate ?? editingStudent.enrollmentDate ?? "",
      enrollmentNumber: data.enrollmentNo ?? editingStudent.enrollmentNumber ?? "",
      rollNumber: data.rollNumber ?? editingStudent.rollNumber ?? "",
      house: data.house ?? editingStudent.house ?? "",
      bloodGroup: data.bloodGroup ?? editingStudent.bloodGroup ?? "",
      category: data.category ?? editingStudent.category ?? "OTHER",
      nationality: data.nationality ?? editingStudent.nationality ?? "Indian"
    };
    if (scope === "all" && photoDataUrl) allChanges.photoDataUrl = photoDataUrl;

    try {
      // The API persists student columns and extended detail fields in a single
      // transaction, so the form cannot report success after only a partial save.
      const changes = scope === "all" ? allChanges : scope === "Parent" ? parentChanges : null;
      const result = await apiPut(`/students/${encodeURIComponent(studentCode)}/details`, {
        details: mergedDetails,
        ...(changes ? { student: changes } : {})
      });
      if (result?.student) {
        setStudents(prev => prev.map(item => String(item.id) === studentCode ? result.student : item));
      }
      setDetailsById(prev => ({ ...prev, [studentCode]: mergedDetails }));
      return true;
    } catch (error) {
      notify(`Student details database save failed: ${error.message}`);
      return false;
    }
  }

  async function saveStudentPhoto(studentId, photoDataUrl) {
    // Use the dedicated photo endpoint and only update Manage Students after the
    // server confirms the photo is persisted in PostgreSQL.
    const result = await apiPut(`/students/${encodeURIComponent(studentId)}/photo`, { photoDataUrl });
    if (!result?.student || result.student.photoDataUrl !== photoDataUrl) {
      throw new Error("The server did not confirm the saved student photo. Please try again.");
    }
    const savedStudent = result.student;
    setStudents(prev => prev.map(item => String(item.id) === String(studentId) ? savedStudent : item));
    setEditingStudent(prev => prev && String(prev.id) === String(studentId) ? savedStudent : prev);
    return savedStudent;
  }
  function closeEditView() { const returnModule = editReturnModule || "My Branch"; setEditingStudent(null); if (returnModule === "My Branch") { setCurrentView("manage"); setActiveSidebarModule("My Branch"); syncNavigationUrl({ view: "manage", module: "My Branch" }); } else { setCurrentView("module"); setActiveSidebarModule(returnModule); syncNavigationUrl({ module: returnModule }); } }
  function openAdmissionForm(studentOverride = null) {
    const targetStudent = studentOverride || editingStudent || null;
    if (studentOverride) setEditingStudent(studentOverride);
    syncNavigationUrl({ view: "admission", module: "Admission/Enquiry Form", ...(targetStudent?.id != null ? { studentId: targetStudent.id } : {}) });
    setAdmissionReturnView(currentView === "module" ? "module" : currentView);
    const returnModule = currentView === "manage" ? "My Branch"
      : currentView === "edit" ? (editReturnModule || "My Branch")
      : (moduleParentView || activeSidebarModule || "Dashboard");
    setAdmissionReturnModule(returnModule);
    setActiveSidebarModule("Admission/Enquiry Form");
    // Use the first student only as local form context when no student is selected.
    if (!targetStudent && students.length) setEditingStudent(students[0]);
    setCurrentView("admission");
  }
  function returnFromAdmission() {
    if (admissionReturnView === "manage") syncNavigationUrl({ view: "manage", module: "My Branch" });
    else if (admissionReturnView === "module") syncNavigationUrl(getModuleNavigationTarget(admissionReturnModule || "Dashboard"));
    else if (admissionReturnView === "edit") syncNavigationUrl({ view: "edit", studentId: editingStudent?.id, parent: editReturnModule || "My Branch" });
    setCurrentView(admissionReturnView);
    if (admissionReturnView === "manage") {
      setEditingStudent(null);
      setActiveSidebarModule("My Branch");
    } else if (admissionReturnView === "edit") {
      setActiveSidebarModule(editReturnModule || "My Branch");
    } else if (admissionReturnView === "module") {
      setActiveSidebarModule(admissionReturnModule || "Dashboard");
    }
  }
  function openSidebarModule(label) {
    setFeesDueThroughTodayOnOpen(false);
    // A deliberate sidebar selection starts a new top-level module visit.
    // Selecting My Branch while already inside one of its subpages must also
    // clear branchPage and notify the page-level URL listener so it returns
    // to the My Branch landing section without a per-page back link.
    setModuleParentView(null);
    if (currentView !== "module") setModuleReturnView(currentView);
    setActiveSidebarModule(label);
    setCurrentView("module");
    syncNavigationUrl(getModuleNavigationTarget(label));
    if (label === "My Branch" && currentView === "module" && activeSidebarModule === "My Branch") {
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  function openOutstandingFeesDueThroughToday() {
    setModuleParentView(null);
    if (currentView !== "module") setModuleReturnView(currentView);
    setActiveSidebarModule("Fees");
    setFeesDueThroughTodayOnOpen(true);
    setCurrentView("module");
    syncNavigationUrl({ module: "Fees", dueThroughToday: true });
  }
  function openBranchLinkedModule(label, navigationOptions = {}) {
    // Both the explicit My Branch action and legacy callers enter the same
    // existing directory. Clear old filters so it never looks empty from a
    // previous Manage Students visit.
    if (label === "Manage Parents and Children" || label === "Manage Students") {
      setModuleParentView(null);
      setActiveSidebarModule("My Branch");
      setEditingStudent(null);
      setModal(null);
      setActiveTab("Active");
      setClassFilter("All classes");
      setYearFilter("-- All --");
      setQuery("");
      setShowFilters(false);
      setPage(1);
      setCurrentView("manage");
      syncNavigationUrl({ view: "manage", module: "My Branch" });
      return;
    }
    // Preserve the My Branch dashboard as the return destination when a card
    // opens an existing related demo module.
    setModuleParentView("My Branch");
    setActiveSidebarModule(label);
    setCurrentView("module");
    syncNavigationUrl(getModuleNavigationTarget(label, { parent: "My Branch", ...navigationOptions }));
  }
  function returnFromModule() {
    if (moduleParentView) {
      setActiveSidebarModule(moduleParentView);
      setCurrentView("module");
      setModuleParentView(null);
      syncNavigationUrl({ module: moduleParentView });
      return;
    }
    if (moduleReturnView === "dashboard" || moduleReturnView === "notice-landing") {
      setCurrentView("module");
      setActiveSidebarModule("Dashboard");
      syncNavigationUrl({ module: "Dashboard" });
      return;
    }
    if (moduleReturnView === "admission") {
      setCurrentView("admission");
      setActiveSidebarModule("Admission/Enquiry Form");
      syncNavigationUrl({ view: "admission", module: "Admission/Enquiry Form", ...(editingStudent?.id != null ? { studentId: editingStudent.id } : {}) });
      return;
    }
    setCurrentView(moduleReturnView);
    syncNavigationUrl(moduleReturnView === "manage" ? { view: "manage", module: "My Branch" } : { module: activeSidebarModule || "Dashboard" });
    setActiveSidebarModule("");
  }
  if (!dbReady) return <SchoolWorldLoadingSkeleton mode="workspace" label="Loading school records" />;
  if (dbLoadError) return <div className="db-loading-screen"><div className="db-loading-card"><AlertTriangle size={28}/><h2>Unable to load school data</h2><p>{dbLoadError}</p><button className="primary-button" onClick={() => window.location.reload()}>Retry connection</button></div></div>;
  if (currentView === "edit" && editingStudent) return <StudentEditPage student={{ ...(students.find(s => s.id === editingStudent.id) || editingStudent), _initialTab: editingStudent._initialTab || "Student Details" }} savedDetails={detailsById[editingStudent.id]} onSave={saveEditedStudent} onPhotoChange={saveStudentPhoto} onBack={closeEditView} onOpenAdmission={openAdmissionForm} onOpenModule={openSidebarModule} activeModule={editReturnModule || "My Branch"} onNotify={notify} classOptions={availableClasses} />;
  if (currentView === "admission") return <AdmissionFormPage student={students.find(s => String(s.id) === String(editingStudent?.id)) || editingStudent || students[0] || {}} savedDetails={detailsById[editingStudent?.id || students[0]?.id]} onBack={returnFromAdmission} onNotify={notify} onOpenModule={openSidebarModule} classOptions={availableClasses} activeModule="Admission/Enquiry Form" />;
  if (currentView === "module") return <SidebarModulePage key={activeSidebarModule} moduleName={activeSidebarModule} userRole={user?.role} students={students} onOpenDuesTillDate={openOutstandingFeesDueThroughToday} initialDueThroughToday={feesDueThroughTodayOnOpen} onUpdateStudent={updateStudent} onRefreshStudents={async () => { const refreshed = await apiGet("/students"); setStudents(Array.isArray(refreshed.students) ? refreshed.students : []); }} onBack={returnFromModule} onSelectModule={openSidebarModule} onOpenBranchLinkedModule={openBranchLinkedModule} onOpenAdmission={openAdmissionForm} onNotify={notify} onOpenStudent={(student, initialTab) => { const returnModule = moduleParentView === "My Branch" ? "My Branch" : (activeSidebarModule || "My Branch"); setEditingStudent(initialTab ? { ...student, _initialTab: initialTab } : student); setEditReturnModule(returnModule); setCurrentView("edit"); syncNavigationUrl({ view: "edit", studentId: student.id, parent: returnModule }); }} backLabel={moduleParentView === "My Branch" ? "Back to My Branch" : moduleReturnView === "manage" ? "Back to Manage Students" : moduleReturnView === "notice-landing" ? "Back to Notice Board" : moduleReturnView === "admission" ? "Back to Admission Form" : "Back to Edit Student"} />;

  const manageStudentsContext = { notify,
    schoolName,
    user,
    onLogout,
    navItems,
    currentView,
    activeSidebarModule,
    openSidebarModule,
    students,
    downloadStudentCsvTemplate,
    csvInputRef,
    handleStudentCsvImport,
    importBusy,
    downloadStudentExcelTemplate: downloadBulkStudentExcelTemplate,
    excelInputRef,
    handleStudentExcelImport,
    excelImportBusy,
    excelImportErrors,
    excelImportSummary,
    setExcelImportErrors,
    setExcelImportSummary,
    setActiveTab,
    setPage,
    classFilter,
    setClassFilter,
    availableClasses,
    yearFilter,
    setYearFilter,
    availableYears,
    query,
    setQuery,
    showFilters,
    setShowFilters,
    sortBy,
    setSortBy,
    activeTab,
    design,
    setDesign,
    visible,
    filtered,
    safePage,
    pageSize,
    setPageSize,
    totalPages,
    actions,
    openAction,
    actionLabel,
    toast,
    clearToast,
    modal,
    setModal,
    form,
    setForm,
    feeDetailsLoading,
    feeDetailRecords,
    submitModal
  };
  return <ManageStudentsPage context={manageStudentsContext} />;
}

function ApplicationRoot() {
  const { user, loading, logout } = useDatabaseSession();
  if (loading) return <SchoolWorldLoadingSkeleton mode="session" label="Checking your session" />;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ChangePasswordPage />;
  if (user.role === "super_admin") return <SuperAdminPage user={user} onLogout={logout} />;
  if (["teacher", "parent", "student", "transport_admin"].includes(user.role)) return <NoticeRecipientPortal />;
  if (!["school_admin", "principal", "staff"].includes(user.role)) return <div className="db-loading-screen"><div className="db-loading-card"><AlertTriangle size={28}/><h2>Workspace access not configured</h2><p>Contact your School World administrator to configure access for this account role.</p><button className="primary-button" onClick={logout}>Sign out</button></div></div>;
  return <SchoolDiaryApp user={user} onLogout={logout} />;
}

createRoot(document.getElementById("root")).render(<LanguageProvider><DatabaseSessionProvider><DialogProvider><ApplicationRoot /></DialogProvider></DatabaseSessionProvider></LanguageProvider>);
