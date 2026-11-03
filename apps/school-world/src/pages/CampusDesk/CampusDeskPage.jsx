import React, { Suspense, useMemo, useState } from "react";
import { CAMPUS_DESK, CAMPUS_DESK_COUNT } from "./campusDeskLinks.js";
import { EXTRA_DESK_ITEMS, NATIVE_COUNT, isNative, nativeComponent } from "../Campus/registry.js";
import "./campus-desk.css";

// Most-used groups first; anything not listed keeps its original order after these.
const GROUP_PRIORITY = [
  "Fees Collection", "Student Information", "Admission", "Attendance", "Academics", "Examinations",
  "Human Resource", "Payroll", "Communicate", "Front Office", "Library", "Transport", "Hostel", "Reports",
];

const DESK = CAMPUS_DESK.map((group) => ({
  ...group,
  items: [...group.items, ...EXTRA_DESK_ITEMS.filter((extra) => extra.group === group.label)],
}));
const DESK_COUNT = CAMPUS_DESK_COUNT + EXTRA_DESK_ITEMS.length;

function prioritised(groups) {
  const rank = (label) => {
    const index = GROUP_PRIORITY.indexOf(label);
    return index === -1 ? GROUP_PRIORITY.length : index;
  };
  return groups
    .map((group, position) => ({ group, position }))
    .sort((a, b) => rank(a.group.label) - rank(b.group.label) || a.position - b.position)
    .map(({ group }) => group);
}

class ScreenBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) {
    if (previous.screenKey !== this.props.screenKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) return <p>This screen could not load. Refresh the page and try again.</p>;
    return this.props.children;
  }
}

function readScreenFromUrl() {
  return new URLSearchParams(window.location.search).get("screen") || "";
}

function writeScreenToUrl(href) {
  const url = new URL(window.location.href);
  if (href) url.searchParams.set("screen", href); else url.searchParams.delete("screen");
  window.history.replaceState(null, "", url);
}

export default function CampusDeskPage() {
  const [query, setQuery] = useState("");
  const [nativeOnly, setNativeOnly] = useState(false);
  const [openHref, setOpenHref] = useState(readScreenFromUrl);
  const needle = query.trim().toLowerCase();

  const ordered = useMemo(() => prioritised(DESK), []);
  const openLabel = useMemo(() => {
    for (const group of DESK) {
      const item = group.items.find((entry) => entry.href === openHref);
      if (item) return item.label;
    }
    return "";
  }, [openHref]);

  const groups = useMemo(() => ordered.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!nativeOnly || isNative(item.href)) && (!needle
      || item.label.toLowerCase().includes(needle)
      || group.label.toLowerCase().includes(needle))),
  })).filter((group) => group.items.length), [ordered, needle, nativeOnly]);

  const visibleCount = groups.reduce((count, group) => count + group.items.length, 0);
  const Native = nativeComponent(openHref);

  function open(href) {
    setOpenHref(href);
    writeScreenToUrl(href);
  }

  return (
    <section className="campus-desk">
      <div className="campus-desk-toolbar">
        <label>
          Search campus screens
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Fees, payroll, hostel, exams"
          />
        </label>
        <label className="campus-desk-toggle">
          <input type="checkbox" checked={nativeOnly} onChange={(event) => setNativeOnly(event.target.checked)} />
          School World screens only
        </label>
        <span>{visibleCount} of {DESK_COUNT} · {NATIVE_COUNT} in School World</span>
      </div>
      <div className="campus-desk-layout">
        <div className="campus-desk-groups">
          {groups.map((group) => {
            const nativeInGroup = group.items.filter((item) => isNative(item.href)).length;
            const holdsOpen = group.items.some((item) => item.href === openHref);
            return (
              <details key={group.label} open={Boolean(needle) || nativeOnly || holdsOpen || group.label === "Fees Collection"}>
                <summary>{group.label}<span>{nativeInGroup ? nativeInGroup + "/" : ""}{group.items.length}</span></summary>
                <div>
                  {group.items.map((item, index) => (
                    <button
                      key={`${group.label}-${item.label}-${item.href}-${index}`}
                      type="button"
                      className={openHref === item.href ? "selected" : ""}
                      onClick={() => open(item.href)}
                    >
                      {item.label}
                      {isNative(item.href) && <i className="campus-desk-dot" title="Runs in School World" />}
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
          {!groups.length && <p className="campus-desk-empty">No screen matches that search.</p>}
        </div>
        <div className="campus-desk-stage">
          {openHref && Native && (
            <div className="campus-desk-native">
              <ScreenBoundary screenKey={openHref}>
                <Suspense fallback={<p>Loading {openLabel || "screen"}...</p>}>
                  <Native key={openHref} />
                </Suspense>
              </ScreenBoundary>
            </div>
          )}
          {openHref && !Native && (
            // Every desk entry has a School World screen; this only shows for an old or mistyped link.
            <p className="campus-desk-classic">This screen is not available. Choose one from the list.</p>
          )}
          {!openHref && <p>Choose a screen from the list.</p>}
        </div>
      </div>
    </section>
  );
}
