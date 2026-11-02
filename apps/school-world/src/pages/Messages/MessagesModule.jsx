import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download,
  FileText, Inbox, LoaderCircle, Mail, MessageCircle, MoreHorizontal,
  Paperclip, Search, Send, Trash2, Users, X
} from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../../api.js";

import MessagesComposer from "./MessagesComposer.jsx";
import MessagesListPanel from "./MessagesListPanel.jsx";
import MessagesDialogs from "./MessagesDialogs.jsx";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, localDateTimeValue, formatWhen, timeAgo, fileAsDataUrl } from "./messageUtils.js";

export default function MessagesModule({ userRole = "staff", onNotify }) {
  const canSend = ["school_admin", "principal", "staff"].includes(userRole);
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [contacts, setContacts] = useState([]);
  const [broadcastLists, setBroadcastLists] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [broadcastList, setBroadcastList] = useState("");
  const [recipientTab, setRecipientTab] = useState("contacts");
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDraft, setUploadDraft] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  function notify(message) {
    setFeedback(message);
    setError("");
    onNotify?.(message);
  }

  async function loadMessages(targetFolder = folder) {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet("/messages?folder=" + encodeURIComponent(targetFolder));
      setMessages(Array.isArray(result.messages) ? result.messages : []);
    } catch (e) {
      setError(e.message || "Messages could not be loaded.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipients(force = false) {
    if (contacts.length && !force) return;
    setContactsLoading(true);
    setError("");
    try {
      const result = await apiGet("/messages/recipients");
      setContacts(Array.isArray(result.people) ? result.people : []);
      setBroadcastLists(Array.isArray(result.broadcastLists) ? result.broadcastLists : []);
    } catch (e) {
      setError(e.message || "Recipient contacts could not be loaded.");
    } finally {
      setContactsLoading(false);
    }
  }

  useEffect(() => { loadMessages(folder); }, [folder]);
  useEffect(() => { if (canSend) loadRecipients(); }, [canSend]);

  const selectedContacts = useMemo(
    () => contacts.filter(person => selectedPersonIds.includes(person.personId)),
    [contacts, selectedPersonIds]
  );
  const filteredContacts = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return contacts.filter(person => !q || [
      person.fullName, person.personType, person.accountRoles, person.contactNumber,
      person.email, person.childNames, person.childClasses, person.className, person.section, person.status
    ].some(value => String(value || "").toLowerCase().includes(q)));
  }, [contacts, recipientSearch]);
  const visibleMessages = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return messages.filter(message => !q || [
      message.senderName, message.subject, message.body,
      ...(Array.isArray(message.recipients) ? message.recipients : [])
    ].some(value => String(value || "").toLowerCase().includes(q)));
  }, [messages, filter]);

  function toggleContact(personId) {
    setBroadcastList("");
    setSelectedPersonIds(previous => previous.includes(personId)
      ? previous.filter(id => id !== personId)
      : [...previous, personId]);
  }
  function chooseBroadcast(key) {
    setSelectedPersonIds([]);
    setBroadcastList(key);
  }
  function openRecipientModal() {
    setRecipientTab("contacts");
    setRecipientSearch("");
    setRecipientModalOpen(true);
    loadRecipients();
  }
  async function addFiles(filesToAdd) {
    const files = Array.from(filesToAdd || []);
    if (!files.length) return;
    try {
      const newFiles = await Promise.all(files.map(fileAsDataUrl));
      const combined = [...attachments, ...uploadDraft, ...newFiles];
      if (combined.length > MAX_ATTACHMENTS) throw new Error("Choose up to 5 files in total.");
      if (combined.reduce((sum, file) => sum + Number(file.size || 0), 0) > MAX_ATTACHMENT_BYTES) throw new Error("Attachments must total 5 MB or less.");
      setUploadDraft(previous => [...previous, ...newFiles]);
      setError("");
    } catch (e) {
      setError(e.message || "Files could not be attached.");
    }
  }
  async function onChooseFiles(event) {
    const input = event.currentTarget;
    await addFiles(input.files);
    input.value = "";
  }
  function saveUploadDraft() {
    const combined = [...attachments, ...uploadDraft];
    if (combined.length > MAX_ATTACHMENTS || combined.reduce((sum, file) => sum + Number(file.size || 0), 0) > MAX_ATTACHMENT_BYTES) {
      setError("Attachments are limited to 5 files and 5 MB total.");
      return;
    }
    setAttachments(combined);
    setUploadDraft([]);
    setUploadModalOpen(false);
    setError("");
  }
  function openScheduleModal() {
    setScheduleDraft(scheduledAt || localDateTimeValue(new Date(Date.now() + 5 * 60000)));
    setScheduleModalOpen(true);
  }
  function saveScheduleDraft() {
    const timestamp = new Date(scheduleDraft).getTime();
    if (!scheduleDraft || Number.isNaN(timestamp) || timestamp <= Date.now()) {
      setError("Choose a future date and time for the message.");
      return;
    }
    setScheduledAt(scheduleDraft);
    setScheduleModalOpen(false);
    setError("");
    setFeedback("Message scheduled for " + formatWhen(new Date(scheduleDraft).toISOString()) + ".");
  }
  function clearSchedule() {
    setScheduledAt("");
    setScheduleDraft("");
    setScheduleModalOpen(false);
  }

  async function postMessage() {
    if (posting) return;
    if (!body.trim() && !attachments.length) {
      setError("Write a quick message or attach a file before posting.");
      return;
    }
    if (!selectedPersonIds.length && !broadcastList) {
      setError("Choose contacts or a broadcast list before posting.");
      setRecipientModalOpen(true);
      loadRecipients();
      return;
    }
    setPosting(true);
    setError("");
    try {
      const result = await apiPost("/messages", {
        body: body.trim(),
        recipientPersonIds: selectedPersonIds,
        broadcastList,
        scheduleAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        attachments: attachments.map(file => ({ name: file.name, type: file.type, dataUrl: file.dataUrl }))
      });
      setBody("");
      setAttachments([]);
      setUploadDraft([]);
      setScheduledAt("");
      setScheduleDraft("");
      setSelectedPersonIds([]);
      setBroadcastList("");
      const wasAlreadySentFolder = folder === "sent";
      setFolder("sent");
      if (wasAlreadySentFolder) await loadMessages("sent");
      notify(result.message || "Message posted.");
    } catch (e) {
      setError(e.message || "Message could not be posted.");
    } finally {
      setPosting(false);
    }
  }

  async function removeMessage(message) {
    const label = folder === "sent" ? "this sent message for all its recipients" : "this message from your inbox";
    if (!window.confirm("Delete " + label + "?")) return;
    try {
      await apiDelete("/messages/" + encodeURIComponent(message.id));
      setMessages(previous => previous.filter(item => item.id !== message.id));
      notify("Message deleted.");
    } catch (e) {
      setError(e.message || "Message could not be deleted.");
    }
  }

  async function toggleExpanded(message) {
    const opening = !expanded[message.id];
    setExpanded(previous => ({ ...previous, [message.id]: opening }));
    if (opening && folder === "inbox" && !message.readAt) {
      try {
        await apiPost("/messages/" + encodeURIComponent(message.id) + "/read", {});
        setMessages(previous => previous.map(item => item.id === message.id ? { ...item, readAt: new Date().toISOString() } : item));
      } catch (e) {
        if (e.status !== 404) setError(e.message || "Message could not be marked as read.");
      }
    }
  }

  const chosenList = broadcastLists.find(item => item.key === broadcastList);
  const canPost = Boolean(body.trim() || attachments.length) && Boolean(selectedPersonIds.length || broadcastList) && !posting;

  return <div className="messages-page">
    <MessagesComposer context={{ scheduledAt, clearSchedule, formatWhen, body, setBody, attachments, setAttachments, setUploadDraft, setUploadModalOpen, openScheduleModal, selectedPersonIds, broadcastList, openRecipientModal, selectedContacts, chosenList, postMessage, posting }} />

    {error && <div className="messages-alert messages-alert-error"><AlertCircle size={15}/><span>{error}</span><button type="button" onClick={()=>setError("")} aria-label="Dismiss error"><X size={13}/></button></div>}
    {feedback && !error && <div className="messages-alert messages-alert-success"><CheckCircle2 size={15}/><span>{feedback}</span><button type="button" onClick={()=>setFeedback("")} aria-label="Dismiss message"><X size={13}/></button></div>}

    <MessagesListPanel context={{ folder, setFolder, filter, setFilter, moreOpen, setMoreOpen, loadMessages, canSend, loadRecipients, visibleMessages, loading, expanded, toggleExpanded, formatWhen, timeAgo, removeMessage }} />

    <MessagesDialogs context={{ uploadModalOpen, setUploadModalOpen, addFiles, onChooseFiles, uploadDraft, setUploadDraft, saveUploadDraft, scheduleModalOpen, setScheduleModalOpen, scheduleDraft, setScheduleDraft, saveScheduleDraft, localDateTimeValue, recipientModalOpen, setRecipientModalOpen, selectedContacts, chosenList, recipientSearch, setRecipientSearch, recipientTab, setRecipientTab, contactsLoading, contacts, selectedPersonIds, setSelectedPersonIds, filteredContacts, toggleContact, broadcastLists, broadcastList, chooseBroadcast }} />
  </div>;
}
