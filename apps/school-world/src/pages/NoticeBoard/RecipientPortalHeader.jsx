import React from "react";
import { BookOpen, LogOut } from "lucide-react";
import { LanguageToggle } from "../../i18n.jsx";
import AppThemeControl from "../../AppThemeControl.jsx";

export default function RecipientPortalHeader({ schoolName, displayName, onLogout }) {
  return (<header className="recipient-portal-header"><div className="recipient-portal-brand"><BookOpen size={25}/><div><strong>School World</strong><small>{schoolName || 'School'} · Notice Board</small></div></div><div className="recipient-portal-user"><LanguageToggle/><AppThemeControl/><span>{displayName}</span><button onClick={onLogout}><LogOut size={15}/> Sign out</button></div></header>);
}
