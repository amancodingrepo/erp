import React, { useMemo, useState } from "react";
import { CAMPUS_DESK, CAMPUS_DESK_COUNT } from "./campusDeskLinks.js";
import "./campus-desk.css";

export default function CampusDeskPage() {
  const [query, setQuery] = useState("");
  const [openHref, setOpenHref] = useState("");
  const [openLabel, setOpenLabel] = useState("");
  const needle = query.trim().toLowerCase();

  const groups = useMemo(() => CAMPUS_DESK.map((group) => ({
    ...group,
    items: group.items.filter((item) => !needle
      || item.label.toLowerCase().includes(needle)
      || group.label.toLowerCase().includes(needle)),
  })).filter((group) => group.items.length), [needle]);

  const visibleCount = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <section className="campus-desk">
      <div className="campus-desk-toolbar">
        <label>
          Search campus screens
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="NAAC, payroll, hostel, exams"
          />
        </label>
        <span>{visibleCount} of {CAMPUS_DESK_COUNT}</span>
      </div>
      <div className="campus-desk-layout">
        <div className="campus-desk-groups">
          {groups.map((group) => (
            <details key={group.label} open={Boolean(needle) || group.label === "NAAC"}>
              <summary>{group.label}<span>{group.items.length}</span></summary>
              <div>
                {group.items.map((item) => (
                  <button
                    key={`${group.label}-${item.label}-${item.href}`}
                    type="button"
                    className={openHref === item.href && openLabel === item.label ? "selected" : ""}
                    onClick={() => { setOpenHref(item.href); setOpenLabel(item.label); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
          ))}
          {!groups.length && <p className="campus-desk-empty">No screen matches that search.</p>}
        </div>
        <div className="campus-desk-stage">
          {openHref
            ? <iframe title={openLabel} src={openHref} />
            : <p>Choose a screen from the previous campus desk. It opens here, inside School World, and uses the backend that is already live.</p>}
        </div>
      </div>
    </section>
  );
}
