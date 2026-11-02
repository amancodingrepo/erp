import React from "react";
import { AlertCircle, Bell, Download, Eye, FileText, LayoutGrid, List, MessageCircle, Plus, Search, Trash2, X } from "lucide-react";
import { apiDelete } from "../../api.js";
import { t } from "../../i18n.jsx";
import { formatNoticeDate, viewRowsFromRecords } from "./noticeBoardUtils.js";

export default function NoticeFeed({ context }) {
  const { feedMode, categoryTitle, currentTargetLabel, feedView, setFeedView, activeTab, setFeedMode, setActiveTab, feedSearch, setFeedSearch, dateFrom, setDateFrom, dateTo, setDateTo, filteredNotices, noticeDataLoaded, schoolName, openNotice, exportPost, setNotices, notify, openComposer, academicYear } = context;
  return (
    <section className="notice-board-feed-panel">
          <div className="notice-board-feed-panel-heading">
            <div><h2>{t("Notice feed")}</h2><p>{feedMode === "audience" ? `${t(categoryTitle)} / ${currentTargetLabel}` : feedMode === "attachments" ? t("Notices with attachments") : feedMode === "news" ? t("News notices") : t("All notice categories")}</p></div>
            <div className="notice-board-feed-view-switch" role="group" aria-label={t("Notice display style")}>
              <button type="button" className={feedView === "cards" ? "active" : ""} aria-pressed={feedView === "cards"} onClick={() => setFeedView("cards")} title={t("Card view")}><LayoutGrid size={15}/><span>{t("Cards")}</span></button>
              <button type="button" className={feedView === "list" ? "active" : ""} aria-pressed={feedView === "list"} onClick={() => setFeedView("list")} title={t("List view")}><List size={15}/><span>{t("List")}</span></button>
            </div>
          </div>
          <div className="notice-board-feed-toolbar">
            <div className="notice-board-feed-tabs" role="tablist" aria-label={t("Notice type tabs")}>
              {["News", "Alert"].map(tab => {
                const isTabActive = activeTab === tab || (feedMode === "news" && tab === "News");
                return <button role="tab" aria-selected={isTabActive} type="button" key={tab} className={isTabActive ? "active" : ""} onClick={() => { setFeedMode("all"); setActiveTab(tab); }}>{t(tab)}</button>;
              })}
              {activeTab == null && <span className="notice-board-all-types-label">{t("All types")}</span>}
            </div>
            <form className="notice-board-feed-search" onSubmit={event => event.preventDefault()}>
              <label className="notice-board-search-input"><Search size={15}/><input value={feedSearch} onChange={event => setFeedSearch(event.target.value)} placeholder={t("Search notices...")} aria-label={t("Search notices")}/>{feedSearch && <button type="button" title={t("Clear search")} onClick={() => setFeedSearch("")}><X size={14}/></button>}</label>
            </form>
          </div>
          <div className="notice-board-date-filters">
            <label><span>{t("From")}</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => setDateFrom(event.target.value)}/></label>
            <label><span>{t("To")}</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={event => setDateTo(event.target.value)}/></label>
            {(dateFrom || dateTo || feedSearch) && <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setFeedSearch(""); }}>{t("Clear filters")}</button>}
            <span className="notice-board-results-count">{filteredNotices.length} {t("notices shown")}</span>
          </div>
          <div className="notice-board-feed-context"><span>{academicYear}</span><span>{t("Year-specific results")}</span></div>
          <div className={`notice-board-feed ${feedView === "cards" ? "cards-view" : "list-view"}`}>
            {!noticeDataLoaded && <div className="notice-board-empty"><Bell size={26}/><strong>{t("Loading notices")}</strong><span>{t("Connecting to the school database…")}</span></div>}
            {noticeDataLoaded && filteredNotices.map(post => <article className={`notice-board-post ${post.type === "Alert" ? "tone-alert" : post.type === "Homework - Worksheet" ? "tone-worksheet" : post.type === "Homework - Assignment" ? "tone-assignment" : "tone-news"}${feedView === "list" ? " compact" : ""}`} key={post.id}>
              <div className="notice-board-post-author">{post.author || `School Office (from ${schoolName} Notice Board)`}</div>
              <div className="notice-board-post-meta"><span className={`notice-board-type-badge${post.type === "Alert" ? " alert" : post.type.startsWith("Homework") ? " homework" : ""}`}>{t(post.type)}</span><time>{formatNoticeDate(post.createdAt)}</time></div>
              {post.message && <div className="notice-board-post-message">{post.message}</div>}
              {post.attachments?.length > 0 && <div className="notice-board-post-attachments">{post.attachments.map((file, index) => <div className="notice-board-post-attachment" key={`${file.name}-${index}`}>
                {file.type?.startsWith("image/") && (file.dataUrl || file.downloadUrl) ? <a className="notice-board-image-attachment" href={file.dataUrl || file.downloadUrl} target="_blank" rel="noreferrer"><img src={file.dataUrl || file.downloadUrl} alt={file.name}/><span>{file.name}</span></a> : <a className="notice-board-file-attachment" href={file.dataUrl || file.downloadUrl || undefined} download={file.name}><FileText size={17}/><span>{file.name}</span><Download size={14}/></a>}
              </div>)}</div>}
              <div className="notice-board-post-footer">
                <span className="notice-board-post-reply">{post.allowReply ? <><MessageCircle size={12}/>{t("Replies enabled")}</> : t("Replies disabled")}</span>
                <div className="notice-board-post-actions">
                  <span><Eye size={13}/>{viewRowsFromRecords(post.viewRecords).length} {t("Views")}</span>
                  <button type="button" onClick={() => openNotice(post)}><Eye size={12}/>{t("Open Notice")}</button>
                  <button type="button" onClick={() => exportPost(post, true)}>{t("Export Views")}</button>
                  <button type="button" onClick={() => exportPost(post, false)}>{t("Export Not Viewed")}</button>
                  <button type="button" className="delete" onClick={async () => { if (window.confirm(t("Delete this notice from the school database?"))) { try { await apiDelete(`/notices/${encodeURIComponent(post.id)}`); setNotices(prev => prev.filter(item => item.id !== post.id)); notify("Notice deleted from the school database."); } catch (error) { notify(`Notice could not be deleted: ${error.message}`); } } }}><Trash2 size={12}/>{t("Delete")}</button>
                </div>
              </div>
            </article>)}
            {noticeDataLoaded && filteredNotices.length === 0 && <div className="notice-board-empty"><Bell size={26}/><strong>{t("No notices found")}</strong><span>{t("There are no notices for this year, category, and tab. Change the year or category, or create a notice above.")}</span><button type="button" className="notice-board-empty-create" onClick={openComposer}><Plus size={14}/>{t("Create Notice")}</button></div>}
          </div>
          <div className="notice-board-footer-note">{t("Notices, routes and view events are saved in the school database.")}</div>
        </section>
  );
}
