import React from "react";

const TIMEZONE_OPTIONS = [
  ["Asia/Kolkata", "India — Asia/Kolkata"],
  ["Asia/Dubai", "UAE — Asia/Dubai"],
  ["Europe/London", "United Kingdom — Europe/London"],
  ["America/Toronto", "Canada — America/Toronto"],
  ["America/New_York", "USA Eastern — America/New_York"],
  ["UTC", "UTC"]
];

export default function SchoolProfileFields({ record, onChange, showCode = false, codeReadOnly = false }) {
  const update = (field, value) => onChange?.(field, field === "code" ? value.toUpperCase() : value);
  return (
    <>
      <label>School name<input required minLength={2} maxLength={160} value={record.name || ""} onChange={event => update("name", event.target.value)} placeholder="e.g. Sanford School"/></label>
      {showCode && <label>School code<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" value={record.code || ""} onChange={event => update("code", event.target.value)} placeholder="SANFORD-02"/></label>}
      {codeReadOnly && <label>School code<input value={record.code || ""} readOnly/><small>School code is fixed to preserve existing tenant/account references.</small></label>}
      <label>School address<textarea rows={showCode ? 2 : 3} maxLength={800} value={record.address || ""} onChange={event => update("address", event.target.value)} placeholder={showCode ? "Full school address" : "Full postal address"}/></label>
      <div className="db-superadmin-form-row">
        <label>School phone<input type="tel" maxLength={80} value={record.phone || ""} onChange={event => update("phone", event.target.value)} placeholder="+91…"/></label>
        <label>School contact email<input type="email" maxLength={254} value={record.email || ""} onChange={event => update("email", event.target.value)} placeholder="office@school.edu"/></label>
      </div>
      <label>Timezone<select value={record.timezone || "Asia/Kolkata"} onChange={event => update("timezone", event.target.value)}>{TIMEZONE_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </>
  );
}
