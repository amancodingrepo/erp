import React from "react";
import { FileText, Paperclip, Plus, X } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function NoticeComposer({ context }) {
  const { composerOpen, setComposerOpen, draft, setDraft, attachments, setAttachments, fileInput, addFiles, enableReply, setEnableReply, postType, setPostType, publishNotice, categoryTitle, currentTargetLabel, academicYear } = context;
  return (
    composerOpen && <section className="notice-board-composer notice-board-composer-card" aria-label={t("Create notice")}> 
          <div className="notice-board-composer-heading">
            <div><strong>{t("Compose a notice")}</strong><span>{t("Write a message and choose the audience below")}</span></div>
            <button type="button" className="notice-board-close-composer" onClick={() => setComposerOpen(false)} aria-label={t("Close composer")} title={t("Close composer")}><X size={17}/></button>
          </div>
          <div className="notice-board-compose-note"><strong>{t("Note:")}</strong> {t("You can add hashtags in messages.")}</div>
          <textarea className="notice-board-compose-text" value={draft} onChange={event => setDraft(event.target.value)} placeholder={t("Enter your text here.")} aria-label={t("Notice message")}/>
          {attachments.length > 0 && <div className="notice-board-draft-attachments">{attachments.map((file, index) => <div className="notice-board-attachment-chip" key={`${file.name}-${index}`}><FileText size={14}/><span title={file.name}>{file.name}</span><button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} aria-label={`${t("Remove attachment")} ${file.name}`}><X size={13}/></button></div>)}</div>}
          <div className="notice-board-compose-footer">
            <div className="notice-board-compose-tools">
              <label className="notice-board-attach-button" title={t("Attach files")}><Paperclip size={15}/><span>{t("Attach files")}</span><input ref={fileInput} type="file" multiple onChange={addFiles}/></label>
              <label className="notice-board-enable-reply"><input type="checkbox" checked={enableReply} onChange={event => setEnableReply(event.target.checked)}/>{t("Enable Reply")}</label>
            </div>
            <div className="notice-board-publish-tools">
              <select value={postType} onChange={event => setPostType(event.target.value)} aria-label={t("Notice type")}>
                <option value="News">{t("News")}</option>
                <option value="Alert">{t("Alert")}</option>
                <option value="Homework - Worksheet">{t("Homework - Worksheet")}</option>
                <option value="Homework - Assignment">{t("Homework - Assignment")}</option>
              </select>
              <button type="button" className="notice-board-post-button" onClick={publishNotice}>{t("Post")}</button>
            </div>
          </div>
          <div className="notice-board-target-summary">{t("Posting to:")} <strong>{t(categoryTitle)}</strong> · {currentTargetLabel} · {academicYear}</div>
        </section>
  );
}
