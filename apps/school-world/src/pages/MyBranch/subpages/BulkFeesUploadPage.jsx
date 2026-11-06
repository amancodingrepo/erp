import React, { useMemo, useState } from "react";
import { currentAcademicYear, defaultAcademicYear } from "../../../school-options.js";
import { ArrowLeft, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import BulkFeesUploadDropzone from "./BulkFeesUploadDropzone.jsx";
import BulkFeesUploadErrors from "./BulkFeesUploadErrors.jsx";
import BulkFeesUploadPreviewTable from "./BulkFeesUploadPreviewTable.jsx";
import { normalizeHeader, parseCsv, downloadCsv, columnAliases } from "./bulkFeesUploadUtils.js";
import { apiPost } from "../../../api.js";

export default function BulkFeesUploadPage({ onBack, notify, t, students = [] }) {
  const text = typeof t === "function" ? t : value => value;
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const studentLookup = useMemo(() => {
    const lookup = new Map();
    for (const student of students) {
      const studentCode = String(student.studentCode || student.id || student.studentId || "").trim();
      if (!studentCode) continue;
      const data = { studentCode, name: student.name || student.fullName || studentCode };
      [student.studentCode, student.id, student.studentId, student.admissionNumber, student.enrollmentNumber]
        .filter(value => value !== undefined && value !== null && String(value).trim() !== "")
        .forEach(value => lookup.set(String(value).trim().toLowerCase(), data));
    }
    return lookup;
  }, [students]);

  const validatedRows = useMemo(() => {
    const seen = new Set();
    return rows.map((raw, index) => {
      const row = { ...raw, rowNumber: raw.sourceLine || index + 2, errors: [] };
      const lookupKey = String(raw.studentCode || "").trim().toLowerCase();
      const student = studentLookup.get(lookupKey);
      if (!student) row.errors.push("Student ID not found in the current school records");
      else row.resolvedStudentCode = student.studentCode;
      if (!defaultAcademicYear(raw.academicYear)) row.errors.push("Academic year is required (no current year is set for this school)");
      if (!String(raw.feeName || "").trim()) row.errors.push("Fee name is required");
      if (!String(raw.installmentName || "").trim()) row.errors.push("Installment is required (for example, First Installment or Second Installment)");
      const amount = Number(raw.amount);
      const paid = raw.amountPaid === "" ? 0 : Number(raw.amountPaid);
      if (String(raw.amount ?? "").trim() === "" || !Number.isFinite(amount) || amount <= 0) row.errors.push("Amount must be greater than zero");
      if (!Number.isFinite(paid) || paid < 0 || (Number.isFinite(amount) && paid > amount)) row.errors.push("Paid amount must be between zero and total amount");
      if (raw.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.dueDate))) row.errors.push("Due date must use YYYY-MM-DD");
      if (raw.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(String(raw.dueDate))) {
        const parsed = new Date(String(raw.dueDate) + "T00:00:00Z");
        if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== String(raw.dueDate)) row.errors.push("Due date is not a valid calendar date");
      }
      const duplicateKey = [lookupKey, defaultAcademicYear(raw.academicYear), String(raw.feeName || "").trim().toLowerCase(), String(raw.installmentName || "").trim().toLowerCase(), String(raw.dueDate || "").trim()].join("|");
      if (seen.has(duplicateKey)) row.errors.push("Duplicate student, fee name, academic year and due date in this file");
      seen.add(duplicateKey);
      return row;
    });
  }, [rows, studentLookup]);
  const invalidCount = validatedRows.filter(row => row.errors.length).length;

  async function handleFileChange(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setFileError("");
    setUploadErrors([]);
    try {
      const content = await file.text();
      const parsed = parseCsv(content);
      if (parsed.length < 2) throw new Error("The CSV must contain a header row and at least one fee record.");
      const headers = parsed[0].map(normalizeHeader);
      const indexes = {};
      for (const [key, aliases] of Object.entries(columnAliases)) indexes[key] = headers.findIndex(header => aliases.includes(header));
      const requiredLabels = { studentCode: "StudentID", feeName: "FeeName", installmentName: "Installment", amount: "Amount" };
      for (const required of ["studentCode", "feeName", "installmentName", "amount"]) {
        if (indexes[required] < 0) throw new Error("The CSV is missing required column: " + requiredLabels[required] + ".");
      }
      const mapped = parsed.slice(1).map((record, index) => ({
        sourceLine: index + 2,
        studentCode: String(record[indexes.studentCode] ?? "").trim(),
        academicYear: indexes.academicYear < 0 ? "" : String(record[indexes.academicYear] ?? "").trim(),
        feeName: String(record[indexes.feeName] ?? "").trim(),
        installmentName: String(record[indexes.installmentName] ?? "").trim(),
        amount: String(record[indexes.amount] ?? "").trim(),
        amountPaid: indexes.amountPaid < 0 ? "0" : String(record[indexes.amountPaid] ?? "0").trim(),
        dueDate: indexes.dueDate < 0 ? "" : String(record[indexes.dueDate] ?? "").trim(),
        reference: indexes.reference < 0 ? "" : String(record[indexes.reference] ?? "").trim()
      }));
      if (!mapped.length) throw new Error("No fee rows were found in the selected CSV.");
      setRows(mapped);
    } catch (error) {
      setFileError(error.message || "The selected CSV could not be read.");
    } finally {
      input.value = "";
    }
  }

  async function uploadRows() {
    if (!validatedRows.length) {
      setFileError("Select a CSV file containing fee rows before uploading.");
      return;
    }
    if (invalidCount) {
      setUploadErrors(["Fix all validation errors in the preview before uploading."]);
      return;
    }
    if (!studentLookup.size) {
      setUploadErrors(["Student records have not loaded. Refresh the page and try again."]);
      return;
    }
    setUploading(true);
    setUploadErrors([]);
    setProgress({ done: 0, total: validatedRows.length });
    const failedRows = [];
    const issues = [];
    let succeeded = 0;
    for (let index = 0; index < validatedRows.length; index += 1) {
      const row = validatedRows[index];
      try {
        await apiPost("/fees", {
          studentCode: row.resolvedStudentCode,
          academicYear: defaultAcademicYear(row.academicYear),
          feeName: String(row.feeName).trim(),
          installmentName: String(row.installmentName).trim(),
          amount: Number(row.amount),
          amountPaid: Number(row.amountPaid || 0),
          dueDate: row.dueDate || null,
          reference: String(row.reference || "").trim()
        });
        succeeded += 1;
      } catch (error) {
        failedRows.push({ ...row, errors: [] });
        issues.push("CSV row " + row.rowNumber + " (" + row.studentCode + "): " + (error.message || "Save failed"));
      }
      setProgress({ done: index + 1, total: validatedRows.length });
    }
    setUploading(false);
    setRows(failedRows);
    setUploadErrors(issues);
    if (issues.length) {
      notify?.("Bulk fee upload finished: " + succeeded + " saved, " + issues.length + " failed. Failed rows remain in the preview so you can retry them.");
      setFileName(failedRows.length ? fileName + " · failed rows only" : "");
    } else {
      notify?.("Bulk fee upload completed: " + succeeded + " fee record(s) saved to the school database.");
      setFileName("");
      setRows([]);
    }
  }

  const templateRows = [
    ["StudentID", "AcademicYear", "FeeName", "Installment", "Amount", "AmountPaid", "DueDate", "Reference"],
    ["REPLACE_WITH_STUDENT_ID", currentAcademicYear() || "2026-2027", "Tuition Fee", "First Installment", "25000", "0", "2026-10-31", ""]
  ];

  return <section className="my-branch-feature-view fees-setup-page fee-bulk-upload-page">
    <button type="button" className="my-branch-back-link" onClick={onBack}><ArrowLeft size={15}/>{text(" Back to Manage your Branch")}</button>
    <section className="fees-setup-header"><div><span className="fees-setup-eyebrow">{text("ADMINISTRATIVE · FEE SETTINGS")}</span><div className="fees-setup-title-line"><span className="fees-setup-title-icon"><FileSpreadsheet size={22}/></span><h2>{text("Bulk Fees Upload")}</h2></div><p>{text("Import fee records for multiple students, identify the installment for each fee, preview the amounts, and correct invalid rows before saving.")}</p></div><button type="button" className="fees-setup-secondary" onClick={() => downloadCsv("school-world-bulk-fees-template.csv", templateRows)}><Download size={15}/>{text("Download CSV template")}</button></section>
    <BulkFeesUploadDropzone context={{ text,fileName,fileError,uploading,handleFileChange }} />    <BulkFeesUploadErrors context={{ text,uploadErrors }} />    <BulkFeesUploadPreviewTable context={{ text,validatedRows,invalidCount,uploading,progress,uploadRows,studentLookup,fileError }} />
  </section>;
}
