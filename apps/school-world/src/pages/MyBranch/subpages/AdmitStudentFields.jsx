import React from "react";

export function AdmitField({
  label, value, onChange, type = "text", options, required = false,
  placeholder, className = "", min, step, readOnly = false, hint, accept
}) {
  return <label className={"admit-field " + className}>
    <span>{label}{required && <b className="admit-required"> *</b>}</span>
    {options
      ? <select value={value ?? ""} onChange={event => onChange(event.target.value)} required={required}>
          {!required && <option value="">Not Specified</option>}
          {options.map(option => {
            const item = typeof option === "string" ? { value: option, label: option } : option;
            return <option key={item.value} value={item.value}>{item.label}</option>;
          })}
        </select>
      : <input type={type} value={value ?? ""} onChange={event => onChange(event.target.value)}
          required={required} placeholder={placeholder || label} min={min} step={step}
          readOnly={readOnly} accept={accept} />}
    {hint && <small>{hint}</small>}
  </label>;
}

export function AdmitNameFields({ label, value = {}, onChange, required = false, className = "" }) {
  return <div className={"admit-name-fields " + className}>
    <span className="admit-group-label">{label}{required && <b className="admit-required"> *</b>}</span>
    <div className="admit-name-grid">
      <input aria-label={label + " first name"} required={required} value={value.first || ""} onChange={event => onChange("first", event.target.value)} placeholder="First Name" />
      <input aria-label={label + " middle name"} value={value.middle || ""} onChange={event => onChange("middle", event.target.value)} placeholder="Middle Name" />
      <input aria-label={label + " last name"} value={value.last || ""} onChange={event => onChange("last", event.target.value)} placeholder="Last Name" />
    </div>
  </div>;
}

export function AdmitYesNo({ label, value, onChange, hint = "" }) {
  return <div className="admit-field">
    <span>{label}</span>
    <div className="admit-yes-no" role="group" aria-label={label}>
      {["Yes", "No"].map(option => <button type="button" key={option} aria-pressed={value === option}
        className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{option}</button>)}
    </div>
    {hint && <small>{hint}</small>}
  </div>;
}

export function AdmitSectionHeading({ title, description }) {
  return <div className="admit-section-heading">
    <h3>{title}</h3>
    {description && <p>{description}</p>}
  </div>;
}

export function joinName(parts = {}) {
  return [parts.first, parts.middle, parts.last].map(value => String(value || "").trim()).filter(Boolean).join(" ");
}
