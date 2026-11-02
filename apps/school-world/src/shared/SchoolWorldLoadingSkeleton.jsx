import React from "react";

function SkeletonBlock({ className = "", style }) {
  return <span aria-hidden="true" className={`sw-skeleton-block ${className}`} style={style} />;
}

function SessionSkeleton({ label }) {
  return (
    <div className="sw-skeleton-session-screen" role="status" aria-live="polite" aria-label={label}>
      <div className="sw-skeleton-session-brand">
        <SkeletonBlock className="sw-skeleton-session-mark" />
        <div className="sw-skeleton-session-brand-lines">
          <SkeletonBlock className="sw-skeleton-session-title" />
          <SkeletonBlock className="sw-skeleton-session-caption" />
        </div>
      </div>
      <div className="sw-skeleton-session-panel">
        <SkeletonBlock className="sw-skeleton-session-panel-title" />
        <SkeletonBlock className="sw-skeleton-session-panel-copy" />
        <SkeletonBlock className="sw-skeleton-session-panel-field" />
        <SkeletonBlock className="sw-skeleton-session-panel-field" />
        <SkeletonBlock className="sw-skeleton-session-panel-button" />
      </div>
      <p className="sw-skeleton-status-label">{label}</p>
    </div>
  );
}

export default function SchoolWorldLoadingSkeleton({
  mode = "workspace",
  label = "Loading your school workspace"
}) {
  if (mode === "session") return <SessionSkeleton label={label} />;

  return (
    <div className="sw-skeleton-page" role="status" aria-live="polite" aria-label={label}>
      <header className="sw-skeleton-topbar">
        <div className="sw-skeleton-brand">
          <SkeletonBlock className="sw-skeleton-brand-mark" />
          <SkeletonBlock className="sw-skeleton-brand-name" />
        </div>
        <div className="sw-skeleton-topbar-actions">
          <SkeletonBlock className="sw-skeleton-action-wide" />
          <SkeletonBlock className="sw-skeleton-action-short" />
          <SkeletonBlock className="sw-skeleton-avatar" />
        </div>
      </header>

      <div className="sw-skeleton-layout">
        <aside className="sw-skeleton-sidebar" aria-hidden="true">
          <div className="sw-skeleton-school-card">
            <SkeletonBlock className="sw-skeleton-school-mark" />
            <SkeletonBlock className="sw-skeleton-school-name" />
            <SkeletonBlock className="sw-skeleton-school-caption" />
          </div>
          <nav className="sw-skeleton-nav">
            {Array.from({ length: 8 }, (_, index) => (
              <div className={`sw-skeleton-nav-item${index === 0 ? " is-selected" : ""}`} key={index}>
                <SkeletonBlock className="sw-skeleton-nav-icon" />
                <SkeletonBlock className="sw-skeleton-nav-label" style={{ width: `${52 + (index % 3) * 16}%` }} />
              </div>
            ))}
          </nav>
          <SkeletonBlock className="sw-skeleton-sidebar-footer" />
        </aside>

        <main className="sw-skeleton-main">
          <div className="sw-skeleton-page-heading">
            <div className="sw-skeleton-heading-lines">
              <SkeletonBlock className="sw-skeleton-eyebrow" />
              <SkeletonBlock className="sw-skeleton-heading" />
              <SkeletonBlock className="sw-skeleton-subheading" />
            </div>
            <SkeletonBlock className="sw-skeleton-heading-button" />
          </div>

          <section className="sw-skeleton-metrics" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="sw-skeleton-metric-card" key={index}>
                <SkeletonBlock className="sw-skeleton-metric-icon" />
                <div className="sw-skeleton-metric-lines">
                  <SkeletonBlock className="sw-skeleton-metric-label" />
                  <SkeletonBlock className="sw-skeleton-metric-value" />
                </div>
              </div>
            ))}
          </section>

          <section className="sw-skeleton-content-card" aria-hidden="true">
            <div className="sw-skeleton-toolbar">
              <SkeletonBlock className="sw-skeleton-toolbar-field" />
              <SkeletonBlock className="sw-skeleton-toolbar-field" />
              <SkeletonBlock className="sw-skeleton-toolbar-search" />
              <SkeletonBlock className="sw-skeleton-toolbar-button" />
            </div>
            <div className="sw-skeleton-table">
              <div className="sw-skeleton-table-row sw-skeleton-table-head">
                {["22%", "20%", "18%", "17%", "12%"].map((width, index) => (
                  <SkeletonBlock key={index} className="sw-skeleton-table-cell" style={{ width }} />
                ))}
              </div>
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <div className="sw-skeleton-table-row" key={rowIndex}>
                  {["68%", "78%", "58%", "71%", "44%"].map((width, cellIndex) => (
                    <SkeletonBlock
                      key={cellIndex}
                      className={`sw-skeleton-table-cell${cellIndex === 0 ? " sw-skeleton-table-primary" : ""}`}
                      style={{ width: rowIndex % 2 === 0 ? width : `calc(${width} - 8%)` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
          <p className="sw-skeleton-status-label">{label}</p>
        </main>
      </div>
    </div>
  );
}
