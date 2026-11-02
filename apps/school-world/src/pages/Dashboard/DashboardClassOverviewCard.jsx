import React from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";

export default function DashboardClassOverviewCard({ metrics, onOpenModule }) {
  return (
    <section className="school-dashboard-panel">
      <header className="school-dashboard-panel-header"><div><span className="school-dashboard-panel-icon amber"><Users size={17}/></span><div><h3>{t("Class Overview")}</h3><p>{t("Largest classes by loaded student count.")}</p></div></div><a href={getNavigationHref({ module: "Reports" })} className="school-dashboard-header-link" onClick={event => handleNavigationClick(event, () => onOpenModule?.("Reports"))}>{t("Reports")}<ArrowUpRight size={13}/></a></header>
      {metrics.classes.length ? <div className="school-dashboard-class-list">{metrics.classes.slice(0, 5).map(item => <div className="school-dashboard-class-row" key={item.name}><span>{item.name}</span><div className="school-dashboard-class-track"><i style={{width: (metrics.total ? item.total / metrics.total * 100 : 0) + "%"}}/></div><strong>{item.total}</strong></div>)}</div> : <div className="school-dashboard-empty">{t("No class records are available.")}</div>}
    </section>
  );
}
