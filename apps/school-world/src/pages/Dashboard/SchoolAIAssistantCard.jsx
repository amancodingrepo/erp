import React, { useState } from "react";
import { ArrowUpRight, Copy, Lightbulb, Send, Sparkles } from "lucide-react";
import { t } from "../../i18n.jsx";
import { getNavigationHref, handleNavigationClick } from "../../navigation.js";
import { formatDate, money, studentName } from "./dashboardUtils.js";

export default function SchoolAIAssistantCard({ metrics, available, schoolName, onOpenModule, onNotify }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [assistantUsed, setAssistantUsed] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState("");
  const [draftVisible, setDraftVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  function summarize(userQuestion) {
    const q = String(userQuestion || "").trim().toLowerCase();
    const line1 = schoolName + ": " + metrics.total + " students, " + metrics.active + " active, " + metrics.inactive + " inactive, and " + metrics.defaulters + " fee defaulters.";
    const line2 = available.attendance
      ? (metrics.attendance.length ? "Today's attendance: " + metrics.present + " present/late, " + metrics.absent + " absent, across " + metrics.attendance.length + " recorded entries (" + metrics.attendanceRate + "% present/late)." : "No attendance entries were returned for today.")
      : "Attendance data is currently unavailable.";
    const line3 = available.fees
      ? "There are " + metrics.unpaidFeeRecords + " unpaid or partially paid fee records" + (metrics.unpaidFeeRecords ? ", with a calculated balance of " + money(metrics.feeOutstanding) : "") + "."
      : "Fee data is currently unavailable.";
    const line4 = available.events ? metrics.upcomingEvents.length + " upcoming events appear in the current preview list." : "The events summary is currently unavailable.";
    if (!q || /summary|summari[sz]e|overview|school status|priority|priorities|what should/.test(q)) {
      const nextSteps = [];
      if (metrics.defaulters) nextSteps.push("Review the " + metrics.defaulters + " fee-defaulter records.");
      if (metrics.inactive) nextSteps.push("Verify the " + metrics.inactive + " inactive student records.");
      if (available.attendance && !metrics.attendance.length) nextSteps.push("Record today's attendance.");
      if (metrics.missingContacts) nextSteps.push("Update missing contact numbers in " + metrics.missingContacts + " student records.");
      return [line1, line2, line3, line4, "", "Suggested next steps:", nextSteps.length ? nextSteps.map((item, index) => (index + 1) + ". " + item).join("\n") : "No immediate review item was found by these checks."].join("\n\n");
    }
    if (/fee|defaulter|unpaid|payment|balance|due/.test(q)) return [line1, line3, "", "Suggested next step: open Fees and verify the source records before contacting parents. This assistant does not mark a fee as paid or send reminders."].join("\n");
    if (/attendance|present|absent|roll call/.test(q)) return [line1, line2, "", "Suggested next step: open Attendance to record or verify the current day's data."].join("\n");
    if (/event|birthday|calendar|holiday/.test(q)) {
      const eventLines = metrics.upcomingEvents.length
        ? metrics.upcomingEvents.map(event => "• " + event.description + " — " + formatDate(event.startDate, { day: "numeric", month: "short", year: "numeric" }) + (event.isHoliday ? " (holiday)" : "")).join("\n")
        : "No upcoming events were found in the saved event records.";
      const birthdayLines = metrics.birthdays.length
        ? metrics.birthdays.map(item => "• " + studentName(item.student) + " — " + (item.days === 0 ? "today" : "in " + item.days + " day(s)")).join("\n")
        : "No student birthdays fall in the next 7 days.";
      return "Upcoming events:\n" + eventLines + "\n\nStudent birthdays in the next 7 days:\n" + birthdayLines;
    }
    if (/inactive|active|student|enrol|class|contact/.test(q)) {
      const classLines = metrics.classes.slice(0, 5).map(item => "• " + item.name + ": " + item.total + " total, " + item.active + " active").join("\n") || "No class values were found.";
      return line1 + "\n\nClass overview:\n" + classLines + "\n\n" + metrics.missingContacts + " student records have no contact number in the loaded fields.";
    }
    if (/notice|message|parent|draft|write/.test(q)) {
      setNoticeDraft("Dear Parents,\n\nThis is a school communication from " + schoolName + ". Please review the latest information shared by the school and contact the school office if you need any clarification.\n\nThank you,\n" + schoolName);
      setDraftVisible(true);
      return "I've prepared an editable parent-notice draft below. Please update it with the correct topic, date and details before publishing. It has not been sent or published.";
    }
    return [line1, line2, line3, line4, "", "I can help with student counts, class summaries, fee balances, attendance, events, birthdays, contact-data checks, or a draft parent notice. Verify records before acting."].join("\n\n");
  }

  function ask(userQuestion = question) {
    const q = String(userQuestion || "").trim();
    if (!q) { onNotify?.("Enter a question for the School Assistant first."); return; }
    setQuestion(q);
    setAnswer(summarize(q));
    setAssistantUsed(true);
  }

  function draftParentNotice() {
    setNoticeDraft("Dear Parents,\n\nThis is a reminder from " + schoolName + ". Please check the latest notice shared by the school and contact the school office if you require any clarification.\n\nThank you,\n" + schoolName);
    setDraftVisible(true);
    setQuestion("Draft a parent notice");
    setAnswer("A parent-notice draft is ready to review and edit. It has not been sent or published.");
    setAssistantUsed(true);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(noticeDraft);
      setCopyFeedback("Draft copied.");
    } catch {
      setCopyFeedback("Select the draft text and copy it manually.");
    }
    window.setTimeout(() => setCopyFeedback(""), 2400);
  }

  return (
    <section className="school-dashboard-ai">
      <header><span className="school-dashboard-ai-icon"><Sparkles size={19}/></span><div><h3>{t("School AI Assistant")}</h3><p>{t("Explore summaries and draft school communications.")}</p></div></header>
      <div className="school-dashboard-ai-body">
        <div className="school-dashboard-ai-disclaimer"><Lightbulb size={14}/><span>{t("Smart suggestions use records already loaded in this app. No external AI service is connected and no school records are sent to another service.")}</span></div>
        <div className="school-dashboard-ai-prompts"><button type="button" onClick={() => ask("Summarize school status")}>{t("School summary")}</button><button type="button" onClick={() => ask("Find fee and attendance priorities")}>{t("Priority checks")}</button><button type="button" onClick={draftParentNotice}>{t("Draft parent notice")}</button></div>
        <form className="school-dashboard-ai-form" onSubmit={event => { event.preventDefault(); ask(); }}><label htmlFor="school-ai-question">{t("Ask about your school")}</label><div><input id="school-ai-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={300} placeholder={t("e.g. Summarize fee balances or attendance")}/><button type="submit" aria-label={t("Ask assistant")}><Send size={16}/></button></div></form>
        {assistantUsed && <div className="school-dashboard-ai-answer"><div><Sparkles size={14}/><strong>{t("Assistant response")}</strong></div><p>{answer}</p></div>}
        {draftVisible && <div className="school-dashboard-ai-draft"><label htmlFor="school-ai-notice-draft">{t("Editable parent notice draft")}</label><textarea id="school-ai-notice-draft" value={noticeDraft} onChange={event => setNoticeDraft(event.target.value)} rows={5}/><div><button type="button" className="school-dashboard-copy-draft" onClick={copyDraft}><Copy size={14}/>{t("Copy draft")}</button><a href={getNavigationHref({ module: "Notice Board" })} className="school-dashboard-open-notice" onClick={event => handleNavigationClick(event, () => onOpenModule?.("Notice Board"))}>{t("Open Notice Board")}<ArrowUpRight size={13}/></a></div>{copyFeedback && <small className="school-dashboard-copy-feedback">{t(copyFeedback)}</small>}</div>}
      </div>
    </section>
  );
}
