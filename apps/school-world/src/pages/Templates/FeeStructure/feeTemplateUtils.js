import { defaultAcademicYear } from "../../../school-options.js";
export const makeId = prefix => prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
export const blankLine = () => ({ id: makeId("fee-line"), feeTypeId: "", feeTypeName: "", amount: "", discountType: "Default Discount", discountValue: "0", taxes: { cgst: false, sgst: false, igst: false }, notes: "" });
export const blankInstallment = () => ({ id: "", installment: "First", dueDate: "", notes: "", fees: [blankLine()] });
export function emptyTemplate(year) {
  return { id: "", name: "", academicYear: defaultAcademicYear(year), studentType: "All Students", hasOptionalFees: false, isMonthlyTemplate: false, installments: [], createdAt: "", updatedAt: "" };
}
export const labelForStudentType = value => value === "new" ? "New Students" : value === "existing" ? "Existing Students" : "All Students";
export function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
export function taxLabels(taxes) {
  const config = taxes || {};
  return [config.cgst && "CGST 9%", config.sgst && "SGST 9%", config.igst && "IGST 18%"].filter(Boolean);
}
export function discountFor(line) {
  const amount = Math.max(0, Number(line.amount || 0));
  const value = Math.max(0, Number(line.discountValue || 0));
  const raw = line.discountType === "Percentage"
    ? Math.min(amount, amount * Math.min(value, 100) / 100)
    : line.discountType === "Fixed Amount" ? Math.min(amount, value) : 0;
  return Math.round(raw * 100) / 100;
}
export function subtotalForLine(line) {
  const base = Math.max(0, Number(line.amount || 0) - discountFor(line));
  const taxes = line.taxes || {};
  const rate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
  return Math.round((base + base * rate / 100) * 100) / 100;
}
export function summarizeInstallment(row, feeTypes) {
  const fees = Array.isArray(row.fees) ? row.fees : [];
  const amount = fees.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const discount = fees.reduce((sum, line) => sum + discountFor(line), 0);
  const names = fees.map(line => line.feeTypeName || feeTypes.find(type => type.id === line.feeTypeId)?.name).filter(Boolean);
  const taxes = [...new Set(fees.flatMap(line => taxLabels(line.taxes)))];
  return { amount, discount, names, taxes };
}
export function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}
export function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
export function downloadXls(filename, title, rows, columns) {
  const titleRow = "<Row ss:Height=\"28\"><Cell ss:StyleID=\"Title\" ss:MergeAcross=\"" + Math.max(0, columns.length - 1) + "\"><Data ss:Type=\"String\">" + xmlEscape(title) + "</Data></Cell></Row>";
  const header = "<Row>" + columns.map(column => "<Cell ss:StyleID=\"Header\"><Data ss:Type=\"String\">" + xmlEscape(column.label) + "</Data></Cell>").join("") + "</Row>";
  const body = rows.map(row => "<Row>" + columns.map(column => {
    const value = row[column.key] ?? "";
    const numeric = column.numeric && Number.isFinite(Number(value));
    return "<Cell><Data ss:Type=\"" + (numeric ? "Number" : "String") + "\">" + xmlEscape(numeric ? Number(value) : value) + "</Data></Cell>";
  }).join("") + "</Row>").join("");
  const widths = columns.map(column => "<Column ss:Width=\"" + Math.max(70, Math.min(220, column.label.length * 7 + 18)) + "\"/>").join("");
  const xml = "<?xml version=\"1.0\"?><?mso-application progid=\"Excel.Sheet\"?><Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><Styles><Style ss:ID=\"Default\"><Font ss:FontName=\"Arial\" ss:Size=\"10\"/></Style><Style ss:ID=\"Title\"><Font ss:FontName=\"Arial\" ss:Size=\"16\" ss:Bold=\"1\" ss:Color=\"#173E70\"/></Style><Style ss:ID=\"Header\"><Font ss:Bold=\"1\" ss:Color=\"#FFFFFF\"/><Interior ss:Color=\"#245E93\" ss:Pattern=\"Solid\"/></Style></Styles><Worksheet ss:Name=\"Fee Template\"><Table>" + widths + titleRow + header + body + "</Table></Worksheet></Workbook>";
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
export function academicYearOf(dateValue) {
  const date = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month >= 4 ? year + "-" + (year + 1) : (year - 1) + "-" + year;
}
export function studentIdentity(student) {
  return String(student?.studentCode || student?.id || student?.studentId || student?.enrollmentNumber || "");
}
export function studentIsActive(student) {
  const status = String(student?.status || "Active").trim().toLowerCase();
  const enrolled = String(student?.enrolled ?? "Yes").trim().toLowerCase();
  return !["inactive", "deactivated", "disabled", "withdrawn", "alumni"].includes(status) && !["no", "false", "0"].includes(enrolled);
}
export function studentClassKey(student) {
  return String(student?.className || student?.class || "").trim() + "::" + String(student?.section || "").trim();
}
export function studentClassLabel(className, section) {
  const classText = String(className || "").trim();
  const sectionText = String(section || "").trim();
  return classText ? classText + (sectionText ? " (" + sectionText + ")" : "") : "Unassigned";
}
export function studentNationalityKey(student) {
  return String(student?.nationality || "").trim().toLowerCase() || "__not_specified__";
}
export function studentParentClassification(student) {
  const booleanFields = ["isStaffParent", "staffParent", "parentIsStaff", "isParentStaff", "guardianIsStaff"];
  for (const field of booleanFields) {
    if (Object.prototype.hasOwnProperty.call(student || {}, field) && student[field] !== null && student[field] !== "") {
      const value = String(student[field]).toLowerCase();
      if (student[field] === true || ["true", "yes", "1"].includes(value)) return "staff";
      if (student[field] === false || ["false", "no", "0"].includes(value)) return "non-staff";
    }
  }
  const fields = [
    student?.parentType, student?.parentCategory, student?.parentEmploymentType,
    student?.parentEmploymentStatus, student?.parentDesignation, student?.guardianType,
    student?.parentOccupation, student?.fatherOccupation, student?.motherOccupation,
    student?.fatherDesignation, student?.motherDesignation
  ].map(value => String(value || "").trim().toLowerCase()).filter(Boolean);
  if (fields.some(value => /non[\s-]?staff|not staff|non[\s-]?employee|external parent|outside employee/.test(value))) return "non-staff";
  if (fields.some(value => /\bstaff\b|teacher|faculty|school employee|school worker|principal|employee parent/.test(value))) return "staff";
  return "";
}
export function studentMatchesTemplate(student, template) {
  if (!studentIsActive(student)) return false;
  if (template.studentType === "All Students") return true;
  const explicit = String(student.studentType || student.admissionType || student.admissionStatus || "").trim().toLowerCase();
  if (explicit) {
    if (template.studentType === "New Students" && (/\bnew\b|new student|first admission/.test(explicit))) return true;
    if (template.studentType === "Existing Students" && (/\bexisting\b|old student|continuing/.test(explicit))) return true;
  }
  const enrolledYear = academicYearOf(student.enrollmentDate || student.admissionDate);
  if (!enrolledYear) return false;
  return template.studentType === "New Students" ? enrolledYear === template.academicYear : enrolledYear < template.academicYear;
}
