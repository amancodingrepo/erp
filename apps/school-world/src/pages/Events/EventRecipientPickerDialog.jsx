import React from "react";
import EventDialogShell from "./EventDialogShell.jsx";
import {
  Check,
  ContactRound,
  Download,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";

export default function EventRecipientPickerDialog({ context }) {
  const {
    recipientPickerOpen,
    formOpen,
    draft,
    setRecipientPickerOpen,
    t,
    filterOpen,
    setFilterOpen,
    recipientPickerType,
    contactsSearch,
    setContactsSearch,
    contactTypeFilter,
    setContactTypeFilter,
    contactLists,
    selectedListId,
    setSelectedListId,
    applyBroadcastList,
    removeBroadcastList,
    contactFeedback,
    peopleLoading,
    peopleError,
    loadStaffPeople,
    visibleRecipients,
    toggleAllVisibleRecipients,
    downloadRecipients,
    changeRecipient,
    broadcastFormOpen,
    setBroadcastFormOpen,
    broadcastName,
    setBroadcastName,
    saveBroadcastList
  } = context;

  const selectedRecipientIds = draft?.recipientIds || [];
  const isParentEvent = recipientPickerType === "Parent Event";
  const filterOptions = isParentEvent
    ? [{ id: "all", label: "All parents" }]
    : [
        { id: "all", label: "All staff" },
        { id: "teacher", label: "Teachers" },
        { id: "staff", label: "Staff" },
        { id: "day_care", label: "Day Care" },
        { id: "other", label: "Other" }
      ];

  return (
    <EventDialogShell
      open={Boolean(recipientPickerOpen && formOpen && draft)}
      onClose={() => setRecipientPickerOpen(false)}
      backdropClassName="events-picker-backdrop events-recipient-picker-backdrop"
      modalClassName="events-recipients-modal"
      labelledBy="events-recipients-title"
    >
      <header className="events-picker-header">
        <div>
          <span className="events-modal-kicker">{t("EVENT AUDIENCE")}</span>
          <h2 id="events-recipients-title">{t("Choose Recipient(s)")}</h2>
          <p>{t("Select contacts to associate with this event.")}</p>
        </div>
        <button
          type="button"
          className="events-icon-close"
          onClick={() => setRecipientPickerOpen(false)}
          aria-label={t("Close")}
        >
          <X size={17} />
        </button>
      </header>

      <div className="events-recipients-toolbar">
        <div className="events-recipients-title">
          <ContactRound size={17} />
          <strong>{t("Select Contacts")}</strong>
          <span>{selectedRecipientIds.length} {t("selected")}</span>
        </div>
        <div className="events-recipients-search">
          <button
            type="button"
            className={filterOpen ? "active" : ""}
            onClick={() => setFilterOpen((value) => !value)}
          >
            <Filter size={15} />
            {t("Filter")}
          </button>
          <label>
            <Search size={15} />
            <input
              value={contactsSearch}
              onChange={(event) => setContactsSearch(event.target.value)}
              placeholder={t("Start typing to filter list…")}
            />
            {contactsSearch && (
              <button
                type="button"
                aria-label={t("Clear search")}
                onClick={() => setContactsSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      </div>

      {filterOpen && (
        <div className="events-contact-filters">
          <span>{t("Filter contacts")}</span>
          {filterOptions.map((item) => (
            <button
              type="button"
              key={item.id}
              className={contactTypeFilter === item.id ? "active" : ""}
              onClick={() => setContactTypeFilter(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      )}

      {contactLists.length > 0 && (
        <div className="events-saved-lists-bar">
          <label>
            <span>{t("Saved broadcast list")}</span>
            <select
              value={selectedListId}
              onChange={(event) => setSelectedListId(event.target.value)}
            >
              <option value="">{t("Choose a list…")}</option>
              {contactLists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="events-button events-outline"
            onClick={applyBroadcastList}
          >
            {t("Apply list")}
          </button>
          <button
            type="button"
            className="events-button events-text"
            onClick={() => removeBroadcastList(contactLists.find((item) => item.id === selectedListId))}
            disabled={!contactLists.some((item) => item.id === selectedListId)}
          >
            <Trash2 size={14} />
            {t("Delete list")}
          </button>
        </div>
      )}

      {contactFeedback && (
        <div className="events-contact-feedback">{contactFeedback}</div>
      )}

      {recipientPickerType === "Staff Event" && peopleLoading && (
        <div className="events-loading">
          <LoaderCircle size={18} className="events-spin" />
          {t("Loading staff contacts…")}
        </div>
      )}
      {recipientPickerType === "Staff Event" && peopleError && !peopleLoading && (
        <div className="events-inline-error">
          <span>{peopleError}</span>
          <button type="button" onClick={loadStaffPeople}>{t("Retry")}</button>
        </div>
      )}

      <div className="events-contact-list">
        <div className="events-contact-list-actions">
          <button
            type="button"
            className="events-select-all"
            onClick={toggleAllVisibleRecipients}
          >
            <Check size={14} />
            {visibleRecipients.length > 0 &&
            visibleRecipients.every((person) => selectedRecipientIds.includes(person.id))
              ? t("Clear selection")
              : t("Select All Contacts")}
          </button>
          <button
            type="button"
            className="events-download-contacts"
            onClick={downloadRecipients}
          >
            <Download size={14} />
            {t("Download Contact Details")}
          </button>
        </div>

        {visibleRecipients.map((person) => {
          const selected = selectedRecipientIds.includes(person.id);
          return (
            <label
              className={["events-contact-card", selected ? "selected" : ""].filter(Boolean).join(" ")}
              key={person.id}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => changeRecipient(person.id, event.target.checked)}
              />
              <span className="events-checkbox-look"><Check size={13} /></span>
              <span className="events-contact-avatar"><UserRound size={23} /></span>
              <span className="events-contact-main">
                <strong>{person.name}</strong>
                <small>{t("Designation")}: {person.designation}</small>
                <span className="events-contact-info">
                  <span>{person.email || t("Email not provided")}</span>
                  <span>
                    {person.phone || t("Phone not provided")}
                    {person.alternatePhone ? " · " + person.alternatePhone : ""}
                  </span>
                </span>
                {person.children?.length > 0 && (
                  <span className="events-contact-children">
                    <b>{t("CHILD INFO")}</b>
                    {person.children.map((child, index) => (
                      <span key={person.id + "-" + index}>
                        <strong>{child.name}</strong>
                        <small>
                          {child.className} · {t("Scholar Number")}: {child.scholarNumber}
                        </small>
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </label>
          );
        })}

        {!peopleLoading && visibleRecipients.length === 0 && (
          <div className="events-empty-picker">
            {isParentEvent
              ? t("No parent contacts were found for the available student records.")
              : t("No staff contacts match this search. Add recipient profiles in Contacts first.")}
          </div>
        )}
      </div>

      {broadcastFormOpen && (
        <form
          className="events-broadcast-create"
          onSubmit={(event) => {
            event.preventDefault();
            void saveBroadcastList();
          }}
        >
          <label>
            <span>{t("Broadcast list name")}</span>
            <input
              value={broadcastName}
              onChange={(event) => setBroadcastName(event.target.value)}
              autoFocus
              placeholder={t("e.g. All teaching staff")}
              maxLength={80}
            />
          </label>
          <span className="events-broadcast-count">
            {selectedRecipientIds.length} {t("selected contacts")}
          </span>
          <button type="submit" className="events-button events-primary">
            <Check size={14} />
            {t("Save list")}
          </button>
          <button
            type="button"
            className="events-button events-outline"
            onClick={() => setBroadcastFormOpen(false)}
          >
            {t("Cancel")}
          </button>
        </form>
      )}

      {!broadcastFormOpen && (
        <div className="events-contact-list-footer-action">
          <span>{selectedRecipientIds.length} {t("contacts selected")}</span>
          <button
            type="button"
            className="events-button events-outline"
            onClick={() => setBroadcastFormOpen(true)}
          >
            <Plus size={14} />
            {t("Create New Broadcast List")}
          </button>
        </div>
      )}

      <footer className="events-picker-footer">
        <span>{selectedRecipientIds.length} {t("contacts selected")}</span>
        <button
          type="button"
          className="events-button events-outline"
          onClick={() => setRecipientPickerOpen(false)}
        >
          {t("Close")}
        </button>
        <button
          type="button"
          className="events-button events-primary"
          onClick={() => setRecipientPickerOpen(false)}
        >
          <Check size={15} />
          {t("Save changes")}
        </button>
      </footer>
    </EventDialogShell>
  );
}
