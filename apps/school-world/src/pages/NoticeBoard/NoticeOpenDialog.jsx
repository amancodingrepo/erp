import React from "react";
import { AlertCircle, Download, Eye, FileText, X } from "lucide-react";
import { t } from "../../i18n.jsx";
import { formatNoticeDate, viewRowsFromRecords } from "./noticeBoardUtils.js";

export default function NoticeOpenDialog({ context }) {
  const { openNoticeId, notices, setOpenNoticeId, viewFeedback } = context;
  return (
    openNoticeId && notices.some(item => item.id === openNoticeId) && (() => {
      const post = notices.find(item => item.id === openNoticeId);
      return <div className="notice-board-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpenNoticeId(""); }}>
        <section className="notice-board-open-dialog" role="dialog" aria-modal="true" aria-labelledby="notice-board-open-title">
          <header><div><span className={`notice-board-type-badge${post.type === "Alert" ? " alert" : post.type.startsWith("Homework") ? " homework" : ""}`}>{t(post.type)}</span><h2 id="notice-board-open-title">{t("Notice details")}</h2></div><button type="button" className="notice-board-close-composer" aria-label={t("Close")} onClick={() => setOpenNoticeId("")}><X size={18}/></button></header>
          <div className="notice-board-open-meta"><strong>{post.author}</strong><span>{formatNoticeDate(post.createdAt)}</span><span>{post.year}</span></div>
          <div className="notice-board-open-message">{post.message || t("No message text was added.")}</div>
          {post.attachments?.length > 0 && <div className="notice-board-open-attachments"><strong>{t("Attachments")}</strong>{post.attachments.map((file, index) => <a key={`${file.name}-${index}`} href={file.dataUrl || file.downloadUrl || undefined} download={file.name} target={file.type?.startsWith("image/") ? "_blank" : undefined} rel="noreferrer"><FileText size={15}/>{file.name}<Download size={13}/></a>)}</div>}
          <div className={`notice-board-view-feedback${viewFeedback.startsWith("Not recorded") || viewFeedback.startsWith("No recipient") ? " warning" : ""}`}><Eye size={15}/><span>{viewFeedback || t("Opening a notice records one view for the selected eligible recipient.")}</span></div>
          <footer><span>{viewRowsFromRecords(post.viewRecords).length} {t("unique views recorded")}</span><button type="button" className="notice-board-post-button" onClick={() => setOpenNoticeId("")}>{t("Close")}</button></footer>
        </section>
      </div>;
    })()
  );
}
