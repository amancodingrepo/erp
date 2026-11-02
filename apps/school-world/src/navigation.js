const KNOWN_MODULES = new Set([
  "Dashboard", "Notice Board", "Events", "Messages", "My Branch", "Contacts", "Fees",
  "Attendance", "Attendance Dashboard", "Day Care", "Search Users", "Performance Report",
  "Reports", "Transport", "Questionnaires", "Manage Store", "Store Vendor",
  "Admission/Enquiry Form", "Campus desk",
  "Departments", "Programs", "Sessions", "Timetable", "Exams", "Fee Masters",
  "Collect Fee", "Staff Directory", "Users", "Roles", "Promotion", "Campus Settings"
]);

export function getNavigationHref(target = {}) {
  const params = new URLSearchParams();
  if (target.view) params.set("view", target.view);
  if (target.module) params.set("module", target.module);
  if (target.parent) params.set("parent", target.parent);
  if (target.branchPage) params.set("branchPage", target.branchPage);
  if (target.performanceTab) params.set("performanceTab", target.performanceTab);
  if (target.dueThroughToday) params.set("dueThroughToday", "true");
  if (target.studentId) params.set("studentId", target.studentId);
  return window.location.pathname + (params.size ? "?" + params.toString() : "");
}

export function getModuleNavigationTarget(moduleName, options = {}) {
  if (["Manage Students", "Manage Parents and Children"].includes(moduleName)) {
    return { view: "manage", module: "My Branch" };
  }
  return { module: moduleName, ...(options.parent ? { parent: options.parent } : {}), ...(options.performanceTab ? { performanceTab: options.performanceTab } : {}) };
}

export function handleNavigationClick(event, navigate) {
  // Keep browser-native Ctrl/Cmd/Shift/Alt click and middle-click behavior.
  // These must be allowed through so the anchor can open in a separate tab/window.
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate?.();
}

export function readUrlNavigation() {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");
  const requestedModule = params.get("module");
  const parent = params.get("parent");
  const branchPage = params.get("branchPage");
  const studentId = params.get("studentId");

  if (requestedView === "manage" || ["Manage Students", "Manage Parents and Children"].includes(requestedModule)) {
    return { currentView: "manage", activeSidebarModule: "My Branch", moduleParentView: null, fromUrl: true };
  }
  if (requestedView === "admission") {
    return {
      currentView: "admission",
      activeSidebarModule: "Admission/Enquiry Form",
      moduleParentView: null,
      ...(studentId ? { editingStudentId: studentId } : {}),
      fromUrl: true
    };
  }
  if (requestedView === "edit" && studentId) {
    return { currentView: "edit", activeSidebarModule: parent || "My Branch", moduleParentView: null, editingStudentId: studentId, fromUrl: true };
  }
  if (requestedModule && KNOWN_MODULES.has(requestedModule)) {
    return {
      currentView: "module",
      activeSidebarModule: requestedModule,
      moduleParentView: parent === "My Branch" ? "My Branch" : null,
      branchPage: branchPage || null,
      dueThroughToday: params.get("dueThroughToday") === "true",
      fromUrl: true
    };
  }
  return null;
}
