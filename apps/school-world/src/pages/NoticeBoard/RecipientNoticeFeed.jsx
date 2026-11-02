import React from "react";
import { Bell, ExternalLink, LoaderCircle, Paperclip } from "lucide-react";
import { downloadAttachment } from "./noticeRecipientUtils.js";

export default function RecipientNoticeFeed({ context }) {
  const { loading, filtered, user, busyId, openNotice } = context;
  return (
    <>
    {loading?<div className="recipient-portal-empty"><LoaderCircle className="db-auth-spin"/> Loading notices…</div>:filtered.length?<div className="recipient-portal-feed">{filtered.map(n=><article key={n.id} className={`recipient-notice recipient-notice-${String(n.type||'news').toLowerCase().replace(/[^a-z]+/g,'-')}`}><div className="recipient-notice-top"><span className="recipient-notice-type">{n.type}</span><span>{n.year}</span></div><p>{n.message}</p><div className="recipient-notice-meta"><span>{n.author||user?.school?.name}</span><span>{n.audience}</span><span>{Number(n.views||0)} views</span></div><div className="recipient-notice-actions"><button onClick={()=>openNotice(n)} disabled={busyId===n.id}>{busyId===n.id?<LoaderCircle size={15} className="db-auth-spin"/>:<ExternalLink size={15}/>} Open notice</button>{(n.attachments||[]).map((f,i)=><button key={`${f.name}-${i}`} onClick={()=>downloadAttachment(f)}><Paperclip size={14}/>{f.name}</button>)}</div></article>)}</div>:<div className="recipient-portal-empty"><Bell size={28}/><strong>No notices found</strong><span>No notices match this year and filter. If you believe a notice is missing, contact school administration.</span></div>}
    </>
  );
}
