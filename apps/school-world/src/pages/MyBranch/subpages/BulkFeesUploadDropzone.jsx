import React from "react";
import { UploadCloud } from "lucide-react";

export default function BulkFeesUploadDropzone({ context }) {
  const { text, fileName, fileError, uploading, handleFileChange } = context;
  return (<section className="fees-setup-form-card fee-bulk-dropzone">
      <UploadCloud size={32}/><strong>{text("Choose a fee CSV file")}</strong><p>{text("Required columns: StudentID, FeeName and Amount. Optional columns: AcademicYear, AmountPaid, DueDate and Reference. Student IDs must match this school's student records.")}</p>
      <label className="fees-setup-primary fee-bulk-file-button">{text("Choose CSV")}<input type="file" accept=".csv,text/csv" disabled={uploading} onChange={handleFileChange}/></label>
      {fileName && <small>{text("Selected file:")} {fileName}</small>}
      {fileError && <div className="fees-setup-alert" role="alert">{text(fileError)}</div>}
    </section>);
}
