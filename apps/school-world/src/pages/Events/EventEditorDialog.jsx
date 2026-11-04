import React from "react";
import { Check, ChevronRight, ContactRound, LoaderCircle, Users, X } from "lucide-react";
import EventDialogShell from "./EventDialogShell.jsx";
import { EVENT_TYPES, EVENT_LABELS, eventIcon } from "./eventsUtils.js";

export default function EventEditorDialog({ context }) {
  const {
    formOpen,
    draft,
    setFormOpen,
    saving,
    saveEvent,
    t,
    changeEventType,
    setDraftField,
    selectedClassNames,
    setClassPickerOpen,
    setRecipientPickerType,
    setRecipientPickerOpen,
    staffPeople,
    loadStaffPeople,
    selectedRecipientsCount
  } = context;

  const closeForm = () => {
    setClassPickerOpen(false);
    setRecipientPickerOpen(false);
    setFormOpen(false);
  };

  return (
    <EventDialogShell
      open={Boolean(formOpen && draft)}
      onClose={closeForm}
      modalClassName="events-modal"
      labelledBy="events-form-title"
    >
      <header className="events-modal-header">
        <div>
          <span className="events-modal-kicker">
            {draft?.id ? t("EDIT EVENT") : t("NEW CALENDAR ENTRY")}
          </span>
          <h2 id="events-form-title">
            {draft?.id ? t("Edit Event") : t("Add New Event")}
          </h2>
          <p>{t("Define the event type, dates and audience.")}</p>
        </div>
        <button
          type="button"
          className="events-icon-close"
          onClick={closeForm}
          aria-label={t("Close")}
        >
          <X size={18} />
        </button>
      </header>

      <div className="events-modal-body">
        <fieldset className="events-type-fieldset">
          <legend>{t("Event Type")}</legend>
          <div className="events-type-options">
            {EVENT_TYPES.map((type) => {
              const Icon = eventIcon(type);
              return (
                <label
                  key={type}
                  className={[
                    "events-type-option",
                    draft.eventType === type ? "selected" : ""
                  ].filter(Boolean).join(" ")}
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={type}
                    checked={draft.eventType === type}
                    onChange={() => changeEventType(type)}
                  />
                  <span className="events-type-option-icon"><Icon size={16} /></span>
                  <span>{t(type)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="events-holiday-toggle">
          <input
            type="checkbox"
            checked={Boolean(draft.isHoliday)}
            onChange={(event) => setDraftField("isHoliday", event.target.checked)}
          />
          <span className="events-checkbox-look"><Check size={13} /></span>
          <span>
            <strong>{t("Is Holiday")}</strong>
            <small>{t("Mark this event as a school holiday.")}</small>
          </span>
        </label>

        <div className="events-date-fields">
          <label>
            <span>{t("Start Date")}<b>*</b></span>
            <input
              type="date"
              required
              value={draft.startDate}
              onChange={(event) => setDraftField("startDate", event.target.value)}
            />
          </label>
          <label>
            <span>{t("End Date")}<b>*</b></span>
            <input
              type="date"
              required
              min={draft.startDate}
              value={draft.endDate}
              onChange={(event) => setDraftField("endDate", event.target.value)}
            />
          </label>
        </div>

        <label className="events-description-field">
          <span>{t("Description")}<b>*</b></span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraftField("description", event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("Enter event description…")}
          />
          <small>{draft.description.length}/500 · {t("This text appears on the calendar.")}</small>
        </label>

        <fieldset className="events-label-color-fieldset">
          <legend>{t("Calendar Label Color")}</legend>
          <div className="events-label-color-options">
            <label className={[
              "events-label-color-option",
              !draft.labelColor ? "selected" : ""
            ].filter(Boolean).join(" ")}>
              <input
                type="radio"
                name="eventLabelColor"
                checked={!draft.labelColor}
                onChange={() => setDraftField("labelColor", "")}
              />
              <span className="events-label-swatch auto" />
              <span>{t("Auto by event type")}</span>
            </label>
            {EVENT_LABELS.map((label) => (
              <label
                key={label.value}
                className={[
                  "events-label-color-option",
                  draft.labelColor === label.value ? "selected" : ""
                ].filter(Boolean).join(" ")}
              >
                <input
                  type="radio"
                  name="eventLabelColor"
                  checked={draft.labelColor === label.value}
                  onChange={() => setDraftField("labelColor", label.value)}
                />
                <span className={"events-label-swatch label-color-" + label.value} />
                <span>{t(label.name)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {draft.eventType === "Class Event" && (
          <button
            type="button"
            className="events-audience-card"
            onClick={() => {
              setRecipientPickerOpen(false);
              setClassPickerOpen(true);
            }}
          >
            <span className="events-audience-icon"><Users size={18} /></span>
            <span>
              <strong>{t("Select classes")}</strong>
              <small>
                {selectedClassNames.length
                  ? selectedClassNames.join(" · ")
                  : t("No classes selected yet")}
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
        )}

        {["Parent Event", "Staff Event"].includes(draft.eventType) && (
          <button
            type="button"
            className="events-audience-card"
            onClick={() => {
              setClassPickerOpen(false);
              setRecipientPickerType(draft.eventType);
              setRecipientPickerOpen(true);
              if (draft.eventType === "Staff Event" && !staffPeople.length) {
                loadStaffPeople();
              }
            }}
          >
            <span className="events-audience-icon"><ContactRound size={18} /></span>
            <span>
              <strong>
                {draft.eventType === "Parent Event"
                  ? t("Choose parent recipients")
                  : t("Choose staff recipients")}
              </strong>
              <small>
                {selectedRecipientsCount
                  ? selectedRecipientsCount + " " + t(selectedRecipientsCount === 1 ? "contact selected" : "contacts selected")
                  : t("No recipients selected yet")}
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
        )}
      </div>

      <footer className="events-modal-footer">
        <button type="button" className="events-button events-outline" onClick={closeForm}>
          {t("Cancel")}
        </button>
        <button
          type="button"
          className="events-button events-primary"
          disabled={saving}
          onClick={() => { void saveEvent(); }}
        >
          {saving ? <LoaderCircle size={15} className="events-spin" /> : <Check size={15} />}
          {saving ? t("Saving…") : draft.id ? t("Update Event") : t("Create Event")}
        </button>
      </footer>
    </EventDialogShell>
  );
}
