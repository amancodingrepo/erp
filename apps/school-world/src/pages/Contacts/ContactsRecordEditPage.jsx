import React from "react";
import {
  ArrowLeft, CheckCircle2, ContactRound, RefreshCw, Save, ShieldCheck, UserRound
} from "lucide-react";
import "./ContactsRecordEditPage.css";

const ACCOUNT_ROLES = [
  { value: "school_admin", label: "School Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "staff", label: "Staff" },
  { value: "transport_admin", label: "Transport Admin" }
];

export default function ContactsRecordEditPage({
  contact, draft, setDraft, onCancel, onSave, saving, error, success
}) {
  const isAccount = contact?.kind === "account";
  const kindLabel = isAccount ? "Login Account" : contact?.kind === "student" ? "Student" : "Contact";
  const name = contact?.name || "Contact";
  function update(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }

  return (
    <section className="contacts-record-edit-page">
      <button type="button" className="contacts-record-edit-back" onClick={onCancel}>
        <ArrowLeft size={15}/> Back to Contacts
      </button>
      {error && <div className="contacts-record-edit-alert error" role="alert">{error}</div>}
      {success && <div className="contacts-record-edit-alert success" role="status"><CheckCircle2 size={15}/>{success}</div>}
      <header className="contacts-record-edit-heading">
        <div>
          <span className="contacts-record-edit-eyebrow"><ShieldCheck size={13}/> CONTACT DIRECTORY · {kindLabel.toUpperCase()}</span>
          <h2>Edit {kindLabel}</h2>
          <p>Update the selected record and save your changes.</p>
        </div>
        <div className="contacts-record-edit-person">
          <span className="contacts-record-edit-avatar">{contact?.photoDataUrl ? <img src={contact.photoDataUrl} alt=""/> : isAccount ? <ShieldCheck size={20}/> : contact?.kind === "student" ? <UserRound size={20}/> : <ContactRound size={20}/>}</span>
          <span><strong>{name}</strong><small>{contact?.role || kindLabel}{contact?.studentId ? " · ID " + contact.studentId : ""}</small></span>
        </div>
      </header>

      <form className="contacts-record-edit-form" onSubmit={event => { event.preventDefault(); onSave(); }}>
        {isAccount ? (
          <>
            <section className="contacts-record-edit-section">
              <header><h3>Login Account Details</h3><p>Update account email, assigned role and sign-in availability.</p></header>
              <div className="contacts-record-edit-grid">
                <label className="wide">Email Address<input type="email" required value={draft.email || ""} onChange={event => update("email", event.target.value)} autoComplete="email"/></label>
                <label>Account Role<select required value={draft.role || "staff"} onChange={event => update("role", event.target.value)}>{ACCOUNT_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                <label>Account Status<select value={draft.isActive ? "Active" : "Inactive"} onChange={event => update("isActive", event.target.value === "Active")}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
              </div>
              <p className="contacts-record-edit-note">This is an unlinked login account, so personal contact details are not available on the account record.</p>
            </section>
          </>
        ) : (
          <>
            <section className="contacts-record-edit-section">
              <header><h3>Personal and Contact Details</h3><p>Contact information used in the school directory.</p></header>
              <div className="contacts-record-edit-grid">
                <label className="wide">Full Name<input required maxLength={200} value={draft.fullName || ""} onChange={event => update("fullName", event.target.value)}/></label>
                <label>Email Address<input type="email" maxLength={254} value={draft.email || ""} onChange={event => update("email", event.target.value)}/></label>
                <label>Contact Number<input type="tel" maxLength={40} value={draft.contactNumber || ""} onChange={event => update("contactNumber", event.target.value)}/></label>
                <label>Alternate Contact Number<input type="tel" maxLength={40} value={draft.alternateContactNumber || ""} onChange={event => update("alternateContactNumber", event.target.value)}/></label>
                <label>Date of Birth<input type="date" value={draft.dateOfBirth || ""} onChange={event => update("dateOfBirth", event.target.value)}/></label>
                <label>Gender<select value={draft.gender || "Not Specified"} onChange={event => update("gender", event.target.value)}><option>Not Specified</option><option>Male</option><option>Female</option><option>Other</option></select></label>
                <label>External ID<input maxLength={100} value={draft.externalId || ""} onChange={event => update("externalId", event.target.value)}/></label>
                <label>Status<select value={draft.status || "Active"} onChange={event => update("status", event.target.value)}><option>Active</option><option>Inactive</option></select></label>
              </div>
            </section>
            <section className="contacts-record-edit-section">
              <header><h3>Address Details</h3><p>Address and location details for this record.</p></header>
              <div className="contacts-record-edit-grid">
                <label className="wide">Address<input maxLength={500} value={draft.address || ""} onChange={event => update("address", event.target.value)}/></label>
                <label>City<input maxLength={100} value={draft.city || ""} onChange={event => update("city", event.target.value)}/></label>
                <label>State<input maxLength={100} value={draft.state || ""} onChange={event => update("state", event.target.value)}/></label>
              </div>
            </section>
            <section className="contacts-record-edit-section">
              <header><h3>School Details</h3><p>Class and section details where applicable.</p></header>
              <div className="contacts-record-edit-grid">
                <label>Class<input maxLength={100} value={draft.className || ""} onChange={event => update("className", event.target.value)}/></label>
                <label>Section<input maxLength={50} value={draft.section || ""} onChange={event => update("section", event.target.value)}/></label>
              </div>
            </section>
          </>
        )}
        <footer className="contacts-record-edit-footer">
          <span>Record: {contact?.id || "—"}</span>
          <div>
            <button type="button" className="contacts-record-edit-button secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="contacts-record-edit-button primary" disabled={saving}>
              {saving ? <RefreshCw size={14} className="contacts-record-edit-spin"/> : <Save size={14}/>}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}
