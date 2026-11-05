import React, { useEffect, useMemo, useState } from "react";
import { Bell, Newspaper, ShieldCheck, AlertCircle, X } from "lucide-react";
import { apiGet, apiPost } from "../../api.js";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import RecipientPortalHeader from "./RecipientPortalHeader.jsx";
import RecipientPortalToolbar from "./RecipientPortalToolbar.jsx";
import RecipientNoticeFeed from "./RecipientNoticeFeed.jsx";
import RecipientMessagesFeed from "./RecipientMessagesFeed.jsx";
import ParentStaffMessageComposer from "./ParentStaffMessageComposer.jsx";
import RecipientNoticeDialog from "./RecipientNoticeDialog.jsx";

export default function NoticeRecipientPortal() {
  const { user } = useDatabaseSession();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [portalView, setPortalView] = useState("notices");
  const [year, setYear] = useState("All years");
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(null);
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet("/notices");
      setNotices(result.notices || []);
    } catch (e) {
      setError(e.message || "Notices could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    setMessagesLoading(true);
    try {
      const result = await apiGet("/messages");
      setMessages(result.messages || []);
    } catch (e) {
      setError(e.message || "Messages could not be loaded.");
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => { load(); loadMessages(); }, []);

  const years = useMemo(
    () => Array.from(new Set(notices.map(notice => notice.year).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [notices]
  );
  const filtered = useMemo(
    () => notices.filter(notice =>
      (year === "All years" || notice.year === year) &&
      (tab === "All" || notice.type === tab) &&
      (!query || `${notice.message} ${notice.author} ${notice.audience}`.toLowerCase().includes(query.toLowerCase()))
    ),
    [notices, year, tab, query]
  );

  async function openNotice(notice) {
    setOpened(notice);
    setBusyId(notice.id);
    setError("");
    try {
      await apiPost(`/notices/${encodeURIComponent(notice.id)}/views`, {});
      await load();
    } catch (e) {
      if (e.status !== 403 && e.status !== 409) setError(e.message || "Unable to record notice view.");
    } finally {
      setBusyId("");
    }
  }

  async function markMessageRead(message) {
    if (message.readAt) return;
    setBusyId(message.id);
    try {
      const result = await apiPost(`/messages/${encodeURIComponent(message.id)}/read`, {});
      const readAt = result?.message?.readAt || new Date().toISOString();
      setMessages(previous => previous.map(item => item.id === message.id ? { ...item, readAt } : item));
    } catch (e) {
      setError(e.message || "The message could not be marked as read.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="recipient-portal">
      <RecipientPortalHeader schoolName={user?.school?.name || ""} onNotify={setStatus}/>
      <main className="recipient-portal-main">
        <div className="recipient-portal-title">
          <div>
            <span className="db-auth-eyebrow">SCHOOL COMMUNICATION</span>
            <h1>{portalView === "messages" ? "Messages & Fee Reminders" : "Notice Board"}</h1>
            <p>{portalView === "messages" ? (String(user?.role || "").toLowerCase() === "parent" ? "Read messages and fee reminders, and contact staff categories enabled by the school." : "Direct messages and fee reminders sent to your linked account.") : "Notices for your linked account and assigned class or route."}</p>
          </div>
          <div className="recipient-portal-shield"><ShieldCheck size={18}/> Recipient access</div>
        </div>
        {status && <div className="recipient-portal-status" role="status">{status}<button type="button" onClick={() => setStatus("")} aria-label="Dismiss"><X size={14}/></button></div>}
        {error && <div className="db-auth-error"><AlertCircle size={16}/>{error}<button type="button" onClick={() => setError("")}><X size={14}/></button></div>}
        <div className="recipient-portal-view-tabs" role="tablist" aria-label="School communication">
          <button type="button" role="tab" aria-selected={portalView === "notices"} className={portalView === "notices" ? "selected" : ""} onClick={() => setPortalView("notices")}><Newspaper size={15}/> Notice Board</button>
          <button type="button" role="tab" aria-selected={portalView === "messages"} className={portalView === "messages" ? "selected" : ""} onClick={() => { setPortalView("messages"); loadMessages(); }}><Bell size={15}/> Messages &amp; Fee Reminders {messages.some(item => !item.readAt) && <span className="recipient-inbox-count">{messages.filter(item => !item.readAt).length}</span>}</button>
        </div>
        {portalView === "notices" ? (
          <>
            <RecipientPortalToolbar context={{ year, setYear, years, query, setQuery, tab, setTab, notices }}/>
            <RecipientNoticeFeed context={{ loading, filtered, user, busyId, openNotice }}/>
          </>
        ) : (
          <>
            {String(user?.role || "").toLowerCase() === "parent" && <ParentStaffMessageComposer />}
            <RecipientMessagesFeed context={{ messagesLoading, messages, user, busyId, markMessageRead }}/>
          </>
        )}
      </main>
      <RecipientNoticeDialog opened={opened} onClose={() => setOpened(null)}/>
    </div>
  );
}
