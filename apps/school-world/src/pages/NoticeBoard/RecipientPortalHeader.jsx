import React from "react";
import { BookOpen } from "lucide-react";
import { t } from "../../i18n.jsx";
import { PortalTopbarActions } from "../../components/topbar/TopbarActions.jsx";

// Sign out, My account and Change password live in the profile menu, as in the staff top bar.
export default function RecipientPortalHeader({ schoolName, onNotify }) {
  return (
    <header className="recipient-portal-header">
      <div className="recipient-portal-brand"><BookOpen size={25}/><div><strong>{schoolName}</strong><small>{t("Notice Board")}</small></div></div>
      <div className="recipient-portal-user"><PortalTopbarActions onNotify={onNotify}/></div>
    </header>
  );
}
