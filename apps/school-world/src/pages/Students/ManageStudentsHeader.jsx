import React from "react";
import { BookOpen, Bell, Settings, UserCircle, Home, CalendarDays, ChevronRight } from "lucide-react";
import { LanguageToggle, t } from "../../i18n.jsx";
import { getNavigationHref, getModuleNavigationTarget, handleNavigationClick } from "../../navigation.js";
import AppThemeControl from "../../AppThemeControl.jsx";
import sanfordSchoolLogo from "../../assets/sanford-school-logo-5.png";

export default function ManageStudentsHeader({ context }) {
  const { schoolName, user, onLogout, navItems, currentView, activeSidebarModule, openSidebarModule } = context;
  return (
    <>
    <header className="topbar">
          <div className="brand"><BookOpen size={27}/><span>School World</span></div>
          <div className="school-name">{schoolName}</div>
          <div className="top-actions"><LanguageToggle/><AppThemeControl/><Bell size={19}/><Settings size={19}/><UserCircle size={27}/><span>{[user?.firstName,user?.lastName].filter(Boolean).join(" ") || user?.email || t("School Admin")}</span><button type="button" className="db-topbar-logout" onClick={onLogout}>Sign out</button></div>
        </header>
        <aside className="sidebar">
          <div className="school-logo sanford-school-logo"><img src={sanfordSchoolLogo} alt="Sanford School — Knowledge, Values, Success" className="school-sidebar-logo-image" /></div>
          <nav className="app-sidebar-nav" aria-label={t("School modules")}>{navItems.map(([Icon, label]) => <a key={label} href={getNavigationHref(getModuleNavigationTarget(label))} className={`nav-item ${label === (currentView === "manage" ? "My Branch" : activeSidebarModule) ? "selected" : ""}`} aria-current={label === (currentView === "manage" ? "My Branch" : activeSidebarModule) ? "page" : undefined} onClick={event => handleNavigationClick(event, () => openSidebarModule(label))}><Icon size={18}/><span>{t(label)}</span></a>)}</nav>
          <div className="sidebar-note">{t("Manage Students")}<br/><small>{t("Standalone prototype")}</small></div>
        </aside>
    </>
  );
}
