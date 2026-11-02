import React from "react";
import { CalendarDays, FileText, LoaderCircle, Mail, Paperclip, Send, Users, X, Clock3 } from "lucide-react";
import { formatWhen } from "./messageUtils.js";

export default function MessagesComposer({ context }) {
  const { scheduledAt, clearSchedule, formatWhen, body, setBody, attachments, setAttachments, setUploadDraft, setUploadModalOpen, openScheduleModal, selectedPersonIds, broadcastList, openRecipientModal, selectedContacts, chosenList, postMessage, posting } = context;
  return (<section className="messages-composer">
      <div className="messages-composer-heading"><Mail size={16}/><h2>Post Quick Message</h2>{scheduledAt && <span className="messages-schedule-chip"><Clock3 size={12}/>Scheduled: {formatWhen(new Date(scheduledAt).toISOString())}<button type="button" onClick={clearSchedule} aria-label="Remove schedule"><X size={12}/></button></span>}</div>
      <textarea className="messages-composer-text" value={body} onChange={event => setBody(event.target.value)} rows={3} aria-label="Quick message text" placeholder="Write a quick message..."/>
      {attachments.length > 0 && <div className="messages-attachment-strip">{attachments.map((file,index)=><span key={file.name + index}><Paperclip size={13}/>{file.name}<button type="button" aria-label={"Remove " + file.name} onClick={()=>setAttachments(previous=>previous.filter((_,i)=>i!==index))}><X size={12}/></button></span>)}</div>}
      <div className="messages-composer-toolbar">
        <div className="messages-toolbar-icons">
          <button type="button" title="Upload file" aria-label="Upload file" onClick={()=>{setUploadDraft([]);setUploadModalOpen(true);}}><FileText size={16}/></button>
          <button type="button" title="Choose a schedule" aria-label="Choose a schedule" className={scheduledAt ? "selected" : ""} onClick={openScheduleModal}><CalendarDays size={16}/></button>
          <button type="button" title="Choose recipients" aria-label="Choose recipients" className={selectedPersonIds.length || broadcastList ? "selected" : ""} onClick={openRecipientModal}><Users size={16}/></button>
        </div>
        <div className="messages-composer-recipient-status">
          {selectedContacts.length > 0 ? selectedContacts.map(person=>person.fullName).join(", ") : chosenList ? chosenList.label : "No recipients selected"}
        </div>
        <button type="button" className="messages-post-button" onClick={postMessage} disabled={posting}>{posting ? <LoaderCircle size={14} className="messages-spin"/> : <Send size={14}/>} {scheduledAt ? "Schedule" : "Post"}</button>
      </div>
    </section>);
}
