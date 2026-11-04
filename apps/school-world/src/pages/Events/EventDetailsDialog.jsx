import React from "react";
import { ContactRound, PartyPopper, Pencil, Trash2, Users, X } from "lucide-react";
import EventDialogShell from "./EventDialogShell.jsx";
import { eventCssType, dateLabel } from "./eventsUtils.js";

export default function EventDetailsDialog({ context }) {
  const {
    selectedEvent,
    formOpen,
    setDetailEventId,
    t,
    deleteEvent,
    openEditEvent
  } = context;

  const closeDetails = () => setDetailEventId("");

  return (
    <EventDialogShell
      open={Boolean(selectedEvent && !formOpen)}
      onClose={closeDetails}
      modalClassName="events-detail-modal"
      labelledBy="events-detail-title"
    >
      {selectedEvent && (
        <>
          <header className="events-modal-header">
            <div>
              <span className={"events-detail-type " + eventCssType(selectedEvent.eventType)}>
                {t(selectedEvent.eventType)}
              </span>
              <h2 id="events-detail-title">{selectedEvent.description}</h2>
              <p>
                {dateLabel(selectedEvent.startDate, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
                {selectedEvent.endDate !== selectedEvent.startDate
                  ? " – " + dateLabel(selectedEvent.endDate)
                  : ""}
              </p>
            </div>
            <button
              type="button"
              className="events-icon-close"
              onClick={closeDetails}
              aria-label={t("Close")}
            >
              <X size={18} />
            </button>
          </header>

          <div className="events-detail-body">
            {selectedEvent.isHoliday && (
              <div className="events-detail-holiday">
                <PartyPopper size={17} />
                {t("Marked as a school holiday")}
              </div>
            )}
            {selectedEvent.eventType === "Class Event" && (
              <div className="events-detail-meta">
                <Users size={16} />
                <span>
                  {(selectedEvent.classIds || []).join(", ") || t("No classes selected")}
                </span>
              </div>
            )}
            {["Parent Event", "Staff Event"].includes(selectedEvent.eventType) && (
              <div className="events-detail-meta">
                <ContactRound size={16} />
                <span>
                  {(selectedEvent.recipientIds || []).length} {t((selectedEvent.recipientIds || []).length === 1 ? "selected recipient" : "selected recipients")}
                </span>
              </div>
            )}
            <p>{selectedEvent.description}</p>
          </div>

          <footer className="events-modal-footer events-detail-actions">
            <button
              type="button"
              className="events-button events-danger"
              onClick={() => deleteEvent(selectedEvent)}
            >
              <Trash2 size={15} />
              {t("Delete")}
            </button>
            <span />
            <button
              type="button"
              className="events-button events-outline"
              onClick={closeDetails}
            >
              {t("Close")}
            </button>
            <button
              type="button"
              className="events-button events-primary"
              onClick={() => openEditEvent(selectedEvent)}
            >
              <Pencil size={15} />
              {t("Edit Event")}
            </button>
          </footer>
        </>
      )}
    </EventDialogShell>
  );
}
