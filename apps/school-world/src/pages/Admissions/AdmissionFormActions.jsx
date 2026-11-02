import React from "react";
import { Printer } from "lucide-react";

export default function AdmissionFormActions({ context }) {
  const { t, submitAdmission, submitting, notify, loadAdmissions, loadingAdmissions, onBack } = context;
  return (
    <div className="admission-final-actions">
      <button className="legacy-save create-form-button" onClick={submitAdmission} disabled={submitting}>{t(submitting ? "Saving…" : "CREATE ADMISSION FORM")}</button>
      <button className="legacy-primary" onClick={() => { notify("Opening print dialog for the admission form."); window.print(); }}><Printer size={15}/> {t("SAVE & PRINT")}</button>
      <button className="plain-button" onClick={loadAdmissions} disabled={loadingAdmissions}>{t(loadingAdmissions ? "Loading saved enquiries…" : "View saved enquiries")}</button>
      <button className="plain-button" onClick={onBack}>{t("Return to student details")}</button>
    </div>
  );
}
