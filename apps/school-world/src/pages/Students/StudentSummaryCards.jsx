import React from "react";
import { Users, UserCircle, Wallet } from "lucide-react";

export default function StudentSummaryCards({ context }) {
  const { students, setActiveTab, setPage, t } = context;
  return (
    <section className="stats">
            <button type="button" className="stat-card blue stat-card-action" onClick={() => { setActiveTab("All"); setPage(1); }} aria-label={t(`Show all students, ${students.length} students`)}><span className="stat-icon"><Users size={22}/></span><div><small>{t("Total Students")}</small><strong>{students.length}</strong></div></button>
            <button type="button" className="stat-card green stat-card-action" onClick={() => { setActiveTab("Active"); setPage(1); }} aria-label={t(`Show active students, ${students.filter(s=>s.status==="Active").length} students`)}><span className="stat-icon"><UserCircle size={22}/></span><div><small>{t("Active Students")}</small><strong>{students.filter(s=>s.status==="Active").length}</strong></div></button>
            <button type="button" className="stat-card red stat-card-action" onClick={() => { setActiveTab("Inactive"); setPage(1); }} aria-label={t(`Show inactive students, ${students.filter(s=>s.status==="Inactive").length} students`)}><span className="stat-icon"><Users size={22}/></span><div><small>{t("Inactive Students")}</small><strong>{students.filter(s=>s.status==="Inactive").length}</strong></div></button>
            <button type="button" className="stat-card amber stat-card-action" onClick={() => { setActiveTab("Defaulters"); setPage(1); }} aria-label={`Show fee defaulters, ${students.filter(s=>s.defaulter).length} students`}><span className="stat-icon"><Wallet size={22}/></span><div><small>{t("Fee Defaulters")}</small><strong>{students.filter(s=>s.defaulter).length}</strong></div></button>
          </section>
  );
}
