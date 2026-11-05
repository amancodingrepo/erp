import React, { useState } from "react";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { useSchoolName } from "../../school-config.js";
import { initials } from "./topbarNavigation.js";
import "./topbar.css";

/**
 * The signed-in school's logo from its own settings, or its initials and name when it has none.
 * Each school sees only its own logo; nothing here is specific to one school.
 */
export default function SchoolLogo() {
  const session = useDatabaseSession();
  const schoolName = useSchoolName();
  const logoUrl = session.user?.school?.logoUrl || "";
  const [broken, setBroken] = useState("");
  const name = session.user?.school?.name || schoolName;
  if (logoUrl && broken !== logoUrl) {
    return <div className="sw-school-logo"><img src={logoUrl} alt={name ? name + " logo" : "School logo"} onError={() => setBroken(logoUrl)} /></div>;
  }
  return (
    <div className="sw-school-logo">
      <span className="sw-school-logo-fallback" aria-hidden="true">{initials(name)}</span>
      {name && <strong>{name}</strong>}
    </div>
  );
}
