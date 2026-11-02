import React, { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n.jsx";
import NoticeBoardModule from "../pages/NoticeBoard/NoticeBoardModule.jsx";
import MessagesModule from "../pages/Messages/MessagesModule.jsx";
import ContactsModule from "../pages/Contacts/ContactsModule.jsx";
import EventsCalendar from "../pages/Events/EventsCalendar.jsx";
import SchoolDashboard from "../pages/Dashboard/SchoolDashboard.jsx";
import { LegacyHeader, LegacySidebar } from "../LegacyShell.jsx";
import SearchUsersPage from "../pages/SearchUsers/SearchUsersPage.jsx";
import PerformanceReportPage from "../pages/Templates/PerformanceReport/PerformanceReportPage.jsx";
import AttendanceDashboardPage from "../pages/AttendanceDashboard/AttendanceDashboardPage.jsx";
import ReportsPage from "../pages/Reports/ReportsPage.jsx";
import MyBranchModulePage from "../pages/MyBranch/MyBranchModulePage.jsx";
import AdmissionFormsManagerPage from "../pages/Admissions/AdmissionFormsManagerPage.jsx";
import FeesModulePage from "../pages/Fees/FeesModulePage.jsx";
import { CollectFeeScreen, DepartmentsScreen, ExamsScreen, FeeMastersScreen, ProgramsScreen, PromotionScreen, RolesScreen, SessionsScreen, SettingsScreen, StaffScreen, TimetableScreen, UsersScreen } from "../pages/ErpCollege/CollegeScreens.jsx";
import AttendanceModulePage from "../pages/Attendance/AttendanceModulePage.jsx";
import DayCareModulePage from "../pages/DayCare/DayCareModulePage.jsx";
import TransportModulePage from "../pages/Transport/TransportModulePage.jsx";
import QuestionnairesModulePage from "../pages/Questionnaires/QuestionnairesModulePage.jsx";
import StoreInventoryPage from "../pages/ManageStore/StoreInventoryPage.jsx";
import StoreVendorPage from "../pages/StoreVendor/StoreVendorPage.jsx";
import GenericModulePage from "../pages/Shared/GenericModulePage.jsx";
import { ArrowLeft, CheckCircle2 } from "lucide-react";


const moduleDescriptions = {
  "Dashboard": "School overview, daily priorities and smart assistance.",
  "Notice Board": "Create and review school notices.",
  "Events": "Manage upcoming school events and activities.",
  "Messages": "Review and compose demo messages.",
  "My Branch": "Review branch information and contact settings.",
  "Admission/Enquiry Form": "Configure admission and enquiry field groups, required fields, and downloadable form templates.",
  "Contacts": "Find students and their parent contact details.",
  "Fees": "Manage fee records, review payments and generate XLS/PDF reports.",
  "Attendance": "Manage date-wise class, teacher and staff attendance using calendar views.",
  "Attendance Dashboard": "Review attendance summaries for the selected student dataset.",
  "Day Care": "Manage demo day-care check-in and check-out records.",
  "Search Users": "Search students by name, ID, class, parent or phone.",
  "Performance Report": "Review a summary of student records by class.",
  "Reports": "Generate and download local demo reports.",
  "Transport": "Review school routes and add demo route records.",
  "Questionnaires": "Build questionnaires and quizzes, assign classes, import PDF questionnaires, and review submissions.",
  "Manage Store": "Review stock quantities and update demo inventory.",
  "Store Vendor": "Maintain a local demo list of store vendors."
};


export function SidebarModulePage({ moduleName, userRole = "staff", students = [], onBack, onSelectModule, onOpenBranchLinkedModule, onOpenDuesTillDate, initialDueThroughToday = false, onOpenAdmission, onNotify, onOpenStudent, onUpdateStudent, onRefreshStudents, backLabel = "Back to Edit Student" }) {
  const [localToast, setLocalToast] = useState("");
  const localToastTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (localToastTimeoutRef.current) window.clearTimeout(localToastTimeoutRef.current);
  }, []);
  const [isMyBranchSubpage, setIsMyBranchSubpage] = useState(() =>
    (moduleName === "My Branch" || backLabel === "Back to My Branch") &&
    Boolean(new URLSearchParams(window.location.search).get("branchPage"))
  );


  const notify = useCallback((message, options = {}) => {
    if (localToastTimeoutRef.current) {
      window.clearTimeout(localToastTimeoutRef.current);
      localToastTimeoutRef.current = null;
    }
    setLocalToast(t(message));
    onNotify?.(message, options);
    if (!options?.persistent) {
      localToastTimeoutRef.current = window.setTimeout(() => {
        setLocalToast("");
        localToastTimeoutRef.current = null;
      }, 3200);
    }
  }, [onNotify]);
  let content;
  switch (moduleName) {
    case "Dashboard":
      content = <SchoolDashboard students={students} userRole={userRole} onSelectModule={onSelectModule} onOpenBranchLinkedModule={onOpenBranchLinkedModule} onOpenDuesTillDate={onOpenDuesTillDate} onNotify={onNotify} />;
      break;
    case "Search Users":
      content = <SearchUsersPage students={students} onOpenStudent={onOpenStudent} t={t} />;
      break;
    case "Contacts":
      content = <ContactsModule students={students} userRole={userRole} onOpenStudent={onOpenStudent} onUpdateStudent={onUpdateStudent} onRefreshStudents={onRefreshStudents} onNotify={notify} />;
      break;
    case "Performance Report":
      content = <PerformanceReportPage students={students} t={t} />;
      break;
    case "Attendance Dashboard":
      content = <AttendanceDashboardPage students={students} t={t} />;
      break;
    case "Reports":
      content = <ReportsPage students={students} t={t} notify={notify} />;
      break;
    case "Notice Board":
      content = <NoticeBoardModule students={students} onNotify={onNotify} />;
      break;
    case "Events":
      content = <EventsCalendar students={students} onNotify={onNotify} />;
      break;
    case "Messages":
      content = <MessagesModule userRole={userRole} onNotify={notify} />;
      break;
    case "My Branch":
      content = <MyBranchModulePage students={students} onOpenAdmission={onOpenAdmission} onOpenBranchLinkedModule={onOpenBranchLinkedModule} onRefreshStudents={onRefreshStudents} onBranchPageChange={setIsMyBranchSubpage} notify={notify} t={t} />;
      break;
    case "Fees":
      content = <FeesModulePage students={students} t={t} notify={notify} onOpenStudent={onOpenStudent} initialDueThroughToday={initialDueThroughToday} />;
      break;
    case "Attendance":
      content = <AttendanceModulePage students={students} t={t} notify={notify} onOpenStudent={onOpenStudent} />;
      break;
    case "Day Care":
      content = <DayCareModulePage students={students} t={t} />;
      break;
    case "Transport":
      content = <TransportModulePage notify={notify} t={t} />;
      break;
    case "Questionnaires":
      content = <QuestionnairesModulePage notify={notify} t={t} />;
      break;
    case "Manage Store":
      content = <StoreInventoryPage t={t} />;
      break;
    case "Store Vendor":
      content = <StoreVendorPage notify={notify} t={t} />;
      break;
    case "Admission/Enquiry Form":
      content = <AdmissionFormsManagerPage />;
      break;
    case "Departments":
      content = <DepartmentsScreen />;
      break;
    case "Programs":
      content = <ProgramsScreen />;
      break;
    case "Sessions":
      content = <SessionsScreen />;
      break;
    case "Timetable":
      content = <TimetableScreen />;
      break;
    case "Exams":
      content = <ExamsScreen />;
      break;
    case "Fee Masters":
      content = <FeeMastersScreen />;
      break;
    case "Collect Fee":
      content = <CollectFeeScreen />;
      break;
    case "Staff Directory":
      content = <StaffScreen />;
      break;
    case "Users":
      content = <UsersScreen />;
      break;
    case "Roles":
      content = <RolesScreen />;
      break;
    case "Promotion":
      content = <PromotionScreen />;
      break;
    case "Campus Settings":
      content = <SettingsScreen />;
      break;
    default:
      content = <GenericModulePage moduleName={moduleName} t={t} notify={notify} />;
  }


  const isMyBranchFlow = moduleName === "My Branch" || backLabel === "Back to My Branch";
  return <div className={`legacy-app sidebar-module-app${isMyBranchFlow ? " my-branch-page" : ""}${moduleName === "Dashboard" ? " dashboard-module-app" : ""}${moduleName === "Notice Board" ? " notice-board-module-app" : ""}${moduleName === "Contacts" ? " contacts-module-app" : ""}${moduleName === "Messages" ? " messages-module-app" : ""}`}>
    <LegacyHeader />
    <LegacySidebar onBack={onBack} onNotify={notify} onModuleSelect={onSelectModule} onOpenAdmission={onOpenAdmission} activeModule={isMyBranchFlow ? "My Branch" : moduleName} backLabel={backLabel} />
    <main className="legacy-main module-main">
      {!isMyBranchSubpage && <div className={"module-page-heading" + (backLabel === "Back to Notice Board" || backLabel === "Back to Manage Students" ? " no-back" : "")}><div>{backLabel !== "Back to Notice Board" && backLabel !== "Back to Manage Students" && <button type="button" className="edit-back-button" onClick={onBack}><ArrowLeft size={15}/> {t(backLabel)}</button>}<h1>{t(moduleName)}</h1><p>{t(moduleDescriptions[moduleName] || "School World module")}</p></div></div>}
      
      {content}
      {localToast && <div className="legacy-local-toast" role="alert" aria-live="assertive"><CheckCircle2 size={17}/><span className="legacy-local-toast-message">{localToast}</span><button type="button" className="legacy-toast-close" aria-label="Close notification" title="Close notification" onClick={() => setLocalToast("")}>×</button></div>}
      <div className="module-footer-note">{t("Changes on this module are saved to the school database.")}</div>
    </main>
  </div>;
}
