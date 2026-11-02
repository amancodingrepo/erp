import React from "react";
import { t } from "../../i18n.jsx";

export default function SavedAdmissionEnquiries({ context }) {
  const { showAdmissions, admissions } = context;
  return (
    showAdmissions && <section className="admission-card"><h2>{t("Saved admission enquiries")}</h2>{admissions.length ? <div className="legacy-table-wrap"><table className="legacy-table"><thead><tr>{["Form Number","Student Name","Contact","Class","Academic Year","Status","Created"].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{admissions.map(item=><tr key={item.id}><td>{item.formNumber}</td><td>{item.studentName}</td><td>{item.primaryContact}</td><td>{item.classApplied || "—"}</td><td>{item.academicYear}</td><td>{item.enquiryStatus}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "—"}</td></tr>)}</tbody></table></div> : <p>{t("No saved enquiries yet.")}</p>}</section>
  );
}
