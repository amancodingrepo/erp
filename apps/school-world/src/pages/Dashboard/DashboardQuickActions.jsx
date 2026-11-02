import React from "react";
import { ArrowRight, ArrowUpRight, BellRing, CalendarDays, ClipboardCheck, UserRound, Users, Wallet } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, getModuleNavigationTarget, handleNavigationClick } from "../../navigation.js";

const QUICK_ACTIONS = [
  { label: "Manage Students", Icon: Users, tone: "blue", module: "Manage Students" },
  { label: "Notice Board", Icon: BellRing, tone: "violet", module: "Notice Board" },
  { label: "Events", Icon: CalendarDays, tone: "green", module: "Events" },
  { label: "Contacts", Icon: UserRound, tone: "amber", module: "Contacts" },
  { label: "Fees", Icon: Wallet, tone: "rose", module: "Fees" },
  { label: "Attendance", Icon: ClipboardCheck, tone: "teal", module: "Attendance" }
];

export default function DashboardQuickActions({ onOpenModule }) {
  return (
    <section className="school-dashboard-quick">
      <div className="school-dashboard-section-heading"><div><span className="school-dashboard-section-icon"><ArrowRight size={16}/></span><div><h3>{t("Quick Actions")}</h3><p>{t("Jump straight to a school task.")}</p></div></div></div>
      <div className="school-dashboard-quick-grid">
        {QUICK_ACTIONS.map(({ label, Icon, tone, module }) => <a key={module} href={getNavigationHref(getModuleNavigationTarget(module))} className={"school-dashboard-quick-card " + tone} onClick={event => handleNavigationClick(event, () => onOpenModule?.(module))}><span><Icon size={18}/></span><strong>{t(label)}</strong><ArrowUpRight size={14}/></a>)}
      </div>
    </section>
  );
}
