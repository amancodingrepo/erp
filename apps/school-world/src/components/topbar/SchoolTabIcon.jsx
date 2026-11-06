import { useEffect } from "react";
import { useDatabaseSession } from "../../DatabaseSession.jsx";

const DEFAULT_ICON = "/school-world-icon.svg";
const PRODUCT = "School World";

/** Tab title and icon for the signed-in school: "Main Campus · School World" and its own logo. */
export function tabTitle(user) {
  const school = String(user?.school?.name || "").trim();
  return school ? `${school} · ${PRODUCT}` : PRODUCT;
}

export function tabIcon(user) {
  return user?.school?.logoUrl || DEFAULT_ICON;
}

export default function SchoolTabIcon() {
  const { user } = useDatabaseSession();
  useEffect(() => {
    document.title = tabTitle(user);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const href = tabIcon(user);
    link.type = href === DEFAULT_ICON ? "image/svg+xml" : "";
    link.href = href;
  }, [user?.school?.name, user?.school?.logoUrl]);
  return null;
}
