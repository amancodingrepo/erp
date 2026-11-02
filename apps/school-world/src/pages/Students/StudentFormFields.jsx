import React from "react";
import { t } from "../../i18n.jsx";

export function Field({ label, value, onChange, type = "text", options, placeholder = "", required = false, className = "", note = "" }) {
  return <label className={`legacy-field ${className}`}>
    <span>{required && <b className="required-star">*</b>}{t(label)}</span>
    {options ? <select value={value ?? ""} onChange={e => onChange(e.target.value)}>{options.map(opt => <option key={opt} value={opt}>{t(opt)}</option>)}</select> :
      <input type={type} value={value ?? ""} placeholder={t(placeholder || label)} onChange={e => onChange(e.target.value)} />}
    {note && <small>{t(note)}</small>}
  </label>;
}
export function YesNo({ label, value, onChange }) {
  return <div className="legacy-field"><span className="yesno-label">{t(label)}</span><div className="yesno-control"><button type="button" className={value === "Yes" ? "selected" : ""} onClick={() => onChange("Yes")}>{t("Yes")}</button><button type="button" className={value === "No" ? "selected" : ""} onClick={() => onChange("No")}>{t("No")}</button></div></div>;
}
export function NameParts({ label, prefix, data, setData }) {
  return <div className="legacy-field name-parts"><span>{t(label)}</span><div className="name-parts-inputs">
    <input value={data[`${prefix}First`] || ""} onChange={e => setData({ ...data, [`${prefix}First`]: e.target.value })} placeholder={t("First Name")} aria-label={`${t(label)} ${t("First Name").toLowerCase()}`}/>
    <input value={data[`${prefix}Middle`] || ""} onChange={e => setData({ ...data, [`${prefix}Middle`]: e.target.value })} placeholder={t("Middle Name")} aria-label={`${t(label)} ${t("Middle Name").toLowerCase()}`}/>
    <input value={data[`${prefix}Last`] || ""} onChange={e => setData({ ...data, [`${prefix}Last`]: e.target.value })} placeholder={t("Last Name")} aria-label={`${t(label)} ${t("Last Name").toLowerCase()}`}/>
  </div></div>;
}
