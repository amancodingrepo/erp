import React from "react";
import { FileSpreadsheet } from "lucide-react";

export default function BulkFeesUploadPreviewTable({ context }) {
  const { text, validatedRows, invalidCount, uploading, progress, uploadRows, studentLookup, fileError } = context;
  return (<section className="fees-setup-table-card">
      <div className="fees-setup-table-toolbar"><div><strong>{text("Preview fee rows")}</strong><span>{validatedRows.length} {text("rows")} · {invalidCount} {text("invalid")}</span></div></div>
      <div className="fees-setup-table-scroll"><table className="fees-setup-table fee-bulk-table"><thead><tr>{["CSV Row","Student ID","Academic Year","Fee Name","Installment","Amount","Paid Amount","Due Date","Validation"].map(header => <th key={header}>{text(header)}</th>)}</tr></thead><tbody>
        {validatedRows.slice(0, 200).map(row => <tr key={row.sourceLine + "-" + row.studentCode}><td>{row.rowNumber}</td><td>{row.studentCode}</td><td>{row.academicYear || "2026-2027"}</td><td>{row.feeName}</td><td>{row.installmentName || "—"}</td><td>₹{Number(row.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td>₹{Number(row.amountPaid || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td>{row.dueDate || "—"}</td><td>{row.errors.length ? <span className="fee-bulk-validation-error">{text(row.errors.join("; "))}</span> : <span className="fees-setup-state yes">{text("Ready")}</span>}</td></tr>)}
        {!validatedRows.length && <tr><td colSpan={9}><div className="fees-setup-empty"><FileSpreadsheet size={24}/><strong>{text("No fee rows to preview")}</strong><span>{text("Choose a CSV file to validate the records before upload.")}</span></div></td></tr>}
      </tbody></table>{validatedRows.length > 200 && <p className="module-note">{text("Only the first 200 rows are shown. All validated rows will be uploaded.")}</p>}</div>
      {uploading && <div className="fees-apply-progress" role="status">{text("Uploading…")} {progress.done} / {progress.total}</div>}
      <div className="fees-setup-form-actions"><button type="button" className="fees-setup-primary" disabled={uploading || !validatedRows.length || Boolean(invalidCount) || Boolean(fileError) || !studentLookup.size} onClick={uploadRows}>{uploading ? text("Uploading…") : text("Upload Fee Records")}</button></div>
    </section>);
}
