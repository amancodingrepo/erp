import React from "react";
import EventEditorDialog from "./EventEditorDialog.jsx";
import EventClassPickerDialog from "./EventClassPickerDialog.jsx";
import EventRecipientPickerDialog from "./EventRecipientPickerDialog.jsx";
import EventDetailsDialog from "./EventDetailsDialog.jsx";

/**
 * Render exactly one Events dialog at a time.
 * A picker temporarily replaces the editor instead of stacking another portal
 * over it; closing the picker returns to the editor with the same draft.
 */
export default function EventsDialogs({ context }) {
  const {
    formOpen,
    draft,
    classPickerOpen,
    recipientPickerOpen,
    selectedEvent
  } = context;

  if (formOpen && draft) {
    if (recipientPickerOpen) {
      return <EventRecipientPickerDialog context={context} />;
    }

    if (classPickerOpen) {
      return <EventClassPickerDialog context={context} />;
    }

    return <EventEditorDialog context={context} />;
  }

  if (selectedEvent) {
    return <EventDetailsDialog context={context} />;
  }

  return null;
}
