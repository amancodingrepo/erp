import React from "react";
import { UserCircle, Upload } from "lucide-react";
import { t } from "../../i18n.jsx";
import { Field } from "../Students/StudentFormFields.jsx";
import { academicYearOptions, classOptions as schoolClassOptions } from "../../school-options.js";
import { ADMISSION_FIELD_GROUPS, getFieldSetting } from "./admissionFormCatalog.js";

function formattedBirthDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function calculatedAge(value) {
  if (!value) return "";
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) years -= 1;
  return years >= 0 ? `${years} years` : "";
}

export default function AdmissionFormSections({ context }) {
  const { row, vals, photo, uploadPhoto, classOptions = [], formDefinition, formType = "enquiry" } = context;
  const selected = formDefinition?.fields || [];
  const sections = selected.map(selection => {
    const group = ADMISSION_FIELD_GROUPS.find(item => item.id === selection.groupId);
    if (!group) return null;
    if (group.kind === "documents") return null;
    const visibleFields = group.fields.filter(field => getFieldSetting(formDefinition, group.id, field.id, formType) !== "Not Required");
    if (!group.kind && !visibleFields.length) return null;
    if (group.kind === "documents" && !visibleFields.length) return null;
    return { selection, group, visibleFields };
  }).filter(Boolean);

  return (
    <>
      {sections.map(({ selection, group, visibleFields }) => (
        <section className="admission-card" id={`admission-${group.id}`} key={group.id}>
          <h2>{t(group.label)}</h2>
          {group.description && <p className="admission-help">{t(group.description)}</p>}
          {group.kind === "photo" ? (
            <div className="admission-photo-upload">
              {photo ? <img src={photo} alt={t("Student")} /> : <div className="photo-empty"><UserCircle size={95} /><span>{t("Student photograph")}</span></div>}
              <label className="legacy-primary upload-photo-control"><Upload size={15} />{t(" Upload photo")}<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
            </div>
          ) : group.kind === "documents" ? (
            <p className="admission-help">{t("Attach the required documents in the section below.")}</p>
          ) : (
            <div className="admission-fields">
              {visibleFields.map(field => {
                const requirement = getFieldSetting(formDefinition, group.id, field.id, formType);
                const required = requirement === "Required";
                const fieldLabel = t(field.label);
                if (field.type === "computed") {
                  const computedValue = field.id === "dobWords" ? formattedBirthDate(vals.dob) : field.id === "ageAtAdmission" ? calculatedAge(vals.dob) : "";
                  return <Field key={field.id} label={fieldLabel} value={computedValue} onChange={() => {}} />;
                }
                let type = field.type || "text";
                let options = field.options || null;
                if (field.id === "className") {
                  // The school's own classes; the generic catalog list only when the school has none yet.
                  const ownClasses = schoolClassOptions(classOptions || []);
                  options = Array.from(new Set([...(ownClasses.length ? ownClasses : options || []), vals.className].filter(Boolean)));
                  type = "text";
                }
                if (field.id === "academicYear") {
                  options = academicYearOptions(vals.academicYear);
                  type = "text";
                }
                return <React.Fragment key={field.id}>
                  {type === "textarea"
                    ? <label className="legacy-field admission-builder-textarea-field">
                        <span>{required && <b className="required-star">*</b>}{fieldLabel}</span>
                        <textarea value={vals[field.id] ?? ""} onChange={event => context.change(field.id, event.target.value)} />
                      </label>
                    : row(fieldLabel, field.id, type === "select" ? "text" : type, options, field.note, requirement)}
                </React.Fragment>;
              })}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
