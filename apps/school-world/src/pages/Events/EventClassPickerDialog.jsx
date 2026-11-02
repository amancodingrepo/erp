import React from "react";
import { Check, X } from "lucide-react";
import EventDialogShell from "./EventDialogShell.jsx";
import { classLabel } from "./eventsUtils.js";

export default function EventClassPickerDialog({ context }) {
  const {
    classPickerOpen,
    formOpen,
    draft,
    setClassPickerOpen,
    t,
    setDraftField,
    selectedClassNames,
    classOptions,
    students
  } = context;

  const toggleClass = (className, checked) => {
    const next = new Set(draft?.classIds || []);
    if (checked) next.add(className);
    else next.delete(className);
    setDraftField("classIds", Array.from(next));
  };

  const selectAllClasses = () => {
    const allSelected = classOptions.length > 0 &&
      selectedClassNames.length === classOptions.length;
    setDraftField("classIds", allSelected ? [] : [...classOptions]);
  };

  return (
    <EventDialogShell
      open={Boolean(classPickerOpen && formOpen && draft)}
      onClose={() => setClassPickerOpen(false)}
      backdropClassName="events-picker-backdrop"
      modalClassName="events-picker-modal"
      labelledBy="events-class-picker-title"
    >
      <header className="events-picker-header">
        <div>
          <span className="events-modal-kicker">{t("CLASS AUDIENCE")}</span>
          <h2 id="events-class-picker-title">{t("Choose classes")}</h2>
        </div>
        <button
          type="button"
          className="events-icon-close"
          onClick={() => setClassPickerOpen(false)}
          aria-label={t("Close")}
        >
          <X size={17} />
        </button>
      </header>

      <div className="events-picker-hint">
        <span>{t("Select one or more classes for this event.")}</span>
        <button type="button" onClick={selectAllClasses}>
          {selectedClassNames.length === classOptions.length && classOptions.length
            ? t("Clear all")
            : t("Select all")}
        </button>
      </div>

      <div className="events-class-options">
        {classOptions.map((className) => {
          const checked = (draft.classIds || []).includes(className);
          const studentCount = students.filter(
            (student) => classLabel(student) === className
          ).length;

          return (
            <label
              key={className}
              className={[
                "events-class-option",
                checked ? "selected" : ""
              ].filter(Boolean).join(" ")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => toggleClass(className, event.target.checked)}
              />
              <span className="events-checkbox-look"><Check size={13} /></span>
              <strong>{className}</strong>
              <small>{studentCount} {t("students")}</small>
            </label>
          );
        })}

        {classOptions.length === 0 && (
          <div className="events-empty-picker">
            {t("No class options were found in the student records.")}
          </div>
        )}
      </div>

      <footer className="events-picker-footer">
        <span>{selectedClassNames.length} {t("classes selected")}</span>
        <button
          type="button"
          className="events-button events-outline"
          onClick={() => setClassPickerOpen(false)}
        >
          {t("Close")}
        </button>
        <button
          type="button"
          className="events-button events-primary"
          onClick={() => setClassPickerOpen(false)}
        >
          <Check size={15} />
          {t("Save changes")}
        </button>
      </footer>
    </EventDialogShell>
  );
}
