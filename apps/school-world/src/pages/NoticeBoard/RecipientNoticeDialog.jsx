import React from "react";
import { Paperclip, X } from "lucide-react";
import { downloadAttachment } from "./noticeRecipientUtils.js";

export default function RecipientNoticeDialog({ opened, onClose }) {
  if (!opened) return null;
  return (
    <div className="recipient-notice-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="recipient-notice-dialog">
        <button className="recipient-notice-close" onClick={onClose} aria-label="Close notice"><X size={18}/></button>
        <span className="recipient-notice-type">{opened.type}</span>
        <h2>{opened.message}</h2>
        <p>{opened.author} · {opened.year}</p>
        {(opened.attachments || []).map((file,index)=><button className="recipient-download" key={`${file.name}-${index}`} onClick={()=>downloadAttachment(file)}><Paperclip size={15}/>{file.name}</button>)}
        <button className="db-auth-submit" onClick={onClose}>Close</button>
      </article>
    </div>
  );
}
