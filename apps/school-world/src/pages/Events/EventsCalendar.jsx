import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Check, Users, UserRound, Columns2,
  School, BriefcaseBusiness, PartyPopper, Download, Search, Filter, ListChecks,
  Trash2, Pencil, CalendarCheck2, LoaderCircle, ContactRound, CalendarRange,
  Clock3, ArrowUpRight, TrendingUp
} from "lucide-react";
import { apiGet, apiPut } from "../../api.js";
import { t } from "../../i18n.jsx";

import EventsDialogs from "./EventsDialogs.jsx";
import EventsCalendarView from "./EventsCalendarView.jsx";
import EventsDetailSections from "./EventsDetailSections.jsx";
import { EVENT_TYPES, EVENT_LABELS, EVENT_LABEL_VALUES, WEEKDAYS, localDateKey, todayKey, parseDateKey, normalizeDate, createId, normalizeEvent, dateLabel, monthHeading, includesDate, classLabel, toCsv, eventIcon, eventCssType, typePlural, parentRecipientList, mapStaffRecipients } from "./eventsUtils.js";

export default function EventsCalendar({ students = [], onNotify }) {
  const [events, setEvents] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusDate, setFocusDate] = useState(todayKey());
  const [viewMode, setViewMode] = useState("month"); // Month is the default landing view; Split is opt-in.
  const [formOpen, setFormOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const [recipientPickerType, setRecipientPickerType] = useState("Parent Event");
  const [staffPeople, setStaffPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const [draft, setDraft] = useState(null);
  const [detailEventId, setDetailEventId] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [contactTypeFilter, setContactTypeFilter] = useState("all");
  const [broadcastFormOpen, setBroadcastFormOpen] = useState(false);
  const [broadcastName, setBroadcastName] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [contactFeedback, setContactFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      setLoading(true);
      setLoadError("");
      try {
        const result = await apiGet("/module-data/events");
        const data = result && result.data || {};
        const loadedEvents = Array.isArray(data.events) ? data.events.map((item, index) => normalizeEvent(item, index)) : [];
        const loadedLists = Array.isArray(data.contactLists) ? data.contactLists : [];
        if (!cancelled) {
          setEvents(loadedEvents);
          setContactLists(loadedLists);
        }
      } catch (error) {
        if (!cancelled) setLoadError((error && error.message) || "Events could not be loaded from the school database.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadEvents();
    return () => { cancelled = true; };
  }, []);

  const classOptions = useMemo(() => {
    const fromStudents = (students || []).map(classLabel).filter(Boolean);
    return Array.from(new Set(fromStudents)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);
  const parentRecipients = useMemo(() => parentRecipientList(students), [students]);
  const staffRecipients = useMemo(() => mapStaffRecipients(staffPeople), [staffPeople]);
  const currentRecipients = recipientPickerType === "Parent Event" ? parentRecipients : staffRecipients;
  const visibleRecipients = useMemo(() => {
    const q = contactsSearch.trim().toLowerCase();
    return currentRecipients.filter(person => {
      const values = [person.name, person.email, person.phone, person.alternatePhone, person.designation]
        .concat((person.children || []).flatMap(child => [child.name, child.className, child.scholarNumber]));
      const matchesSearch = !q || values.some(value => String(value || "").toLowerCase().includes(q));
      const matchesType = contactTypeFilter === "all" || String(person.type || "staff") === contactTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [currentRecipients, contactsSearch, contactTypeFilter]);

  const monthCells = useMemo(() => {
    const focused = parseDateKey(focusDate) || new Date();
    const first = new Date(focused.getFullYear(), focused.getMonth(), 1);
    const offset = first.getDay();
    const count = new Date(focused.getFullYear(), focused.getMonth() + 1, 0).getDate();
    const total = Math.ceil((offset + count) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const date = new Date(focused.getFullYear(), focused.getMonth(), index - offset + 1);
      return { date, key: localDateKey(date), inMonth: date.getMonth() === focused.getMonth() };
    });
  }, [focusDate]);

  const eventsForFocusedDay = useMemo(
    () => events.filter(event => includesDate(event, focusDate)).sort((a, b) => a.eventType.localeCompare(b.eventType) || a.description.localeCompare(b.description)),
    [events, focusDate]
  );
  const birthdaysForFocusedDay = useMemo(() => {
    const target = parseDateKey(focusDate);
    if (!target) return [];
    return (students || []).filter(student => {
      const dob = parseDateKey(student.dob || student.dateOfBirth);
      return dob && dob.getMonth() === target.getMonth() && dob.getDate() === target.getDate();
    }).map(student => ({
      id: String(student.id || student.studentCode || student.name),
      name: String(student.name || "Student"),
      className: classLabel(student)
    }));
  }, [students, focusDate]);

  const selectedEvent = events.find(event => event.id === detailEventId) || null;
  const eventCountForMonth = useMemo(() => {
    const focused = parseDateKey(focusDate);
    if (!focused) return 0;
    const monthStart = localDateKey(new Date(focused.getFullYear(), focused.getMonth(), 1));
    const monthEnd = localDateKey(new Date(focused.getFullYear(), focused.getMonth() + 1, 0));
    return events.filter(event => event.startDate <= monthEnd && event.endDate >= monthStart).length;
  }, [events, focusDate]);

  async function persist(nextEvents, nextLists) {
    const lists = nextLists === undefined ? contactLists : nextLists;
    setSaving(true);
    try {
      await apiPut("/module-data/events", { data: { events: nextEvents, contactLists: lists } });
      setEvents(nextEvents);
      setContactLists(lists);
      return true;
    } catch (error) {
      onNotify && onNotify("Event data could not be saved: " + ((error && error.message) || "Please try again."));
      return false;
    } finally { setSaving(false); }
  }

  function openNewEvent(dateKey, labelColor, description) {
    setDetailEventId("");
    // Clear nested pickers from any previous event so they cannot cover the new editor buttons.
    setClassPickerOpen(false);
    setRecipientPickerOpen(false);
    const key = dateKey || focusDate;
    setDraft({
      id: "", eventType: "School Event", isHoliday: false, labelColor: labelColor || "",
      startDate: key, endDate: key, description: description || "", classIds: [], recipientIds: []
    });
    setFormOpen(true);
  }

  function openEditEvent(event) {
    setDetailEventId("");
    // Clear nested pickers from any previous event so they cannot cover the editor buttons.
    setClassPickerOpen(false);
    setRecipientPickerOpen(false);
    setDraft({ ...event, classIds: [...(event.classIds || [])], recipientIds: [...(event.recipientIds || [])] });
    setFormOpen(true);
  }

  async function loadStaffPeople() {
    setPeopleLoading(true);
    setPeopleError("");
    try {
      const result = await apiGet("/people");
      setStaffPeople(Array.isArray(result && result.people) ? result.people : []);
    } catch (error) {
      setPeopleError((error && error.message) || "Staff contacts could not be loaded.");
    } finally { setPeopleLoading(false); }
  }

  function changeEventType(type) {
    setDraft(current => {
      if (!current) return current;
      if (current.eventType === type) return current;
      return {
        ...current,
        eventType: type,
        classIds: type === "Class Event" ? [] : [],
        recipientIds: ["Parent Event", "Staff Event"].includes(type) ? [] : []
      };
    });
    if (type === "Class Event") {
      setRecipientPickerOpen(false);
      setClassPickerOpen(true);
    } else if (type === "Parent Event" || type === "Staff Event") {
      setClassPickerOpen(false);
      setRecipientPickerType(type);
      setContactsSearch("");
      setContactTypeFilter("all");
      setBroadcastFormOpen(false);
      setSelectedListId("");
      setContactFeedback("");
      // Open the contact selector as soon as Parent Event or Staff Event is chosen.
      // The recipient panel is inline in this form and scrolls into view automatically.
      setRecipientPickerOpen(true);
      if (type === "Staff Event" && staffPeople.length === 0) loadStaffPeople();
    } else {
      setClassPickerOpen(false);
      setRecipientPickerOpen(false);
    }
  }

  async function saveEvent() {
    if (!draft) return;
    const description = String(draft.description || "").trim();
    if (!description) { onNotify && onNotify("Enter an event description before creating the event."); return; }
    if (!draft.startDate || !draft.endDate) { onNotify && onNotify("Choose both the start date and end date."); return; }
    if (draft.endDate < draft.startDate) { onNotify && onNotify("End date cannot be earlier than start date."); return; }
    if (draft.eventType === "Class Event" && !(draft.classIds || []).length) { onNotify && onNotify("Choose at least one class for this class event."); setClassPickerOpen(true); return; }
    if (["Parent Event", "Staff Event"].includes(draft.eventType) && !(draft.recipientIds || []).length) { onNotify && onNotify("Choose at least one recipient for this event."); setRecipientPickerOpen(true); return; }
    const record = {
      ...draft, id: draft.id || createId("event"), description,
      classIds: draft.eventType === "Class Event" ? [...(draft.classIds || [])] : [],
      recipientIds: ["Parent Event", "Staff Event"].includes(draft.eventType) ? [...(draft.recipientIds || [])] : [],
      createdAt: draft.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const isEdit = Boolean(draft.id);
    const nextEvents = isEdit ? events.map(event => event.id === record.id ? record : event) : [...events, record];
    if (await persist(nextEvents)) {
      setFocusDate(record.startDate);
      setFormOpen(false); setClassPickerOpen(false); setRecipientPickerOpen(false);
      onNotify && onNotify(isEdit ? "Event updated and saved to the school database." : "Event created and saved to the school database.");
    }
  }

  async function deleteEvent(event) {
    if (!event || !window.confirm("Delete “" + event.description + "” from the school calendar?")) return;
    if (await persist(events.filter(item => item.id !== event.id))) {
      setDetailEventId("");
      onNotify && onNotify("Event deleted from the school calendar.");
    }
  }

  function changeRecipient(recipientId, checked) {
    setDraft(current => {
      if (!current) return current;
      const existing = new Set(current.recipientIds || []);
      if (checked) existing.add(recipientId); else existing.delete(recipientId);
      return { ...current, recipientIds: Array.from(existing) };
    });
  }
  function toggleAllVisibleRecipients() {
    const visibleIds = visibleRecipients.map(person => person.id);
    const selected = new Set((draft && draft.recipientIds) || []);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
    visibleIds.forEach(id => allSelected ? selected.delete(id) : selected.add(id));
    setDraft(current => current ? { ...current, recipientIds: Array.from(selected) } : current);
  }
  async function saveBroadcastList() {
    const name = broadcastName.trim();
    if (!name) { setContactFeedback("Enter a name for this broadcast list."); return; }
    const ids = Array.from(new Set((draft && draft.recipientIds) || []));
    if (!ids.length) { setContactFeedback("Select at least one contact before saving a broadcast list."); return; }
    const list = { id: createId("list"), name, recipientType: recipientPickerType, recipientIds: ids, updatedAt: new Date().toISOString() };
    const nextLists = [...contactLists.filter(item => item.name.toLowerCase() !== name.toLowerCase()), list];
    if (await persist(events, nextLists)) {
      setBroadcastName(""); setBroadcastFormOpen(false); setSelectedListId(list.id);
      setContactFeedback("Broadcast list “" + name + "” saved.");
      onNotify && onNotify("Broadcast list “" + name + "” saved to the school database.");
    }
  }
  function applyBroadcastList() {
    const list = contactLists.find(item => item.id === selectedListId);
    if (!list) return;
    if (list.recipientType && list.recipientType !== recipientPickerType) {
      setContactFeedback("This list is for " + list.recipientType.replace(" Event", "").toLowerCase() + " recipients. Choose a matching event type.");
      return;
    }
    setDraft(current => current ? { ...current, recipientIds: Array.from(new Set(list.recipientIds || [])) } : current);
    setContactFeedback("Applied “" + list.name + "”.");
  }
  function downloadRecipients() {
    const rows = [["Name", "Designation", "Email", "Phone", "Alternate Phone", "Child", "Class", "Scholar Number"]];
    visibleRecipients.forEach(person => {
      if (person.children && person.children.length) {
        person.children.forEach(child => rows.push([person.name, person.designation, person.email, person.phone, person.alternatePhone, child.name, child.className, child.scholarNumber]));
      } else rows.push([person.name, person.designation, person.email, person.phone, person.alternatePhone, "", person.className, ""]);
    });
    toCsv("event-" + recipientPickerType.toLowerCase().replaceAll(" ", "-") + "-contacts.csv", rows);
  }
  async function removeBroadcastList(list) {
    if (!list || !window.confirm("Delete broadcast list “" + list.name + "”?")) return;
    const nextLists = contactLists.filter(item => item.id !== list.id);
    await persist(events, nextLists);
    if (selectedListId === list.id) setSelectedListId("");
  }
  function setDraftField(key, value) {
    setDraft(current => current ? { ...current, [key]: value } : current);
  }
  function changePeriod(direction) {
    const date = parseDateKey(focusDate) || new Date();
    if (viewMode === "day") date.setDate(date.getDate() + direction);
    else {
      const day = date.getDate();
      const next = new Date(date.getFullYear(), date.getMonth() + direction, 1);
      next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      setFocusDate(localDateKey(next));
      return;
    }
    setFocusDate(localDateKey(date));
  }
  const selectedClassNames = classOptions.filter(value => ((draft && draft.classIds) || []).includes(value));
  const selectedRecipientsCount = ((draft && draft.recipientIds) || []).length;
  const today = todayKey();
  const focusedMonth = (parseDateKey(focusDate) || new Date()).getMonth();
  const focusedYear = (parseDateKey(focusDate) || new Date()).getFullYear();
  const sortedEvents = useMemo(() => [...events].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) || a.description.localeCompare(b.description)), [events]);
  const allUpcomingEvents = useMemo(() => sortedEvents.filter(event => event.endDate >= today), [sortedEvents, today]);
  const upcomingCount = allUpcomingEvents.length;
  const holidayEvents = allUpcomingEvents.filter(event => event.isHoliday);
  const upcomingHolidays = holidayEvents.length;
  const birthdaysForMonth = useMemo(() => (students || []).map(student => {
    const dob = parseDateKey(student.dob || student.dateOfBirth);
    return dob && dob.getMonth() === focusedMonth ? { student, dob } : null;
  }).filter(Boolean).sort((a, b) => a.dob.getDate() - b.dob.getDate()), [students, focusedMonth]);
  const birthdaysThisMonth = birthdaysForMonth.length;
  const categoryStats = EVENT_TYPES.map(type => ({
    type,
    count: events.filter(event => event.eventType === type).length,
    colorClass: eventCssType(type)
  }));
  const categoryTotal = categoryStats.reduce((sum, item) => sum + item.count, 0);
  const recentActivity = events
    .filter(event => event.updatedAt || event.createdAt)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
    .slice(0, 4);

  function scrollToDetails(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  return (
    <section className="events-module">
      <div className="events-command-stats" aria-label={t("Event overview")}>
        <button type="button" className="events-command-stat total" onClick={() => scrollToDetails("events-detail-all")} aria-label={t("Show all event details")}>
          <span className="events-command-stat-icon"><CalendarDays size={21}/></span>
          <span className="events-command-stat-copy"><small>{t("Total Events")}</small><strong>{events.length}</strong><span>{t("All saved school events")}</span></span>
          <span className="events-command-stat-trend"><TrendingUp size={16}/></span>
        </button>
        <button type="button" className="events-command-stat upcoming" onClick={() => scrollToDetails("events-detail-upcoming")} aria-label={t("Show upcoming events")}>
          <span className="events-command-stat-icon"><Clock3 size={21}/></span>
          <span className="events-command-stat-copy"><small>{t("Upcoming")}</small><strong>{upcomingCount}</strong><span>{t("Current and future events")}</span></span>
          <span className="events-command-stat-trend"><ArrowUpRight size={16}/></span>
        </button>
        <button type="button" className="events-command-stat holidays" onClick={() => scrollToDetails("events-detail-holidays")} aria-label={t("Show school holidays")}>
          <span className="events-command-stat-icon"><PartyPopper size={21}/></span>
          <span className="events-command-stat-copy"><small>{t("School Holidays")}</small><strong>{upcomingHolidays}</strong><span>{t("Upcoming or ongoing holidays")}</span></span>
          <span className="events-command-stat-trend"><CalendarCheck2 size={16}/></span>
        </button>
        <button type="button" className="events-command-stat birthdays" onClick={() => scrollToDetails("events-detail-birthdays")} aria-label={t("Show birthdays this month")}>
          <span className="events-command-stat-icon"><Users size={21}/></span>
          <span className="events-command-stat-copy"><small>{t("Birthdays This Month")}</small><strong>{birthdaysThisMonth}</strong><span>{t("Student birthdays")}</span></span>
          <span className="events-command-stat-trend"><ArrowUpRight size={16}/></span>
        </button>
      </div>

      <div className="events-page-toolbar command-centre-toolbar">
        <div className="events-month-title">
          <span className="events-page-icon"><CalendarDays size={21} /></span>
          <div><span className="events-command-kicker">{t("SCHOOL ADMINISTRATION")}</span><h2>{t("School Events Command Centre")}</h2><p>{monthHeading(focusDate)} · {eventCountForMonth} {t(eventCountForMonth === 1 ? "event this month" : "events this month")}</p></div>
        </div>
        <div className="events-toolbar-actions">
          <div className="events-period-controls">
            <button type="button" className="events-button events-outline" onClick={() => changePeriod(-1)} aria-label={t("Previous period")}><ChevronLeft size={16}/><span>{t("Prev")}</span></button>
            <button type="button" className="events-button events-today" onClick={() => setFocusDate(todayKey())}>{t("Today")}</button>
            <button type="button" className="events-button events-outline" onClick={() => changePeriod(1)}><span>{t("Next")}</span><ChevronRight size={16}/></button>
          </div>
          <div className="events-view-toggle" role="group" aria-label={t("Calendar view")}>
            <button type="button" className={viewMode === "month" ? "active" : ""} onClick={() => setViewMode("month")}><CalendarRange size={14}/>{t("Month")}</button>
            <button type="button" className={viewMode === "split" ? "active" : ""} onClick={() => setViewMode("split")}><Columns2 size={14}/>{t("Split")}</button>
            <button type="button" className={viewMode === "day" ? "active" : ""} onClick={() => setViewMode("day")}><ListChecks size={14}/>{t("Day")}</button>
          </div>
          <button type="button" className="events-button events-create" onClick={() => openNewEvent(focusDate)}><Plus size={17}/>{t("Add New Event")}</button>
        </div>
      </div>

      {loadError && <div className="events-inline-error"><span>{loadError}</span><button type="button" onClick={() => window.location.reload()}>{t("Retry")}</button></div>}
      <div className="events-command-layout events-command-layout-full-width">
        <div className="events-command-main">
          <EventsCalendarView context={{ loading, monthCells, events, focusDate, setFocusDate, viewMode, setViewMode, openNewEvent, setDetailEventId, includesDate, todayKey, dateLabel, WEEKDAYS, eventIcon, eventCssType, parseDateKey, EVENT_TYPES, typePlural, birthdaysForFocusedDay, eventsForFocusedDay, onNotify }} />
        </div>
      </div>

      <EventsDetailSections context={{ loading, events, sortedEvents, setDetailEventId, recentActivity, eventIcon, normalizeDate, upcomingCount, allUpcomingEvents, openNewEvent, today, categoryTotal, categoryStats, upcomingHolidays, holidayEvents, birthdaysThisMonth, birthdaysForMonth, classLabel }} />

      <div className="events-bottom-summary">
        <span><CalendarCheck2 size={15}/>{t("Saved to the school database")}</span><span>{events.length} {t(events.length === 1 ? "event on record" : "events on record")}</span>
        {saving && <span className="events-saving-state"><LoaderCircle size={14} className="events-spin"/>{t("Saving…")}</span>}
      </div>

      <EventsDialogs context={{ formOpen, draft, classPickerOpen, recipientPickerOpen, setFormOpen, saving, saveEvent, t, EVENT_TYPES, eventIcon, changeEventType, setDraftField, EVENT_LABELS, selectedClassNames, setClassPickerOpen, classOptions, students, recipientPickerType, setRecipientPickerType, staffPeople, loadStaffPeople, selectedRecipientsCount, filterOpen, setFilterOpen, contactsSearch, setContactsSearch, contactTypeFilter, setContactTypeFilter, contactLists, selectedListId, setSelectedListId, applyBroadcastList, removeBroadcastList, contactFeedback, peopleLoading, peopleError, visibleRecipients, toggleAllVisibleRecipients, downloadRecipients, changeRecipient, broadcastFormOpen, setBroadcastFormOpen, broadcastName, setBroadcastName, saveBroadcastList, selectedEvent, setDetailEventId, eventCssType, dateLabel, deleteEvent, openEditEvent }} />
    </section>
  );
}
