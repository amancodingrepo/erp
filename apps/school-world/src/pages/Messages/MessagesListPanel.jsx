import React from "react";
import { CheckCircle2, ChevronDown, Download, FileText, Inbox, LoaderCircle, Mail, MessageCircle, Paperclip, Search, Send, Trash2, X } from "lucide-react";

export default function MessagesListPanel({ context }) {
  const { folder, setFolder, filter, setFilter, moreOpen, setMoreOpen, loadMessages, canSend, loadRecipients, visibleMessages, loading, expanded, toggleExpanded, formatWhen, timeAgo, removeMessage } = context;
  return (<section className="messages-list-panel">
      <div className="messages-list-toolbar">
        <div className="messages-folder-tabs" role="tablist" aria-label="Message folder">
          <button type="button" role="tab" aria-selected={folder==="inbox"} className={folder==="inbox" ? "active" : ""} onClick={()=>setFolder("inbox")}><Inbox size={14}/>Inbox</button>
          <button type="button" role="tab" aria-selected={folder==="sent"} className={folder==="sent" ? "active" : ""} onClick={()=>setFolder("sent")}><Send size={14}/>Sent</button>
        </div>
        <div className="messages-search-tools">
          <label><span>Filter</span><input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Start typing to filter list..."/></label>
          <button type="button" title="Search messages" aria-label="Search messages"><Search size={16}/></button>
          <button type="button" title="Clear filter" aria-label="Clear filter" onClick={()=>setFilter("")}><X size={15}/></button>
        </div>
        <div className="messages-more-wrap">
          <button type="button" className="messages-more-button" onClick={()=>setMoreOpen(value=>!value)}>More <ChevronDown size={13}/></button>
          {moreOpen && <div className="messages-more-menu"><button type="button" onClick={()=>{setMoreOpen(false);loadMessages(folder);}}>Refresh messages</button><button type="button" onClick={()=>{setMoreOpen(false);setFilter("");}}>Clear filter</button>{canSend && <button type="button" onClick={()=>{setMoreOpen(false);loadRecipients(true);}}>Refresh contacts</button>}</div>}
        </div>
      </div>
      <div className="messages-list-caption">{folder==="inbox" ? "Inbox messages" : "Messages you posted"} · {visibleMessages.length} {visibleMessages.length===1 ? "message" : "messages"}</div>
      <div className="messages-list-body">
        {loading ? <div className="messages-empty"><LoaderCircle size={20} className="messages-spin"/>Loading messages…</div> :
          visibleMessages.length ? visibleMessages.map(message => {
            const isScheduled = message.status === "scheduled";
            const recipients = Array.isArray(message.recipients) ? message.recipients : [];
            const title = folder === "inbox" ? ((message.senderName || "School contact") + (message.senderChildInfo ? " (" + message.senderChildInfo + ")" : "") + " to me") : ("To: " + recipients.join(", "));
            return <article key={message.id} className={"messages-row" + (folder==="inbox" && !message.readAt ? " unread" : "")}>
              <div className="messages-row-top"><span className="messages-row-recipient">{title}</span><span className={"messages-time-badge" + (isScheduled ? " scheduled" : "")}>{isScheduled ? "Scheduled · " + formatWhen(message.scheduledAt) : timeAgo(message.sentAt)}</span></div>
              <div className="messages-row-summary"><MessageCircle size={13}/><span>{message.subject && message.subject !== "Message from School World" ? message.subject + " — " : ""}{String(message.body || ((message.attachments||[]).length ? "Attachment" : "")).replace(/\s+/g," ").trim()}</span><button type="button" onClick={()=>toggleExpanded(message)}>{expanded[message.id] ? "view less" : "view more"}</button></div>
              {expanded[message.id] && <div className="messages-row-expanded"><div>{message.body || "File attachment"}</div>{(message.attachments||[]).map(file=><a key={file.id} href={file.downloadUrl} download><Paperclip size={13}/>{file.name}<Download size={12}/></a>)}{message.status==="scheduled" && <small>Scheduled for {formatWhen(message.scheduledAt)}. Recipients will see it after that time.</small>}</div>}
              <div className="messages-row-footer">{(message.attachments||[]).length>0 && <span><Paperclip size={12}/>{message.attachments.length} attachment(s)</span>}<button type="button" onClick={()=>removeMessage(message)}><Trash2 size={12}/>Delete</button></div>
            </article>;
          }) : <div className="messages-empty"><MessageCircle size={24}/><strong>{folder==="inbox" ? "Your inbox is empty" : "No sent messages yet"}</strong><span>{folder==="inbox" ? "Messages addressed to this account will appear here." : "Messages you post will appear here, including scheduled messages."}</span></div>}
      </div>
    </section>);
}
