import React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function DashboardDataNote({ refreshing, onRefresh }) {
  return (
    <div className="school-dashboard-data-note"><CheckCircle2 size={14}/><span>{t("Dashboard summaries are calculated from the records the application successfully loaded. Review source records before making operational decisions.")}</span><button type="button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={13}/>{t("Refresh summaries")}</button></div>
  );
}
