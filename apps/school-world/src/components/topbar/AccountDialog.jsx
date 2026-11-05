import React, { useState } from "react";
import { KeyRound, UserRound, X } from "lucide-react";
import BaseDialog from "../dialogs/BaseDialog.jsx";
import { apiPatch } from "../../api.js";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { t } from "../../i18n.jsx";
import { ROLE_LABELS, displayName, initials } from "./topbarNavigation.js";

/** My account: who you are signed in as, your email, and changing your password. */
export default function AccountDialog({ open, initialTab = "profile", onClose, onNotify }) {
  const session = useDatabaseSession();
  const user = session.user;
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState(user?.email && user.email.includes("@") ? user.email : "");
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ ok: "", error: "" });
  if (!user) return null;
  const name = displayName(user);

  async function saveEmail(event) {
    event.preventDefault();
    setBusy(true); setMessage({ ok: "", error: "" });
    try {
      await apiPatch("/v1/users/me", { email: email.trim() });
      await session.refresh();
      setMessage({ ok: t("Your email was saved."), error: "" });
    } catch (e) { setMessage({ ok: "", error: e.message || t("The email could not be saved.") }); }
    finally { setBusy(false); }
  }
  async function savePassword(event) {
    event.preventDefault();
    if (pw.next !== pw.again) { setMessage({ ok: "", error: t("The two new passwords do not match.") }); return; }
    if (pw.next.length < 12) { setMessage({ ok: "", error: t("Use at least 12 characters for the new password.") }); return; }
    setBusy(true); setMessage({ ok: "", error: "" });
    try {
      await session.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", again: "" });
      setMessage({ ok: t("Your password was changed."), error: "" });
      onNotify?.(t("Your password was changed."));
    } catch (e) { setMessage({ ok: "", error: e.message || t("The password could not be changed.") }); }
    finally { setBusy(false); }
  }

  return (
    <BaseDialog open={open} onClose={onClose} className="tb-dialog" labelledBy="tb-account-title">
      <header className="tb-dialog-head">
        <span className="tb-avatar tb-avatar-lg" aria-hidden="true">{initials(name)}</span>
        <div><h2 id="tb-account-title">{t("My account")}</h2><p>{name} · {t(ROLE_LABELS[user.role] || "Staff")} · {user.school?.name}</p></div>
        <button type="button" className="tb-icon-btn" onClick={onClose} aria-label={t("Close")}><X size={18} /></button>
      </header>
      <div className="tb-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "profile"} className={tab === "profile" ? "active" : ""} onClick={() => { setTab("profile"); setMessage({ ok: "", error: "" }); }}><UserRound size={15} /> {t("Profile")}</button>
        <button type="button" role="tab" aria-selected={tab === "password"} className={tab === "password" ? "active" : ""} onClick={() => { setTab("password"); setMessage({ ok: "", error: "" }); }}><KeyRound size={15} /> {t("Password")}</button>
      </div>
      {message.error && <p className="tb-alert error" role="alert">{message.error}</p>}
      {message.ok && <p className="tb-alert ok" role="status">{message.ok}</p>}
      {tab === "profile" ? (
        <form className="tb-form" onSubmit={saveEmail}>
          <dl className="tb-facts">
            <div><dt>{t("Name")}</dt><dd>{name || "—"}</dd></div>
            <div><dt>{t("Role")}</dt><dd>{t(ROLE_LABELS[user.role] || "Staff")}</dd></div>
            <div><dt>{t("School")}</dt><dd>{user.school?.name || "—"}{user.school?.code ? " (" + user.school.code + ")" : ""}</dd></div>
          </dl>
          <label>{t("Email")}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@school.edu" /></label>
          <div className="tb-actions"><button type="button" className="tb-btn" onClick={onClose}>{t("Close")}</button><button type="submit" className="tb-btn primary" disabled={busy}>{busy ? t("Saving…") : t("Save email")}</button></div>
        </form>
      ) : (
        <form className="tb-form" onSubmit={savePassword}>
          <label>{t("Current password")}<input type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
          <label>{t("New password")}<input type="password" required minLength={12} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
          <label>{t("New password again")}<input type="password" required minLength={12} autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></label>
          <p className="tb-hint">{t("Use at least 12 characters, and a password you don't use anywhere else.")}</p>
          <div className="tb-actions"><button type="button" className="tb-btn" onClick={onClose}>{t("Close")}</button><button type="submit" className="tb-btn primary" disabled={busy}>{busy ? t("Saving…") : t("Change password")}</button></div>
        </form>
      )}
    </BaseDialog>
  );
}
