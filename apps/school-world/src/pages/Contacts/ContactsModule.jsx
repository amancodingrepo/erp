import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Ban, Check, CheckCircle2,
  ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  ContactRound, Columns3, Download, GripVertical, LoaderCircle, Mail,
  MoreHorizontal, Pencil, Phone, Plus, RefreshCw, Search, Trash2, UserPlus,
  UserRound, Users, Wallet, X
} from "lucide-react";
import { apiGet, apiPatch, apiPost, apiPut } from "../../api.js";

import ContactsSidebar from "./ContactsSidebar.jsx";
import ContactsFilterActions from "./ContactsFilterActions.jsx";
import ContactsDialogs from "./ContactsDialogs.jsx";
import ContactsResultsTable from "./ContactsResultsTable.jsx";
import ContactsRecordEditPage from "./ContactsRecordEditPage.jsx";
import { csvDownload, classLabel, relativeLastSeen, DEFAULT_CONTACT_COLUMN_ORDER, DEFAULT_CONTACT_COLUMN_WIDTHS, DEFAULT_CONTACT_VISIBLE_COLUMNS, displayGender, matchesGender } from "./contactsUtils.js";

export default function ContactsModule({
  students = [], userRole = "staff", onOpenStudent, onUpdateStudent,
  onRefreshStudents, onNotify
}) {
  const [mode, setMode] = useState("all-contacts");
  const [year, setYear] = useState("2026-2027");
  const [selectedClass, setSelectedClass] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [broadcastLists, setBroadcastLists] = useState([]);
  const [broadcastLoaded, setBroadcastLoaded] = useState(false);
  const [activeBroadcastId, setActiveBroadcastId] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [openActionKey, setOpenActionKey] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [draggingColumnKey, setDraggingColumnKey] = useState("");
  const [columnOrder, setColumnOrder] = useState(DEFAULT_CONTACT_COLUMN_ORDER);
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(DEFAULT_CONTACT_VISIBLE_COLUMNS);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_CONTACT_COLUMN_WIDTHS);
  const [columnWidthInputs, setColumnWidthInputs] = useState({});
  const [modal, setModal] = useState(null);
  const [broadcastName, setBroadcastName] = useState("");
  const [personDraft, setPersonDraft] = useState({});
  const [editingContact, setEditingContact] = useState(null);
  const [contactEditDraft, setContactEditDraft] = useState({});
  const [contactEditError, setContactEditError] = useState("");
  const [contactEditSuccess, setContactEditSuccess] = useState("");
  const [siblingName, setSiblingName] = useState("");
  const [siblingClass, setSiblingClass] = useState("");
  const [siblingSection, setSiblingSection] = useState("");
  const [siblingGender, setSiblingGender] = useState("Not specified");
  const [siblingCode, setSiblingCode] = useState("");
  const [selectedSiblingIds, setSelectedSiblingIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberGender, setMemberGender] = useState("");
  const [memberSelectionKeys, setMemberSelectionKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feeRows, setFeeRows] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [people, setPeople] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");

  function notify(message) {
    setFeedback(message);
    onNotify?.(message);
  }

  useEffect(() => { setPage(1); }, [mode, year, selectedClass, query, gender, activeBroadcastId]);
  useEffect(() => {
    setOpenActionKey("");
    setActionMenuPosition(null);
  }, [mode, query, gender, selectedClass, page]);

  useEffect(() => {
    if (!openActionKey) return undefined;
    const onPointerDown = event => {
      const target = event.target;
      if (target instanceof Element && (target.closest(".contacts-row-actions-trigger") || target.closest(".contacts-row-action-menu-portal"))) return;
      setOpenActionKey("");
      setActionMenuPosition(null);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") {
        setOpenActionKey("");
        setActionMenuPosition(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openActionKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadBroadcasts() {
      try {
        const result = await apiGet("/module-data/contacts");
        const data = result?.data || {};
        const stored = data.broadcastLists;
        const settings = data.tableSettings;
        if (!cancelled) {
          if (Array.isArray(stored)) setBroadcastLists(stored);
          if (settings && typeof settings === "object") {
            const savedOrder = Array.isArray(settings.columnOrder)
              ? settings.columnOrder.filter(key => DEFAULT_CONTACT_COLUMN_ORDER.includes(key))
              : DEFAULT_CONTACT_COLUMN_ORDER;
            setColumnOrder([...new Set(savedOrder.concat(DEFAULT_CONTACT_COLUMN_ORDER))]);
            if (Array.isArray(settings.visibleColumnKeys)) {
              const savedVisible = settings.visibleColumnKeys.filter(key => DEFAULT_CONTACT_VISIBLE_COLUMNS.includes(key));
              setVisibleColumnKeys([...new Set([...savedVisible, "actions"])]);
            }
            if (settings.columnWidths && typeof settings.columnWidths === "object") {
              const sanitized = { ...DEFAULT_CONTACT_COLUMN_WIDTHS };
              for (const key of DEFAULT_CONTACT_VISIBLE_COLUMNS) {
                const width = Number(settings.columnWidths[key]);
                if (Number.isFinite(width)) sanitized[key] = Math.max(60, Math.min(600, width));
              }
              setColumnWidths(sanitized);
            }
            const savedPageSize = Number(settings.pageSize);
            if ([10,25,50,100].includes(savedPageSize)) setPageSize(savedPageSize);
          }
        }
      } catch (e) {
        if (!cancelled) setFeedback("Broadcast lists could not be loaded: " + (e.message || "Please refresh."));
      } finally {
        if (!cancelled) setBroadcastLoaded(true);
      }
    }
    loadBroadcasts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!broadcastLoaded) return undefined;
    const timer = window.setTimeout(() => {
      apiPut("/module-data/contacts", {
        data: {
          broadcastLists,
          tableSettings: { columnOrder, visibleColumnKeys, columnWidths, pageSize }
        }
      }).catch(e => setFeedback("Contacts settings could not be saved: " + (e.message || "Please try again.")));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [broadcastLists, broadcastLoaded, columnOrder, visibleColumnKeys, columnWidths, pageSize]);

  const classOptions = useMemo(() => {
    const unique = new Map();
    for (const student of students) {
      if (!student.className) continue;
      const key = String(student.className).trim() + "|" + String(student.section || "").trim();
      unique.set(key, { key, className: String(student.className).trim(), section: String(student.section || "").trim() });
    }
    return [...unique.values()].sort((a,b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.section.localeCompare(b.section));
  }, [students]);

  const years = useMemo(() => {
    const found = new Set(students.map(s => s.academicYear).filter(Boolean));
    found.add("2026-2027");
    return [...found].sort((a,b) => b.localeCompare(a));
  }, [students]);

  const contactRows = useMemo(() => {
    const studentRows = students.map(student => ({
      key: "student:" + String(student.id),
      kind: "student",
      id: String(student.id),
      name: student.name || "Unnamed student",
      role: "Student",
      className: student.className || "",
      section: student.section || "",
      studentId: String(student.id),
      rollNumber: student.rollNumber || "",
      scholarNumber: student.scholarNumber || student.enrollmentNumber || student.id,
      parentName: student.parent || student.primaryParentName || student.father || "",
      email: student.email || "",
      phone: student.phone || "",
      alternatePhone: student.alternatePhone || "",
      gender: displayGender(student.gender),
      status: student.status || "Active",
      lastSeen: student.lastSeen,
      photoDataUrl: student.photoDataUrl || "",
      raw: student
    }));
    const peopleRows = people
      .filter(person => String(person.personType || "").toLowerCase() !== "student")
      .map(person => ({
        key: "person:" + String(person.id),
        kind: "person",
        id: String(person.id),
        name: person.fullName || [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unnamed contact",
        role: person.personType || "Contact",
        className: person.className || "",
        section: person.section || "",
        studentId: person.externalId || "",
        rollNumber: person.rollNumber || "",
        scholarNumber: person.enrollmentNumber || "",
        parentName: person.parentGuardianName || "",
        email: person.email || "",
        phone: person.contactNumber || "",
        alternatePhone: person.alternateContactNumber || "",
        gender: displayGender(person.gender),
        status: person.status || "Active",
        lastSeen: person.lastSeen,
        photoDataUrl: person.photoDataUrl || "",
        raw: person
      }));
    const linkedIds = new Set(people.map(p => String(p.id)));
    const unlinkedAccounts = accounts
      .filter(account => !account.personId || !linkedIds.has(String(account.personId)))
      .filter(account => ["school_admin", "principal", "teacher", "staff", "transport_admin"].includes(account.role))
      .map(account => ({
        key: "account:" + String(account.id),
        kind: "account",
        id: String(account.id),
        name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.email,
        role: account.role,
        className: "",
        section: "",
        studentId: "",
        rollNumber: "",
        scholarNumber: "",
        parentName: "",
        email: account.email || "",
        phone: "",
        alternatePhone: "",
        gender: "Not Specified",
        status: account.isActive ? "Active" : "Inactive",
        lastSeen: account.lastLoginAt,
        photoDataUrl: "",
        raw: account
      }));
    return [...studentRows, ...peopleRows, ...unlinkedAccounts];
  }, [students, people, accounts]);

  const peopleOnly = useMemo(() => contactRows.filter(row => row.kind !== "student"), [contactRows]);

  function hydrateContactEditor(row) {
    if (!row || row.kind === "student") return;
    setEditingContact(row);
    setContactEditError("");
    setContactEditSuccess("");
    if (row.kind === "account") {
      setContactEditDraft({
        email: row.raw.email || row.email || "",
        role: row.raw.role || row.role || "staff",
        isActive: Boolean(row.raw.isActive)
      });
      return;
    }
    const raw = row.raw || {};
    setContactEditDraft({
      fullName: row.name || "",
      email: row.email || "",
      contactNumber: row.phone || "",
      alternateContactNumber: row.alternatePhone || "",
      dateOfBirth: String(raw.dateOfBirth || raw.date_of_birth || "").slice(0, 10),
      address: raw.address || "",
      city: raw.city || "",
      state: raw.state || "",
      externalId: raw.externalId || raw.external_id || "",
      className: row.className || "",
      section: row.section || "",
      gender: row.gender || "Not Specified",
      status: row.status || "Active"
    });
  }

  function openContactEditor(row) {
    if (!row) return;
    if (row.kind === "student") {
      onOpenStudent?.(row.raw);
      return;
    }
    hydrateContactEditor(row);
    const url = new URL(window.location.href);
    url.searchParams.set("contactEdit", row.key);
    window.history.pushState({ ...(window.history.state || {}), contactEdit: row.key }, "", url);
  }

  function closeContactEditor() {
    setEditingContact(null);
    setContactEditDraft({});
    setContactEditError("");
    setContactEditSuccess("");
    const url = new URL(window.location.href);
    url.searchParams.delete("contactEdit");
    window.history.replaceState(window.history.state, "", url);
  }

  useEffect(() => {
    function syncContactEditRoute() {
      const key = new URLSearchParams(window.location.search).get("contactEdit");
      if (!key) {
        setEditingContact(null);
        setContactEditDraft({});
        setContactEditError("");
        setContactEditSuccess("");
        return;
      }
      const row = contactRows.find(item => item.key === key);
      if (row && row.kind !== "student" && editingContact?.key !== row.key) hydrateContactEditor(row);
    }
    syncContactEditRoute();
    window.addEventListener("popstate", syncContactEditRoute);
    return () => window.removeEventListener("popstate", syncContactEditRoute);
  }, [contactRows]);

  async function saveContactEditor() {
    const row = editingContact;
    if (!row) return;
    setSaving(true);
    setContactEditError("");
    setContactEditSuccess("");
    try {
      if (row.kind === "account") {
        const account = row.raw;
        const nextEmail = String(contactEditDraft.email || "").trim().toLowerCase();
        if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
          throw new Error("Enter a valid email address.");
        }
        if (nextEmail !== String(account.email || "").toLowerCase()) {
          await apiPatch("/users/" + encodeURIComponent(row.id), { email: nextEmail });
        }
        if (contactEditDraft.role !== account.role) {
          await apiPatch("/users/" + encodeURIComponent(row.id), { role: contactEditDraft.role });
        }
        if (Boolean(contactEditDraft.isActive) !== Boolean(account.isActive)) {
          await apiPatch("/users/" + encodeURIComponent(row.id), { isActive: Boolean(contactEditDraft.isActive) });
        }
      } else {
        const fullName = String(contactEditDraft.fullName || "").trim();
        if (!fullName) throw new Error("Full Name is required.");
        await apiPatch("/people/" + encodeURIComponent(row.id), {
          fullName,
          externalId: String(contactEditDraft.externalId || "").trim(),
          email: String(contactEditDraft.email || "").trim(),
          contactNumber: String(contactEditDraft.contactNumber || "").trim(),
          alternateContactNumber: String(contactEditDraft.alternateContactNumber || "").trim(),
          dateOfBirth: contactEditDraft.dateOfBirth || null,
          address: String(contactEditDraft.address || "").trim(),
          city: String(contactEditDraft.city || "").trim(),
          state: String(contactEditDraft.state || "").trim(),
          gender: contactEditDraft.gender || "Not Specified",
          className: String(contactEditDraft.className || "").trim(),
          section: String(contactEditDraft.section || "").trim(),
          status: contactEditDraft.status || "Active"
        });
      }
      await refreshDirectory();
      const success = row.kind === "account" ? "Login account updated." : "Contact details updated.";
      closeContactEditor();
      notify(success);
    } catch (error) {
      setContactEditError(error?.message || "The record could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const visibleBase = useMemo(() => {
    if (mode === "admin-teachers") return peopleOnly.filter(row => ["teacher", "staff", "day_care", "other", "school_admin", "principal", "transport_admin"].includes(String(row.role).toLowerCase()));
    if (mode === "broadcast") {
      const list = broadcastLists.find(item => String(item.id) === String(activeBroadcastId));
      if (!list) return [];
      return contactRows.filter(row => (list.memberIds || []).includes(row.key));
    }
    if (mode === "all-classes") {
      return contactRows.filter(row => row.kind === "student" && (!selectedClass || (row.className + "|" + row.section) === selectedClass));
    }
    if (mode === "all-contacts") {
      return contactRows.filter(row => {
        if (row.kind === "student") return true;
        const role = String(row.role || "").trim().toLowerCase();
        return /teacher|staff|admin/.test(role) || role === "principal";
      });
    }
    return contactRows;
  }, [mode, peopleOnly, broadcastLists, activeBroadcastId, contactRows, selectedClass]);

  const displayedContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleBase.filter(row => {
      if (row.kind === "student" && year && row.raw.academicYear && row.raw.academicYear !== year && mode !== "admin-teachers") return false;
      if (mode !== "admin-teachers" && selectedClass && row.kind === "student" && (row.className + "|" + row.section) !== selectedClass) return false;
      if (gender === "teachers-staff") {
        if (!/teacher|staff/i.test(String(row.role || ""))) return false;
      } else if (!matchesGender(row.gender, gender)) return false;
      if (row.status === "Inactive" && mode !== "all-contacts" && mode !== "broadcast") return false;
      const searchable = [row.name, row.id, row.studentId, row.role, row.className, row.section, row.parentName, row.email, row.phone, row.scholarNumber].join(" ").toLowerCase();
      return !q || searchable.includes(q);
    });
  }, [visibleBase, query, year, selectedClass, gender, mode]);

  const classRows = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classOptions.filter(item => !q || classLabel(item.className, item.section).toLowerCase().includes(q));
  }, [classOptions, classSearch]);

  const selectedDisplayedKeys = displayedContacts.map(row => row.key);
  const allVisibleSelected = displayedContacts.length > 0 && displayedContacts.every(row => selectedKeys.includes(row.key));
  const selectedContacts = contactRows.filter(row => selectedKeys.includes(row.key));
  const activeBroadcast = broadcastLists.find(item => String(item.id) === String(activeBroadcastId));
  const activeBroadcastMemberIds = activeBroadcast?.memberIds || [];
  const broadcastMemberCandidates = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return contactRows.filter(row => {
      if (activeBroadcastMemberIds.includes(row.key)) return false;
      if (!matchesGender(row.gender, memberGender)) return false;
      const searchable = [row.name,row.role,row.studentId,row.className,row.section,row.parentName,row.email,row.phone,row.scholarNumber].join(" ").toLowerCase();
      return !q || searchable.includes(q);
    });
  }, [contactRows, activeBroadcastMemberIds, memberSearch, memberGender]);
  const isBroadcastEmpty = mode === "broadcast" && (!activeBroadcast || !activeBroadcastMemberIds.length);

  async function refreshAll() {
    setFeedback("");
    await refreshDirectory();
    await onRefreshStudents?.();
    notify("Contacts refreshed.");
  }

  async function refreshDirectory() {
    setDirectoryLoading(true);
    setDirectoryError("");
    try {
      const peopleResult = await apiGet("/people");
      const nextPeople = Array.isArray(peopleResult.people) ? peopleResult.people : [];
      let nextAccounts = [];
      if (["school_admin", "principal"].includes(userRole)) {
        const accountResult = await apiGet("/users");
        nextAccounts = Array.isArray(accountResult.users) ? accountResult.users : [];
      }
      setPeople(nextPeople);
      setAccounts(nextAccounts);
    } catch (error) {
      setDirectoryError(error.message || "Contact directory could not be loaded.");
    } finally {
      setDirectoryLoading(false);
    }
  }

  useEffect(() => { refreshDirectory(); }, [userRole]);

  function toggleSelected(key) {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(value => value !== key) : [...prev, key]);
  }
  function toggleAllVisible() {
    setSelectedKeys(prev => allVisibleSelected
      ? prev.filter(key => !selectedDisplayedKeys.includes(key))
      : [...new Set([...prev, ...selectedDisplayedKeys])]);
  }
  function openRowActions(row, event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = row.kind === "student" ? 220 : 105;
    const menuWidth = 194;
    const shouldOpenAbove = rect.bottom + menuHeight + 8 > window.innerHeight;
    const top = shouldOpenAbove ? Math.max(8, rect.top - menuHeight - 5) : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 5);
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    setActionMenuPosition({ top, left, width: menuWidth });
    setOpenActionKey(row.key);
  }
  function moveColumn(columnKey, delta) {
    setColumnOrder(previous => {
      const from = previous.indexOf(columnKey);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= previous.length) return previous;
      const next = previous.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  function dropColumnOn(targetKey) {
    if (!draggingColumnKey || draggingColumnKey === targetKey) return;
    setColumnOrder(previous => {
      const next = previous.filter(key => key !== draggingColumnKey);
      const targetIndex = next.indexOf(targetKey);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggingColumnKey);
      return next;
    });
    setDraggingColumnKey("");
  }
  function openCreateBroadcast() {
    setBroadcastName("");
    setModal({ type: "broadcast-create" });
  }
  function saveBroadcast() {
    const name = broadcastName.trim();
    if (!name) { setFeedback("Enter a name for the broadcast list."); return; }
    const id = "broadcast-" + Date.now().toString(36);
    const memberIds = selectedKeys.slice();
    setBroadcastLists(prev => [...prev, { id, name, memberIds, createdAt: new Date().toISOString() }]);
    setActiveBroadcastId(id);
    setMode("broadcast");
    setSelectedKeys([]);
    setModal(null);
    notify(memberIds.length ? "Broadcast list created with " + memberIds.length + " selected contact(s)." : "Broadcast list created. Select contacts and use Add to list to populate it.");
  }
  function addSelectedToActiveBroadcast() {
    if (!activeBroadcastId) return;
    if (!selectedKeys.length) { setFeedback("Select one or more contacts first."); return; }
    setBroadcastLists(prev => prev.map(item => String(item.id) === String(activeBroadcastId)
      ? { ...item, memberIds: [...new Set([...(item.memberIds || []), ...selectedKeys])] }
      : item));
    setSelectedKeys([]);
    notify("Selected contacts added to " + (activeBroadcast?.name || "the broadcast list") + ".");
  }
  function openAddMembersModal() {
    if (!activeBroadcastId || !activeBroadcast) {
      setFeedback("Select a broadcast list first.");
      return;
    }
    setMemberSearch("");
    setMemberGender("");
    setMemberSelectionKeys([]);
    setModal({ type: "broadcast-members", broadcastId: String(activeBroadcastId) });
  }
  function toggleBroadcastMember(key) {
    setMemberSelectionKeys(previous => previous.includes(key)
      ? previous.filter(value => value !== key)
      : [...previous, key]);
  }
  function saveBroadcastMembers() {
    const targetId = String(modal?.broadcastId || activeBroadcastId);
    if (!targetId) return;
    if (!memberSelectionKeys.length) {
      setFeedback("Select at least one new contact to add to this broadcast list.");
      return;
    }
    setBroadcastLists(previous => previous.map(item => String(item.id) === targetId
      ? { ...item, memberIds: [...new Set([...(item.memberIds || []), ...memberSelectionKeys])] }
      : item));
    const count = memberSelectionKeys.length;
    setMemberSelectionKeys([]);
    setModal(null);
    notify("Added " + count + " contact(s) to " + (broadcastLists.find(item => String(item.id) === targetId)?.name || "the broadcast list") + ".");
  }
  function removeBroadcast(id) {
    const item = broadcastLists.find(row => String(row.id) === String(id));
    if (!item || !window.confirm("Delete broadcast list " + item.name + "?")) return;
    setBroadcastLists(prev => prev.filter(row => String(row.id) !== String(id)));
    setActiveBroadcastId("");
    setMode("broadcast");
    notify("Broadcast list deleted.");
  }

  function openStudentAction(type, row) {
    if (type === "edit") { onOpenStudent?.(row.raw); return; }
    if (type === "fees") {
      setFeeRows([]);
      setFeeError("");
      setModal({ type: "fees", contact: row });
      setFeeLoading(true);
      apiGet("/fees?studentCode=" + encodeURIComponent(row.studentId))
        .then(result => setFeeRows(Array.isArray(result.fees) ? result.fees : []))
        .catch(e => setFeeError(e.message || "Fee details could not be loaded."))
        .finally(() => setFeeLoading(false));
      return;
    }
    if (type === "add-sibling") {
      setSiblingName("");
      setSiblingClass(row.className || "");
      setSiblingSection(row.section || "");
      setSiblingGender("Not specified");
      setSiblingCode("SIB-" + Date.now().toString().slice(-7));
      setModal({ type: "add-sibling", contact: row });
      return;
    }
    if (type === "map-siblings") {
      const raw = row.raw;
      const currentSiblings = Array.isArray(raw.siblings) ? raw.siblings.map(String) : [];
      setSelectedSiblingIds(currentSiblings);
      setModal({ type: "map-siblings", contact: row });
      return;
    }
    if (type === "deactivate") {
      const willDeactivate = row.status !== "Inactive";
      const nextStatus = willDeactivate ? "Inactive" : "Active";
      const nextLabel = willDeactivate ? "deactivate" : "reactivate";
      if (!window.confirm("Are you sure you want to " + nextLabel + " " + row.name + "?")) return;
      onUpdateStudent?.(row.studentId, { status: nextStatus, childId: !willDeactivate })
        .then(saved => { if (saved) notify(willDeactivate ? "Student deactivated." : "Student reactivated."); });
    }
  }

  async function saveSibling() {
    const row = modal?.contact;
    if (!row || !siblingName.trim()) { setFeedback("Enter the sibling's name first."); return; }
    setSaving(true);
    try {
      const result = await apiPost("/students", {
        studentId: siblingCode,
        name: siblingName.trim(),
        className: siblingClass.trim() || row.className,
        section: siblingSection.trim() || row.section,
        academicYear: year || row.raw.academicYear,
        gender: siblingGender,
        parent: row.raw.parent || row.raw.primaryParentName || row.raw.father || "",
        father: row.raw.father || row.raw.parent || "",
        phone: row.raw.phone || "",
        status: "Active"
      });
      const newId = String(result.student?.id || siblingCode);
      const existing = Array.isArray(row.raw.siblings) ? row.raw.siblings.map(String) : [];
      const saved = await onUpdateStudent?.(row.studentId, { siblings: [...new Set([...existing, newId])] });
      if (saved === null) throw new Error("The sibling record was created, but the family link could not be saved.");
      await onRefreshStudents?.();
      setModal(null);
      notify("Sibling student record created with ID " + newId + ".");
    } catch (e) {
      setFeedback("Sibling could not be saved: " + (e.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function saveSiblingMap() {
    const row = modal?.contact;
    if (!row) return;
    setSaving(true);
    try {
      const saved = await onUpdateStudent?.(row.studentId, { siblings: selectedSiblingIds });
      if (!saved) throw new Error("Sibling mapping could not be saved.");
      setModal(null);
      notify("Sibling mapping saved.");
    } catch (e) {
      setFeedback(e.message || "Sibling mapping could not be saved.");
    } finally { setSaving(false); }
  }

  async function savePerson() {
    const row = modal?.contact;
    if (!row) return;
    setSaving(true);
    try {
      await apiPatch("/people/" + encodeURIComponent(row.id), {
        fullName: personDraft.fullName,
        email: personDraft.email,
        contactNumber: personDraft.contactNumber,
        className: personDraft.className,
        section: personDraft.section,
        routeName: personDraft.routeName,
        gender: personDraft.gender,
        status: personDraft.status
      });
      await refreshDirectory();
      setModal(null);
      notify("Contact details updated.");
    } catch (e) {
      setFeedback("Contact details could not be saved: " + (e.message || "Please try again."));
    } finally { setSaving(false); }
  }

  function openPersonEdit(row) {
    openContactEditor(row);
  }

  async function changePersonStatus(row) {
    const next = row.status === "Inactive" ? "Active" : "Inactive";
    if (!window.confirm((next === "Inactive" ? "Deactivate " : "Reactivate ") + row.name + "?")) return;
    try {
      await apiPatch("/people/" + encodeURIComponent(row.id), { status: next });
      await refreshDirectory();
      notify(row.name + " is now " + next.toLowerCase() + ".");
    } catch (e) { setFeedback(e.message || "Contact status could not be updated."); }
  }

  const feeTotal = feeRows.reduce((sum,row) => sum + Number(row.amount || 0), 0);
  const feePaid = feeRows.reduce((sum,row) => sum + Number(row.amountPaid || 0), 0);

  function exportRows(kind) {
    const rows = sortedContacts;
    if (kind === "selected" && !selectedKeys.length) { setFeedback("Select contacts to export first."); return; }
    const data = kind === "selected" ? contactRows.filter(row => selectedKeys.includes(row.key)) : rows;
    csvDownload("school-contacts-" + (mode || "all") + ".csv", [
      ["Name", "Contact Type", "Student ID / External ID", "Class", "Section", "Parent / Guardian", "Email", "Phone", "Gender", "Status"],
      ...data.map(row => [row.name,row.role,row.studentId || row.id,classLabel(row.className,row.section),row.parentName,row.email,row.phone,row.gender,row.status])
    ]);
    setExportOpen(false);
  }

  const tableColumns = [
    {key:"name",label:"Contact",width:250,minWidth:190},
    {key:"type",label:"Type",width:110,minWidth:90},
    {key:"studentId",label:"Student / External ID",width:130,minWidth:60},
    {key:"class",label:"Class / Section",width:135,minWidth:105},
    {key:"parent",label:"Parent / Guardian",width:180,minWidth:135},
    {key:"email",label:"Email",width:220,minWidth:145},
    {key:"phone",label:"Phone",width:135,minWidth:105},
    {key:"gender",label:"Gender",width:110,minWidth:90},
    {key:"status",label:"Status",width:100,minWidth:85},
    {key:"lastSeen",label:"Last Seen",width:145,minWidth:110},
    {key:"actions",label:"Actions",width:86,minWidth:78}
  ];
  const orderedColumnSettings = columnOrder
    .map(key => tableColumns.find(column => column.key === key))
    .filter(Boolean);
  const visibleColumns = [
    ...columnOrder
      .filter(key => visibleColumnKeys.includes(key))
      .map(key => tableColumns.find(column => column.key === key))
      .filter(Boolean),
    tableColumns.find(column => column.key === "actions")
  ].filter(Boolean);
  const sortedContacts = useMemo(() => {
    const getValue = row => ({
      name:row.name,type:row.raw.designation||row.role,studentId:row.studentId,
      class:classLabel(row.className,row.section),parent:row.parentName,
      email:row.email,phone:row.phone,gender:row.gender,status:row.status,lastSeen:row.lastSeen
    })[sortBy];
    return [...displayedContacts].sort((a,b) => {
      const first=getValue(a), second=getValue(b);
      let compare=0;
      if(sortBy==="lastSeen"){
        const firstTime=first?new Date(first).getTime():0, secondTime=second?new Date(second).getTime():0;
        compare=firstTime-secondTime;
      }else compare=String(first??"").localeCompare(String(second??""),undefined,{numeric:true,sensitivity:"base"});
      return sortDirection==="asc"?compare:-compare;
    });
  },[displayedContacts,sortBy,sortDirection]);
  const pageCount = Math.max(1,Math.ceil(sortedContacts.length/pageSize));
  const safePage = Math.min(page,pageCount);
  const pageContacts = sortedContacts.slice((safePage-1)*pageSize,safePage*pageSize);
  const actionMenuContact = sortedContacts.find(row => row.key === openActionKey);
  useEffect(()=>{if(page>pageCount)setPage(pageCount);},[page,pageCount]);

  if (editingContact) {
    return <div className="contacts-page">
      <ContactsRecordEditPage
        contact={editingContact}
        draft={contactEditDraft}
        setDraft={setContactEditDraft}
        onCancel={closeContactEditor}
        onSave={saveContactEditor}
        saving={saving}
        error={contactEditError}
        success={contactEditSuccess}
      />
    </div>;
  }

  return <div className="contacts-page">
    {(directoryError || feedback) && <div className={"contacts-feedback" + (directoryError ? " is-error" : "")}>{directoryError ? <AlertCircle size={15}/> : <CheckCircle2 size={15}/>}<span>{directoryError || feedback}</span><button type="button" onClick={()=>{setFeedback("");}} aria-label="Dismiss"><X size={13}/></button></div>}
    <div className="contacts-two-column">
      <ContactsSidebar context={{ year, setYear, years, showColumnManager, setShowColumnManager, orderedColumnSettings, draggingColumnKey, setDraggingColumnKey, dropColumnOn, visibleColumnKeys, setVisibleColumnKeys, columnWidths, setColumnWidths, setColumnWidthInputs, columnWidthInputs, moveColumn, mode, setMode, activeBroadcastId, setActiveBroadcastId, setSelectedClass, broadcastLists, setSelectedKeys, removeBroadcast, classSearch, setClassSearch, classRows, selectedClass }} />

      <section className="contacts-results">
        <ContactsFilterActions context={{ query, setQuery, gender, setGender, setSelectedKeys, setPage, allVisibleSelected, toggleAllVisible, mode, activeBroadcast, openAddMembersModal, openCreateBroadcast, displayedContacts, exportOpen, setExportOpen, exportRows, refreshAll }} />

        <ContactsResultsTable {...{ directoryLoading, isBroadcastEmpty, activeBroadcast, openAddMembersModal, openCreateBroadcast, displayedContacts, exportOpen, setExportOpen, exportRows, refreshAll, allVisibleSelected, toggleAllVisible, mode, sortedContacts, openActionKey, setOpenActionKey, setActionMenuPosition, visibleColumns, columnWidths, pageContacts, selectedKeys, toggleSelected, openRowActions, onOpenContact: openContactEditor, sortBy, setSortBy, setSortDirection, sortDirection, classLabel, relativeLastSeen, safePage, pageSize, setPageSize, setPage, pageCount }} />
      </section>
    </div>

    <ContactsDialogs context={{ actionMenuContact, actionMenuPosition, openActionKey, setOpenActionKey, setActionMenuPosition, openStudentAction, openPersonEdit, changePersonStatus, modal, setModal, activeBroadcast, memberSearch, setMemberSearch, memberGender, setMemberGender, broadcastMemberCandidates, memberSelectionKeys, toggleBroadcastMember, saveBroadcastMembers, saving, broadcastName, setBroadcastName, selectedKeys, saveBroadcast, personDraft, setPersonDraft, savePerson, siblingCode, setSiblingCode, siblingName, setSiblingName, year, setYear, years, siblingClass, setSiblingClass, siblingSection, setSiblingSection, siblingGender, setSiblingGender, students, selectedSiblingIds, setSelectedSiblingIds, saveSiblingMap, feeLoading, feeError, feeRows, feeTotal, feePaid, csvDownload, classLabel }} />
  </div>;
}
