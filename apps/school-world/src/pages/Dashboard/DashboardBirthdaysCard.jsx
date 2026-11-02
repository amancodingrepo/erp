import React from "react";
import { Clock3, UserRound } from "lucide-react";
import { t } from "../../i18n.jsx";
import { studentName } from "./dashboardUtils.js";

export default function DashboardBirthdaysCard({ metrics }) {
  return (
    <section className="school-dashboard-panel">
      <header className="school-dashboard-panel-header"><div><span className="school-dashboard-panel-icon amber"><Clock3 size={17}/></span><div><h3>{t("Birthdays in the Next 7 Days")}</h3><p>{t("Calculated from student date-of-birth fields.")}</p></div></div><span className="school-dashboard-pill">{metrics.birthdays.length}</span></header>
      {metrics.birthdays.length ? <div className="school-dashboard-birthday-list">{metrics.birthdays.map(item => <div className="school-dashboard-birthday" key={item.student.id || studentName(item.student)}><span className="school-dashboard-avatar"><UserRound size={17}/></span><span><strong>{studentName(item.student)}</strong><small>{item.student.className || item.student.class || t("Student")}</small></span><em>{item.days === 0 ? t("Today") : t("In") + " " + item.days + " " + t("days")}</em></div>)}</div> : <div className="school-dashboard-empty"><span className="school-dashboard-birthday-emoji">🎂</span><strong>{t("No student birthdays in the next 7 days.")}</strong></div>}
    </section>
  );
}
