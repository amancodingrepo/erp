import { getNavigationHref } from "../../navigation.js";

/**
 * Move to a School World module (or a Campus desk screen) without reloading: push the URL and fire
 * popstate, which main.jsx already listens to. Campus desk only reads its screen from the URL when
 * it mounts, so a desk-to-desk jump reloads instead.
 */
export function goTo(target) {
  const params = new URLSearchParams();
  if (target.module) params.set("module", target.module);
  if (target.screen) params.set("screen", target.screen);
  const href = target.screen ? "?" + params.toString() : getNavigationHref({ module: target.module });
  const current = new URLSearchParams(window.location.search);
  if (target.module === "Campus desk" && current.get("module") === "Campus desk") {
    window.location.assign(href);
    return;
  }
  window.history.pushState({ schoolWorldNavigation: target }, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const isManager = (user) => ["school_admin", "principal"].includes(String(user?.role || ""));

export const ROLE_LABELS = {
  school_admin: "School admin",
  principal: "Principal",
  teacher: "Teacher",
  staff: "Staff",
  transport_admin: "Transport admin",
  parent: "Parent",
  student: "Student",
};

export function displayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "";
}

export function initials(text) {
  const words = String(text || "").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (words.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
}
