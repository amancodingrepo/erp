import React from "react";
import { AlertCircle, FileText, Newspaper, Paperclip } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function NoticeBoardSummaryCards({ context }) {
  const { feedMode, activeTab, showAllNotices, showNews, showAlerts, showNoticesWithAttachments, yearNotices, newsCount, alertCount, attachmentNoticeCount } = context;
  return (
    <section className="notice-board-summary-grid" aria-label={t("Notice summary cards")}>
      <button type="button" className={`notice-board-summary-card total${feedMode === "all" && activeTab == null ? " chosen" : ""}`} onClick={showAllNotices} aria-pressed={feedMode === "all" && activeTab == null}>
        <span className="notice-board-summary-icon"><FileText size={19}/></span>
        <span className="notice-board-summary-copy"><span>{t("Total Notices")}</span><strong>{yearNotices.length}</strong></span>
      </button>
      <button type="button" className={`notice-board-summary-card news${feedMode === "news" ? " chosen" : ""}`} onClick={showNews} aria-pressed={feedMode === "news"}>
        <span className="notice-board-summary-icon"><Newspaper size={19}/></span>
        <span className="notice-board-summary-copy"><span>{t("News")}</span><strong>{newsCount}</strong></span>
      </button>
      <button type="button" className={`notice-board-summary-card alerts${feedMode === "all" && activeTab === "Alert" ? " chosen" : ""}`} onClick={showAlerts} aria-pressed={feedMode === "all" && activeTab === "Alert"}>
        <span className="notice-board-summary-icon"><AlertCircle size={19}/></span>
        <span className="notice-board-summary-copy"><span>{t("Alerts")}</span><strong>{alertCount}</strong></span>
      </button>
      <button type="button" className={`notice-board-summary-card attachments${feedMode === "attachments" ? " chosen" : ""}`} onClick={showNoticesWithAttachments} aria-pressed={feedMode === "attachments"}>
        <span className="notice-board-summary-icon"><Paperclip size={19}/></span>
        <span className="notice-board-summary-copy"><span>{t("With Attachments")}</span><strong>{attachmentNoticeCount}</strong></span>
      </button>
    </section>
  );
}
