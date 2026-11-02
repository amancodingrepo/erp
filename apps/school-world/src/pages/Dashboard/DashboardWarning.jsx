import React from "react";
import { AlertTriangle } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function DashboardWarning({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div className="school-dashboard-warning">
      <AlertTriangle size={16}/>
      <span>{t("Some summaries could not be loaded. Student cards still use the student records already loaded into the app.")} {warnings.map(item => t(item)).join(" ")}</span>
    </div>
  );
}
