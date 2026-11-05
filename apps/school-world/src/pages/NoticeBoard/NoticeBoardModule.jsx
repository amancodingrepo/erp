import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, UsersRound, Bus, ChevronDown, Plus, Paperclip, FileText, X,
  Trash2, Pencil, Check, Download, Eye, MessageCircle, Search, Filter,
  CalendarDays, Bell, AlertCircle, LayoutGrid, List, Newspaper,
} from "lucide-react";
import { useSchoolName } from "../../school-config.js";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { displayName } from "../../components/topbar/topbarNavigation.js";
import { t } from "../../i18n.jsx";
import { apiGet, apiPost, apiPatch, apiDelete, downloadApiFile } from "../../api.js";

import NoticeBoardAudienceSidebar from "./NoticeBoardAudienceSidebar.jsx";
import NoticeBoardSummaryCards from "./NoticeBoardSummaryCards.jsx";
import NoticeComposer from "./NoticeComposer.jsx";
import NoticeFeed from "./NoticeFeed.jsx";
import NoticeOpenDialog from "./NoticeOpenDialog.jsx";
import { currentAcademicYear, defaultClassTargets, normalizeClassName, fileToDataUrl, normalizeRecipient, recipientKey, sameRecipient, isActiveRecipient, enabledFlag, viewRowsFromRecords, downloadCsv, formatNoticeDate } from "./noticeBoardUtils.js";

export default function NoticeBoardModule({ students = [], onNotify }) {
  const schoolName = useSchoolName();
  const sessionUser = useDatabaseSession().user;
  const [notices, setNotices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [noticeDataLoaded, setNoticeDataLoaded] = useState(false);
  const [academicYear, setAcademicYear] = useState(() => currentAcademicYear());
  const [board, setBoard] = useState("school");
  const [expanded, setExpanded] = useState({ school: true, class: false, route: false });
  const [schoolAudience, setSchoolAudience] = useState("__SCHOOL__");
  // No class or route is picked until the school's own lists load (or the user picks one).
  const [classAudience, setClassAudience] = useState("");
  const [routeAudience, setRouteAudience] = useState("");
  const [listSearchDraft, setListSearchDraft] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [postType, setPostType] = useState("News");
  const [enableReply, setEnableReply] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [feedSearch, setFeedSearch] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [routeBeingEdited, setRouteBeingEdited] = useState("");
  const [routeNameEdit, setRouteNameEdit] = useState("");
  const [toast, setToast] = useState("");
  const [openNoticeId, setOpenNoticeId] = useState("");
  const [viewFeedback, setViewFeedback] = useState("");
  const [demoViewerId, setDemoViewerId] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [feedMode, setFeedMode] = useState("all");
  const [feedView, setFeedView] = useState("cards");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadNoticeData() {
      setNoticeDataLoaded(false);
      try {
        const [noticeResult, routeResult] = await Promise.all([apiGet("/notices"), apiGet("/routes")]);
        if (cancelled) return;
        const loadedNotices = Array.isArray(noticeResult.notices) ? noticeResult.notices.map(item => ({ ...item, viewRecords: Array.isArray(item.viewRecords) ? item.viewRecords : [], views: (item.viewRecords || []).length })) : [];
        setNotices(loadedNotices);
        const loadedRoutes = Array.isArray(routeResult.routes) ? routeResult.routes : [];
        setRoutes(loadedRoutes);
        setRouteAudience(current => loadedRoutes.includes(current) ? current : loadedRoutes[0] || "");
      } catch (error) {
        if (!cancelled) notify(`Database connection error: ${error.message}`);
      } finally { if (!cancelled) setNoticeDataLoaded(true); }
    }
    loadNoticeData();
    return () => { cancelled = true; };
  }, [schoolName]);

  const classes = useMemo(() => {
    const generated = defaultClassTargets();
    let configured = [];
    try {
      const configuredRaw = window.SCHOOL_DIARY_CONFIG?.classes ?? window.SCHOOL_DIARY_CONFIG?.classOptions ?? window.__SCHOOL_DIARY_CONFIG__?.classes;
      if (Array.isArray(configuredRaw)) configured = configuredRaw.map(item => typeof item === "string" ? item : item?.className || item?.name || item?.label || "").filter(Boolean).map(normalizeClassName);
    } catch { /* Use generic pre-nursery-to-senior class options. */ }
    const currentStudentClasses = students.map(student => normalizeClassName(student.className)).filter(Boolean);
    return Array.from(new Set([...generated, ...configured, ...currentStudentClasses]));
  }, [students, schoolName]);

  const appConfig = typeof window !== "undefined" ? (window.SCHOOL_DIARY_CONFIG || window.__SCHOOL_DIARY_CONFIG__ || {}) : {};
  const configuredCurrentUser = typeof window !== "undefined" ? (window.SCHOOL_DIARY_CURRENT_USER || appConfig.currentUser || appConfig.loggedInUser || null) : null;
  const configuredRole = String(configuredCurrentUser?.role || configuredCurrentUser?.userType || configuredCurrentUser?.accountType || "").toLowerCase();
  const isAdminSession = ["admin", "principal", "superadmin", "super admin", "schooladmin", "school admin", "branch admin"].includes(configuredRole);
  const demoViewerMode = !configuredCurrentUser || isAdminSession;

  const demoViewerOptions = useMemo(() => {
    const config = typeof window !== "undefined" ? (window.SCHOOL_DIARY_CONFIG || window.__SCHOOL_DIARY_CONFIG__ || {}) : {};
    const rawLists = [config.teachers, config.staff, config.teacherUsers, config.dayCareUsers, config.dayCareRecipients, config.parents, config.users, config.recipients];
    const rawUsers = rawLists.flatMap(list => Array.isArray(list) ? list : []);
    const activeStudentUsers = students.filter(isActiveRecipient);
    const unique = new Map();
    [...activeStudentUsers.map(person => normalizeRecipient(person, "Student")), ...rawUsers.map(person => normalizeRecipient(person))].forEach(person => {
      if (person.userId && person.fullName && !unique.has(person.userId)) unique.set(person.userId, person);
    });
    return Array.from(unique.values());
  }, [students]);

  useEffect(() => {
    if (!demoViewerOptions.some(person => person.userId === String(demoViewerId))) {
      setDemoViewerId(demoViewerOptions[0]?.userId || "");
    }
  }, [demoViewerOptions, demoViewerId]);

  const activeViewer = demoViewerMode
    ? demoViewerOptions.find(person => person.userId === String(demoViewerId)) || null
    : (configuredCurrentUser ? normalizeRecipient(configuredCurrentUser) : null);

  function recipientRecordsForNotice(post) {
    const config = typeof window !== "undefined" ? (window.SCHOOL_DIARY_CONFIG || window.__SCHOOL_DIARY_CONFIG__ || {}) : {};
    const userLists = [config.users, config.recipients, config.parents, config.teachers, config.staff, config.teacherUsers, config.dayCareUsers, config.dayCareRecipients];
    const configuredPeople = userLists.flatMap(list => Array.isArray(list) ? list : []);
    const configuredTeachers = [config.teachers, config.staff, config.teacherUsers]
      .flatMap(list => Array.isArray(list) ? list : [])
      .filter(person => isActiveRecipient(person));
    configuredPeople.forEach(person => {
      const role = String(person.role || person.userType || person.accountType || "").toLowerCase();
      if ((role.includes("teacher") || role.includes("staff")) && isActiveRecipient(person) && !configuredTeachers.some(existing => sameRecipient(normalizeRecipient(existing), normalizeRecipient(person)))) configuredTeachers.push(person);
    });
    const studentRecipients = students.filter(isActiveRecipient);
    const matchesRoute = person => {
      const raw = person?.raw || person;
      const routeValue = raw.routeName || raw.route || raw.busRoute || raw.busNumber || raw.transportRoute || raw.routeId || raw.transport?.routeName || raw.transport?.route || "";
      const routeValues = Array.isArray(raw.routes) ? raw.routes : [routeValue];
      return routeValues.some(value => String(value || "").toLowerCase() === String(post.audience || "").toLowerCase());
    };
    const isDayCarePerson = person => {
      const raw = person?.raw || person;
      return [raw.dayCare, raw.dayCareEnrolled, raw.isDayCare, raw.dayCareUser, raw.dayCareStatus].some(enabledFlag);
    };
    let pool = [];
    if (post.board === "school" && post.audience === "ALL_TEACHERS") {
      pool = configuredTeachers.map(person => normalizeRecipient(person, "Teacher"));
    } else if (post.board === "school" && post.audience === "DAY_CARE") {
      const configuredDayCare = [config.dayCareUsers, config.dayCareRecipients].flatMap(list => Array.isArray(list) ? list : []);
      pool = [...configuredDayCare, ...studentRecipients.filter(isDayCarePerson)].map(person => normalizeRecipient(person, "Day Care User"));
    } else if (post.board === "school" && post.audience === "__SCHOOL__") {
      pool = [...studentRecipients.map(person => normalizeRecipient(person, "Student")), ...configuredPeople.filter(person => /parent|guardian/i.test(String(person.role || person.userType || person.accountType || "")) && isActiveRecipient(person)).map(person => normalizeRecipient(person))];
    } else if (post.board === "class") {
      const targetClass = normalizeClassName(post.audience);
      pool = [
        ...studentRecipients.filter(person => normalizeClassName(person.className || person.class) === targetClass).map(person => normalizeRecipient(person, "Student")),
        ...configuredPeople.filter(person => normalizeClassName(person.className || person.class || person.assignedClass) === targetClass && isActiveRecipient(person)).map(person => normalizeRecipient(person)),
      ];
    } else if (post.board === "route") {
      const map = config.routeRecipients && !Array.isArray(config.routeRecipients) ? config.routeRecipients[post.audience] : null;
      const mapped = Array.isArray(map) ? map : (Array.isArray(config.routeRecipients) ? config.routeRecipients.filter(person => String(person.routeName || person.route || person.busRoute || person.busNumber || "").toLowerCase() === String(post.audience || "").toLowerCase()) : []);
      pool = [...studentRecipients, ...configuredPeople, ...mapped].filter(matchesRoute).map(person => normalizeRecipient(person, person.role || person.userType || "Student"));
    }
    const unique = new Map();
    pool.forEach(person => {
      const key = recipientKey(person);
      if (key && !unique.has(key)) unique.set(key, { ...person, userId: person.userId || key });
    });
    return Array.from(unique.values());
  }

  const years = useMemo(() => {
    const start = Number(currentAcademicYear().slice(0, 4));
    const rolling = Array.from({ length: 7 }, (_, index) => `${start + 2 - index}-${start + 3 - index}`);
    return Array.from(new Set([...rolling, ...notices.map(item => item.year).filter(Boolean), academicYear]))
      .sort((a, b) => Number(b.slice(0, 4)) - Number(a.slice(0, 4)));
  }, [notices, academicYear]);

  const schoolTargets = [
    { value: "ALL_TEACHERS", label: "All Teachers" },
    { value: "__SCHOOL__", label: schoolName },
    { value: "DAY_CARE", label: "Day Care" }
  ];
  const target = board === "school" ? schoolAudience : board === "class" ? classAudience : routeAudience;
  const filterTargets = value => !listSearch || String(value).toLowerCase().includes(listSearch.toLowerCase());
  const yearNotices = useMemo(
    () => notices.filter(item => item.year === academicYear),
    [notices, academicYear]
  );
  const newsCount = useMemo(() => yearNotices.filter(item => item.type === "News").length, [yearNotices]);
  const alertCount = useMemo(() => yearNotices.filter(item => item.type === "Alert").length, [yearNotices]);
  const attachmentNoticeCount = useMemo(() => yearNotices.filter(item => (item.attachments || []).length > 0).length, [yearNotices]);

  const filteredNotices = useMemo(() => {
    const query = feedSearch.trim().toLowerCase();
    return notices
      .filter(item => item.year === academicYear)
      .filter(item => feedMode !== "audience" || (item.board === board && item.audience === target))
      .filter(item => feedMode !== "attachments" || (item.attachments || []).length > 0)
      .filter(item => feedMode !== "news" || item.type === "News")
      .filter(item => activeTab == null || (activeTab === "Alert" ? item.type === "Alert" : item.type !== "Alert"))
      .filter(item => {
        if (!dateFrom && !dateTo) return true;
        const dateValue = new Date(item.createdAt);
        if (Number.isNaN(dateValue.getTime())) return false;
        const day = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
        return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
      })
      .filter(item => !query || `${item.message} ${item.author} ${item.type} ${item.audience} ${(item.attachments || []).map(file => file.name).join(" ")}`.toLowerCase().includes(query))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [notices, academicYear, board, target, activeTab, feedMode, feedSearch, dateFrom, dateTo]);

  function notify(message) {
    setToast(t(message));
    onNotify?.(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function toggleBoard(nextBoard) {
    setBoard(nextBoard);
    setFeedMode("audience");
    setActiveTab(current => current || "News");
    setExpanded(prev => ({ ...prev, [nextBoard]: !prev[nextBoard] }));
    if (nextBoard === "class" && !classAudience && classes.length) setClassAudience(classes[0]);
    if (nextBoard === "route" && !routeAudience && routes.length) setRouteAudience(routes[0]);
  }
  function chooseSchoolTarget(value) { setBoard("school"); setFeedMode("audience"); setActiveTab(current => current || "News"); setExpanded(prev => ({ ...prev, school: true })); setSchoolAudience(value); setFeedSearch(""); }
  function chooseClass(value) { setBoard("class"); setFeedMode("audience"); setActiveTab(current => current || "News"); setExpanded(prev => ({ ...prev, class: true })); setClassAudience(value); setFeedSearch(""); }
  function chooseRoute(value) { setBoard("route"); setFeedMode("audience"); setActiveTab(current => current || "News"); setExpanded(prev => ({ ...prev, route: true })); setRouteAudience(value); setFeedSearch(""); }

  function showAllNotices() { setFeedMode("all"); setActiveTab(null); setFeedSearch(""); }
  function showNews() { setFeedMode("news"); setActiveTab("News"); setFeedSearch(""); }
  function showAlerts() { setFeedMode("all"); setActiveTab("Alert"); setFeedSearch(""); }
  function showNoticesWithAttachments() { setFeedMode("attachments"); setActiveTab(null); setFeedSearch(""); }
  function openComposer() {
    setFeedMode("audience");
    setActiveTab(current => current || "News");
    setComposerOpen(true);
  }

  async function addFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    if (attachments.length + selectedFiles.length > 5) { notify("You can attach up to 5 files to one notice."); return; }
    const totalSize = attachments.reduce((sum, item) => sum + (item.size || 0), 0) + selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 2 * 1024 * 1024) { notify("For this local demo, keep attachments under 2 MB total so they can be saved in the browser."); return; }
    try {
      const loadedFiles = await Promise.all(selectedFiles.map(fileToDataUrl));
      setAttachments(prev => [...prev, ...loadedFiles]);
    } catch { notify("One of the selected files could not be read."); }
  }

  async function publishNotice() {
    if (!draft.trim() && attachments.length === 0) { notify("Enter notice text or attach a file first."); return; }
    if (board === "route" && !routeAudience) { notify("Add or choose a route before publishing."); return; }
    if (board === "class" && !classAudience) { notify("Choose a class before publishing."); return; }
    const entry = {
      year: academicYear, board, audience: target, type: postType, message: draft.trim(),
      // Empty lets the server use the signed-in account's name.
      author: displayName(sessionUser) ? `${displayName(sessionUser)} (from ${schoolName} Notice Board)` : "",
      attachments, allowReply: enableReply
    };
    try {
      const result = await apiPost("/notices", entry);
      const saved = result.notice;
      setNotices(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setDraft(""); setAttachments([]); setEnableReply(false); setFeedSearch("");
      setFeedMode("audience"); setActiveTab(postType === "Alert" ? "Alert" : "News"); setComposerOpen(false);
      notify("Notice saved to the school database and published for the selected academic year and category.");
    } catch (error) { notify(`Notice was not saved: ${error.message}`); }
  }

  async function addRoute() {
    const name = newRoute.trim();
    if (!name) { notify("Enter a bus number or route name."); return; }
    if (routes.some(value => value.toLowerCase() === name.toLowerCase())) { notify("That route already exists."); return; }
    try {
      const result = await apiPost("/routes", { name });
      const savedName = result.route || name;
      setRoutes(prev => prev.includes(savedName) ? prev : [...prev, savedName]);
      setRouteAudience(savedName); setBoard("route"); setExpanded(prev => ({ ...prev, route: true })); setNewRoute("");
      notify("Route added to the school database.");
    } catch (error) { notify(`Route was not saved: ${error.message}`); }
  }
  async function saveRouteName(oldName) {
    const name = routeNameEdit.trim();
    if (!name) { notify("Route name cannot be empty."); return; }
    if (name !== oldName && routes.some(value => value.toLowerCase() === name.toLowerCase())) { notify("That route name already exists."); return; }
    try {
      const result = await apiPatch(`/routes/${encodeURIComponent(oldName)}`, { name });
      setRoutes(prev => prev.map(value => value === oldName ? (result.route || name) : value));
      setNotices(prev => prev.map(item => item.board === "route" && item.audience === oldName ? { ...item, audience: result.route || name } : item));
      if (routeAudience === oldName) setRouteAudience(result.route || name);
      setRouteBeingEdited(""); setRouteNameEdit(""); notify("Route name updated in the school database.");
    } catch (error) { notify(`Route rename failed: ${error.message}`); }
  }
  async function removeRoute(name) {
    const next = routes.filter(value => value !== name);
    try {
      await apiDelete(`/routes/${encodeURIComponent(name)}`);
      setRoutes(next);
      if (routeAudience === name) setRouteAudience(next[0] || "");
      if (!next.length) setBoard("school");
      notify("Route deactivated in the school database. Existing notices are retained.");
    } catch (error) { notify(`Route could not be removed: ${error.message}`); }
  }
  async function exportPost(post, viewsOnly) {
    try {
      await downloadApiFile(`/notices/${encodeURIComponent(post.id)}/report?status=${viewsOnly ? "viewed" : "not-viewed"}`, `notice-${post.id}-${viewsOnly ? "views" : "not-viewed"}.csv`);
      notify(viewsOnly ? "Detailed views report downloaded from the school database." : "Detailed not-viewed report downloaded from the school database.");
    } catch (error) { notify(`Report export failed: ${error.message}`); }
  }

  async function openNotice(post) {
    setOpenNoticeId(post.id);
    setViewFeedback("Checking recipient access and recording the view…");
    try {
      const result = await apiPost(`/notices/${encodeURIComponent(post.id)}/views`, {});
      setViewFeedback(result.alreadyViewed ? "Your account has already viewed this notice. The unique view count is unchanged." : "Your view has been recorded in the school database.");
      const refreshed = await apiGet("/notices");
      setNotices(Array.isArray(refreshed.notices) ? refreshed.notices.map(item => ({ ...item, viewRecords: Array.isArray(item.viewRecords) ? item.viewRecords : [], views: (item.viewRecords || []).length })) : []);
    } catch (error) {
      setViewFeedback(error.message || "The view could not be recorded.");
    }
  }

  const categoryTitle = board === "school" ? "School Notice Board" : board === "class" ? "Class Notice Boards" : "Route Notice Boards";
  const currentTargetLabel = board === "school"
    ? (schoolTargets.find(item => item.value === schoolAudience)?.label || schoolName)
    : board === "class" ? classAudience : routeAudience;

  return <div className="notice-board-page notice-board-dashboard">
    <header className="notice-board-dashboard-header">
      <div className="notice-board-title-group">
        <div className="notice-board-title-mark"><Bell size={21}/></div>
        <div>
          <h1>{t("Notice Board")}</h1>
          <p>{t("School communications and announcements")}</p>
        </div>
      </div>
      <div className="notice-board-header-controls">
        <label className="notice-board-year-control"><span>{t("Academic Year")}</span>
          <select aria-label={t("Filter notices by academic year")} value={academicYear} onChange={event => { setAcademicYear(event.target.value); setFeedSearch(""); }}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <button type="button" className="notice-board-create-button" onClick={openComposer}>
          <Plus size={16}/>{t("Create Notice")}
        </button>
      </div>
    </header>

    <NoticeBoardSummaryCards context={{ feedMode, activeTab, showAllNotices, showNews, showAlerts, showNoticesWithAttachments, yearNotices, newsCount, alertCount, attachmentNoticeCount }} />

    <div className="notice-board-layout">
  <NoticeBoardAudienceSidebar context={{ board, expanded, toggleBoard, schoolTargets, filterTargets, chooseSchoolTarget, classes, schoolAudience, classAudience, chooseClass, routes, routeAudience, routeBeingEdited, routeNameEdit, setRouteNameEdit, saveRouteName, setRouteBeingEdited, removeRoute, newRoute, setNewRoute, addRoute, listSearchDraft, setListSearchDraft, setListSearch, listSearch }} />

      <section className="notice-board-workspace">
        <NoticeComposer context={{ composerOpen, setComposerOpen, draft, setDraft, attachments, setAttachments, fileInput, addFiles, enableReply, setEnableReply, postType, setPostType, publishNotice, categoryTitle, currentTargetLabel, academicYear }} />

        <NoticeFeed context={{ feedMode, categoryTitle, currentTargetLabel, feedView, setFeedView, activeTab, setFeedMode, setActiveTab, feedSearch, setFeedSearch, dateFrom, setDateFrom, dateTo, setDateTo, filteredNotices, noticeDataLoaded, schoolName, openNotice, exportPost, setNotices, notify, openComposer, academicYear }} />
      </section>
    </div>
    <NoticeOpenDialog context={{ openNoticeId, notices, setOpenNoticeId, viewFeedback }} />

    {toast && <div className="notice-board-toast"><AlertCircle size={16}/>{toast}</div>}
  </div>;
}
