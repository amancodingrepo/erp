import React from "react";
import { useSchoolName } from "./school-config.js";
import { t } from "./i18n.jsx";
import { useDatabaseSession } from "./DatabaseSession.jsx";
import TopbarActions from "./components/topbar/TopbarActions.jsx";
import SchoolLogo from "./components/topbar/SchoolLogo.jsx";
import { getNavigationHref, getModuleNavigationTarget, handleNavigationClick } from "./navigation.js";
import {
  ArrowLeft, BookOpen, Bell, UserCircle, ChevronDown, Home, MessageCircle, CalendarDays,
  Building2, Users, Wallet, Star, ChartNoAxesColumn, Camera, CloudDownload, ExternalLink,
  Save, Plus, Printer, Upload, Trash2, CheckCircle2, X, FileText, Search, AlertCircle, Truck, ClipboardList, Package, Store, AlertTriangle
} from "lucide-react";

const sideLinks = [
  [Home, "Dashboard"], [MessageCircle, "Notice Board"], [CalendarDays, "Events"], [MessageCircle, "Messages"],
  [Building2, "My Branch"], [Users, "Contacts"], [Wallet, "Fees"], [Star, "Attendance"],
  [ChartNoAxesColumn, "Attendance Dashboard"], [Users, "Day Care"], [Search, "Search Users"],
  [ChartNoAxesColumn, "Performance Report"], [FileText, "Reports"], [BookOpen, "Admission/Enquiry Form"],
  [Truck, "Transport"], [ClipboardList, "Questionnaires"], [Package, "Manage Store"], [Store, "Store Vendor"],
  [Building2, "Departments"], [BookOpen, "Programs"], [CalendarDays, "Sessions"],
  [ClipboardList, "Timetable"], [FileText, "Exams"], [Wallet, "Fee Masters"],
  [Wallet, "Collect Fee"], [Users, "Staff Directory"], [Users, "Users"],
  [Star, "Roles"], [Users, "Promotion"], [Building2, "Campus Settings"]
];

export function LegacyHeader({ onBack, isAdmission = false, onNotify }) {
  const schoolName = useSchoolName();
  return <header className="legacy-topbar">
    <div className="legacy-brand"><BookOpen size={20}/><span>School World</span></div>
    <div className="legacy-school-name">{schoolName}</div>
    <TopbarActions onNotify={onNotify} />
  </header>;
}
export function LegacySidebar({ onBack, onNotify, admission = false, onModuleSelect, onOpenAdmission, activeModule = "", backLabel }) {
  const links = sideLinks;
  const schoolName = useSchoolName();
  const session = useDatabaseSession();
  const handleLinkClick = (label) => {
    if (label === "Admission/Enquiry Form" && onModuleSelect) {
      onModuleSelect(label);
    } else if (label === "Admission/Enquiry Form" && onOpenAdmission) {
      onOpenAdmission();
    } else if (onModuleSelect) {
      onModuleSelect(label);
    } else {
      onNotify?.(`${label} is a standalone demo module.`);
    }
  };
  return <aside className="legacy-sidebar app-sidebar-parity">
    <div className="school-logo sanford-school-logo">
      <SchoolLogo />
    </div>
    <nav className="app-sidebar-nav" aria-label={t("School modules")}>{links.map(([Icon, label]) => <a key={label} href={getNavigationHref(getModuleNavigationTarget(label))} className={`nav-item ${activeModule === label ? "selected" : ""}`} aria-current={activeModule === label ? "page" : undefined} onClick={event => handleNavigationClick(event, () => handleLinkClick(label))}><Icon size={18}/><span>{t(label)}</span></a>)}</nav>
    {backLabel !== "Back to Notice Board" && (backLabel || (admission ? "Back to edit details" : "Back to Manage Students")) !== "Back to Manage Students" && <button type="button" className="app-sidebar-back" onClick={onBack}><ArrowLeft size={18}/><span>{t(backLabel || (admission ? "Back to edit details" : "Back to Manage Students"))}</span></button>}
  </aside>;
}
