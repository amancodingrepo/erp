import React, { useEffect, useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { useDatabaseSession } from "./DatabaseSession.jsx";

const THEME_STORAGE_KEY = "schoolDiary.appTheme.v1";

const APP_THEMES = [
  { id: "blue", label: "Ocean Blue", description: "Classic and professional", swatch: "#2563eb", soft: "#eaf2ff" },
  { id: "emerald", label: "Emerald", description: "Fresh green and teal", swatch: "#0f8a70", soft: "#e2f8f1" },
  { id: "violet", label: "Royal Violet", description: "Purple with cool accents", swatch: "#7c3aed", soft: "#f1eaff" },
  { id: "sunset", label: "Sunset", description: "Warm coral and amber", swatch: "#c4512d", soft: "#fff0e7" },
  { id: "dark", label: "Midnight", description: "Dark surfaces with bright accents", swatch: "#60a5fa", soft: "#233a57" }
];

function getSavedTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return APP_THEMES.some((theme) => theme.id === saved) ? saved : "blue";
  } catch {
    return "blue";
  }
}

export default function AppThemeControl() {
  const { user, loading } = useDatabaseSession();
  const [theme, setTheme] = useState(getSavedTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.sdTheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The current selection still applies for this session if storage is blocked.
    }
  }, [theme]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (loading || !user) return null;

  const activeTheme = APP_THEMES.find((item) => item.id === theme) || APP_THEMES[0];

  return (
    <div className="app-theme-control">
      {open && (
        <section className="app-theme-popover" role="dialog" aria-label="Choose app colour theme">
          <header className="app-theme-popover-header">
            <div>
              <strong>App appearance</strong>
              <p>Choose colours for the whole app.</p>
            </div>
            <button type="button" className="app-theme-close" onClick={() => setOpen(false)} aria-label="Close appearance settings">
              <X size={16} />
            </button>
          </header>
          <div className="app-theme-options" role="group" aria-label="Colour themes">
            {APP_THEMES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`app-theme-option${theme === option.id ? " selected" : ""}`}
                onClick={() => setTheme(option.id)}
                aria-pressed={theme === option.id}
              >
                <span className="app-theme-swatch" style={{ "--theme-swatch": option.swatch, "--theme-swatch-soft": option.soft }}>
                  {theme === option.id && <Check size={15} />}
                </span>
                <span className="app-theme-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {theme === option.id && <Check className="app-theme-option-check" size={16} />}
              </button>
            ))}
          </div>
          <footer className="app-theme-popover-footer">
            <span className="app-theme-current-dot" style={{ background: activeTheme.swatch }} />
            {activeTheme.label} · saved on this browser
          </footer>
        </section>
      )}
      <button
        type="button"
        className={`app-theme-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Change app colour theme"
        title="Change app colour theme"
      >
        <Palette size={18} />
      </button>
    </div>
  );
}
