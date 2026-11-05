import React from "react";
import { BookOpen } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, getModuleNavigationTarget, handleNavigationClick } from "../../navigation.js";
import TopbarActions from "../../components/topbar/TopbarActions.jsx";
import SchoolLogo from "../../components/topbar/SchoolLogo.jsx";

export default function ManageStudentsHeader({ context }) {
  const { schoolName, navItems, currentView, activeSidebarModule, openSidebarModule, notify } = context;
  return (
    <>
    <header className="topbar">
          <div className="brand"><BookOpen size={27}/><span>School World</span></div>
          <div className="school-name">{schoolName}</div>
          <TopbarActions onNotify={notify} />
        </header>
        <aside className="sidebar">
          <div className="school-logo sanford-school-logo"><SchoolLogo /></div>
          <nav className="app-sidebar-nav" aria-label={t("School modules")}>{navItems.map(([Icon, label]) => <a key={label} href={getNavigationHref(getModuleNavigationTarget(label))} className={`nav-item ${label === (currentView === "manage" ? "My Branch" : activeSidebarModule) ? "selected" : ""}`} aria-current={label === (currentView === "manage" ? "My Branch" : activeSidebarModule) ? "page" : undefined} onClick={event => handleNavigationClick(event, () => openSidebarModule(label))}><Icon size={18}/><span>{t(label)}</span></a>)}</nav>
        </aside>
    </>
  );
}
