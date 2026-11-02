import React, { useEffect, useState } from "react";
import MyBranchNavigation from "./MyBranchNavigation.jsx";
import { myBranchGroups } from "./myBranchConfig.js";
import { getNavigationHref } from "../../navigation.js";

function resolveBranchPage(title) {
  const normalizedTitle = String(title || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (!normalizedTitle) return null;
  return myBranchGroups
    .flatMap(group => group.items)
    .find(item => String(item.title || "").trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalizedTitle)
    ?.Page || null;
}

function initialBranchPageFromUrl() {
  const title = new URLSearchParams(window.location.search).get("branchPage");
  return resolveBranchPage(title);
}

export default function MyBranchModulePage({ onOpenAdmission, onOpenBranchLinkedModule, onRefreshStudents, onBranchPageChange, notify, t, students = [] }) {
  const [selectedBranchPage, setSelectedBranchPage] = useState(() => initialBranchPageFromUrl());

  useEffect(() => {
    function syncBranchPageFromUrl() {
      const title = new URLSearchParams(window.location.search).get("branchPage");
      const resolvedPage = resolveBranchPage(title);
      setSelectedBranchPage(current => current === resolvedPage ? current : resolvedPage);
      onBranchPageChange?.(Boolean(resolvedPage));
    }
    syncBranchPageFromUrl();
    window.addEventListener("popstate", syncBranchPageFromUrl);
    return () => window.removeEventListener("popstate", syncBranchPageFromUrl);
  }, [onBranchPageChange]);

  function openBranchFeature(feature) {
    if (feature.action === "manage-parents-and-children") {
      if (onOpenBranchLinkedModule) {
        onOpenBranchLinkedModule("Manage Parents and Children");
      } else {
        notify?.("Manage Parents and Children is not connected to the student directory.");
      }
      return;
    }
    if (feature.admission) { onOpenAdmission?.(); return; }
    if (feature.module && onOpenBranchLinkedModule) {
      const options = feature.title === "Manage Performance Report Templates" ? { performanceTab: "templates" } : {};
      onOpenBranchLinkedModule(feature.module, options);
      return;
    }
    if (feature.Page) {
      setSelectedBranchPage(() => feature.Page);
      onBranchPageChange?.(true);
      try {
        window.history.replaceState({}, "", getNavigationHref({ module: "My Branch", branchPage: feature.title }));
      } catch {}
      return;
    }
    notify?.(String(feature.title) + " is not configured yet.");
  }

  function returnToBranchDashboard() {
    setSelectedBranchPage(null);
    onBranchPageChange?.(false);
    try { window.history.replaceState({}, "", getNavigationHref({ module: "My Branch" })); } catch {}
  }

  const ActiveBranchPage = selectedBranchPage;
  return ActiveBranchPage
    ? <ActiveBranchPage onBack={returnToBranchDashboard} notify={notify} t={t} students={students} onOpenAdmission={onOpenAdmission} onRefreshStudents={onRefreshStudents} />
    : <MyBranchNavigation onOpenFeature={openBranchFeature} t={t}/>;
}
