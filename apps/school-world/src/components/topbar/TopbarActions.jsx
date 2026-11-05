import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell, Building2, CalendarCheck, ChevronDown, ClipboardList, KeyRound, LayoutGrid, LogOut, Mail,
  Megaphone, Repeat, Settings, ShieldCheck, UserRound, Users
} from "lucide-react";
import { apiGet, apiPost } from "../../api.js";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { LanguageToggle, t } from "../../i18n.jsx";
import AppThemeControl from "../../AppThemeControl.jsx";
import TopbarMenu, { MenuItem } from "./TopbarMenu.jsx";
import AccountDialog from "./AccountDialog.jsx";
import SchoolProfileDialog from "./SchoolProfileDialog.jsx";
import { ROLE_LABELS, displayName, goTo, initials, isManager } from "./topbarNavigation.js";
import "./topbar.css";

const POLL_MS = 60 * 1000;
const KIND_ICON = { message: Mail, notice: Megaphone, leave: CalendarCheck, admission: ClipboardList };

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  if (ms < 0) return new Date(iso).toLocaleDateString();
  const m = Math.round(ms / 60000);
  if (m < 1) return t("just now");
  if (m < 60) return m + " " + t("min ago");
  const h = Math.round(m / 60);
  if (h < 24) return h + " " + t("h ago");
  const d = Math.round(h / 24);
  return d < 7 ? d + " " + t("d ago") : new Date(iso).toLocaleDateString();
}

/** Unread messages, unseen notices, pending leave and new applications for the signed-in staff member. */
function useNotifications(enabled) {
  const [data, setData] = useState({ total: 0, items: [], counts: {} });
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const result = await apiGet("/notifications");
      if (alive.current) { setData(result); setError(""); }
    } catch (e) {
      if (alive.current) setError(e.message || t("Notifications could not be loaded."));
    } finally { if (alive.current) setLoaded(true); }
  }, []);
  useEffect(() => {
    alive.current = true;
    if (!enabled) return () => { alive.current = false; };
    load();
    const tick = () => { if (document.visibilityState === "visible") load(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { alive.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [enabled, load]);
  return { ...data, error, loaded, reload: load };
}

async function markRead(item) {
  const [kind, id] = item.id.split(":");
  if (kind === "message") await apiPost("/messages/" + encodeURIComponent(id) + "/read", {});
  if (kind === "notice") await apiPost("/notices/" + encodeURIComponent(id) + "/views", {});
}

function NotificationsMenu({ onNotify }) {
  const n = useNotifications(true);
  const badge = n.total > 99 ? "99+" : n.total || null;
  async function open(item, close) {
    close();
    try { await markRead(item); } catch { /* opening still works; it stays unread */ }
    goTo(item.target);
    n.reload();
  }
  async function markAllRead() {
    const readable = n.items.filter((item) => item.kind === "message" || item.kind === "notice");
    const results = await Promise.allSettled(readable.map(markRead));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) onNotify?.(failed + " " + t("could not be marked as read."));
    n.reload();
  }
  const readableCount = (n.counts.messages || 0) + (n.counts.notices || 0);
  return (
    <TopbarMenu label={n.total ? t("Notifications") + " (" + n.total + ")" : t("Notifications")} icon={<Bell size={19} />} badge={badge} panelClassName="tb-notifications" onOpen={n.reload}>
      {(close) => (
        <>
          <div className="tb-panel-head">
            <strong>{t("Notifications")}</strong>
            {readableCount > 0 && <button type="button" className="tb-link" onClick={markAllRead}>{t("Mark messages & notices read")}</button>}
          </div>
          {n.error && <p className="tb-alert error">{n.error}</p>}
          {!n.loaded && !n.error && <p className="tb-empty">{t("Loading…")}</p>}
          {n.loaded && !n.error && n.items.length === 0 && (
            <div className="tb-empty"><Bell size={22} /><span>{t("You're all caught up.")}</span><small>{t("New messages, notices, leave requests and applications will show here.")}</small></div>
          )}
          {n.items.length > 0 && (
            <ul className="tb-notification-list">
              {n.items.map((item) => {
                const Icon = KIND_ICON[item.kind] || Bell;
                return (
                  <li key={item.id}>
                    <button type="button" data-menu-item="" className="tb-notification" onClick={() => open(item, close)}>
                      <span className={"tb-kind tb-kind-" + item.kind}><Icon size={15} /></span>
                      <span className="tb-notification-text"><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <time dateTime={item.at}>{timeAgo(item.at)}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {n.total > n.items.length && <p className="tb-more">{t("Showing the latest")} {n.items.length} {t("of")} {n.total}.</p>}
          <div className="tb-panel-foot">
            <button type="button" className="tb-link" onClick={() => { close(); goTo({ module: "Messages" }); }}>{t("Open Messages")}</button>
            <button type="button" className="tb-link" onClick={() => { close(); goTo({ module: "Notice Board" }); }}>{t("Open Notice Board")}</button>
          </div>
        </>
      )}
    </TopbarMenu>
  );
}

export default function TopbarActions({ onNotify }) {
  const session = useDatabaseSession();
  const user = session.user;
  const [dialog, setDialog] = useState(null); // null | "profile" | "password" | "school"
  if (!user) return null;
  const name = displayName(user);
  const manager = isManager(user);
  const role = t(ROLE_LABELS[user.role] || "Staff");
  const notify = (text) => (onNotify ? onNotify(text) : undefined);

  return (
    <div className="tb-actions-bar">
      <LanguageToggle />
      <AppThemeControl />
      <NotificationsMenu onNotify={notify} />
      <TopbarMenu label={t("Settings")} icon={<Settings size={19} />}>
        {(close) => (
          <>
            <div className="tb-panel-head"><strong>{t("Settings")}</strong><small>{user.school?.name}</small></div>
            {manager ? (
              <>
                <MenuItem close={close} icon={<Building2 size={16} />} hint={t("Name, contact details and logo")} onSelect={() => setDialog("school")}>{t("School profile")}</MenuItem>
                <MenuItem close={close} icon={<Settings size={16} />} hint={t("Year, timezone and campus options")} onSelect={() => goTo({ module: "Campus Settings" })}>{t("Campus settings")}</MenuItem>
                <MenuItem close={close} icon={<Users size={16} />} hint={t("Staff, student and parent logins")} onSelect={() => goTo({ module: "Users" })}>{t("Users")}</MenuItem>
                <MenuItem close={close} icon={<ShieldCheck size={16} />} hint={t("What each role can do")} onSelect={() => goTo({ module: "Roles" })}>{t("Roles & permissions")}</MenuItem>
                <MenuItem close={close} icon={<LayoutGrid size={16} />} hint={t("Email, SMS, payments, backup and more")} onSelect={() => goTo({ module: "Campus desk", screen: "/staff/schsettings" })}>{t("All system settings")}</MenuItem>
              </>
            ) : (
              <p className="tb-hint pad">{t("School settings are managed by your school admin or principal.")}</p>
            )}
            <div className="tb-sep" />
            <MenuItem close={close} icon={<UserRound size={16} />} onSelect={() => setDialog("profile")}>{t("My account")}</MenuItem>
          </>
        )}
      </TopbarMenu>
      <TopbarMenu label={t("Account menu for") + " " + name} panelClassName="tb-profile" icon={<><span className="tb-avatar" aria-hidden="true">{initials(name)}</span><span className="tb-user-name">{name}</span><ChevronDown size={15} className="tb-chevron" /></>}>
        {(close) => (
          <>
            <div className="tb-profile-head">
              <span className="tb-avatar tb-avatar-lg" aria-hidden="true">{initials(name)}</span>
              <div><strong>{name}</strong>{user.email && user.email !== name ? <small>{user.email}</small> : null}<span className="tb-role">{role} · {user.school?.name}</span></div>
            </div>
            <MenuItem close={close} icon={<UserRound size={16} />} onSelect={() => setDialog("profile")}>{t("My account")}</MenuItem>
            <MenuItem close={close} icon={<KeyRound size={16} />} onSelect={() => setDialog("password")}>{t("Change password")}</MenuItem>
            {user.canSwitchCampus && <MenuItem close={close} icon={<Repeat size={16} />} hint={t("Work in another campus")} onSelect={() => goTo({ module: "Campus desk", screen: "/staff/multibranch/branch/overview" })}>{t("Switch campus")}</MenuItem>}
            <div className="tb-sep" />
            <MenuItem close={close} icon={<LogOut size={16} />} danger onSelect={session.logout}>{t("Sign out")}</MenuItem>
          </>
        )}
      </TopbarMenu>
      {(dialog === "profile" || dialog === "password") && <AccountDialog open initialTab={dialog} onClose={() => setDialog(null)} onNotify={notify} />}
      {dialog === "school" && <SchoolProfileDialog open onClose={() => setDialog(null)} onNotify={notify} />}
    </div>
  );
}
