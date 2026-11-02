import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, MessageCircle, RefreshCw, Send, Users } from "lucide-react";
import { apiGet, apiPost } from "../../api.js";
import "./ParentStaffMessageComposer.css";

export default function ParentStaffMessageComposer() {
  const [staff, setStaff] = useState([]);
  const [recipientPersonId, setRecipientPersonId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRecipients() {
    setLoading(true);
    setError("");
    try {
      const response = await apiGet("/parent/messages/recipients");
      const people = Array.isArray(response?.people) ? response.people : [];
      setStaff(people);
      setRecipientPersonId(current => people.some(person => String(person.personId) === current) ? current : "");
    } catch (requestError) {
      setError(requestError?.message || "Staff recipients could not be loaded.");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRecipients(); }, []);

  async function sendMessage(event) {
    event.preventDefault();
    const messageBody = body.trim();
    if (!recipientPersonId) {
      setError("Choose a staff member from an active, permitted category.");
      return;
    }
    if (!messageBody) {
      setError("Write a message before sending.");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiPost("/parent/messages", { recipientPersonId, body: messageBody });
      setBody("");
      setSuccess(response?.message || "Your message was sent.");
    } catch (requestError) {
      setError(requestError?.message || "Your message could not be sent.");
      await loadRecipients();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="parent-staff-message">
      <header className="psm-heading">
        <div className="psm-icon"><MessageCircle size={18} /></div>
        <div><h2>Contact Staff</h2><p>Choose a staff member from a category enabled by the school.</p></div>
        <button type="button" className="psm-refresh" onClick={() => void loadRecipients()} disabled={loading || sending} aria-label="Refresh available staff" title="Refresh available staff"><RefreshCw size={14} /></button>
      </header>

      {error && <div className="psm-alert error" role="alert"><AlertCircle size={15} /><span>{error}</span></div>}
      {success && !error && <div className="psm-alert success" role="status"><CheckCircle2 size={15} /><span>{success}</span></div>}

      {loading ? (
        <div className="psm-empty"><LoaderCircle size={18} className="psm-spin" /> Loading available staff…</div>
      ) : staff.length ? (
        <form className="psm-form" onSubmit={sendMessage}>
          <label className="psm-field"><span><Users size={14} /> Staff member</span>
            <select value={recipientPersonId} onChange={event => setRecipientPersonId(event.target.value)} required disabled={sending}>
              <option value="">Select a staff member</option>
              {staff.map(person => <option key={person.personId} value={person.personId}>{person.fullName} — {person.categoryName}</option>)}
            </select>
          </label>
          <label className="psm-field"><span>Message</span>
            <textarea value={body} onChange={event => setBody(event.target.value)} rows={3} maxLength={10000} placeholder="Write your message…" disabled={sending} required />
          </label>
          <div className="psm-footer"><span>{body.length}/10,000 characters</span><button type="submit" disabled={sending || !recipientPersonId || !body.trim()}>{sending ? <LoaderCircle size={15} className="psm-spin" /> : <Send size={15} />}{sending ? "Sending…" : "Send Message"}</button></div>
        </form>
      ) : (
        <div className="psm-empty"><Users size={22} /><strong>No staff members are available for parent messages.</strong><span>The school must assign staff to a saved, active category and allow parent messages for that category.</span></div>
      )}
    </section>
  );
}
