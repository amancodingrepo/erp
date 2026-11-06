import { academicYearNow } from "../../../school-options.js";
import { schoolToday } from "../../../school-locale.js";
/** The school's current year (from its sessions), else the year containing `date`. */
export function currentAcademicYear(date = new Date()) {
  return academicYearNow(date);
}

/** Today's date at the school (YYYY-MM-DD), or a given date's calendar day. */
export function localDateString(date) {
  if (!date) return schoolToday();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export function suggestedEnrollmentNumber(academicYear = currentAcademicYear()) {
  const year = String(academicYear || currentAcademicYear()).split("-")[0];
  const suffix = Date.now().toString().slice(-6);
  return "ENR-" + year + "-" + suffix;
}

export function compressStudentPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!String(file.type || "").startsWith("image/")) {
      reject(new Error("Choose an image file for the student photo."));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 12 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected photo could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The selected photo could not be opened."));
      image.onload = () => {
        const maxDimension = 640;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("The browser could not process this photo."));
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.78);
        const bytes = Math.ceil((compressed.length - compressed.indexOf(",") - 1) * 3 / 4);
        if (bytes > 1.8 * 1024 * 1024) {
          reject(new Error("The compressed student photo is still too large. Choose a smaller image."));
          return;
        }
        resolve(compressed);
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function discountForLine(amount, discountType, discountValue) {
  const value = Math.max(0, Number(discountValue) || 0);
  const raw = discountType === "Percentage"
    ? Math.min(amount, amount * Math.min(value, 100) / 100)
    : discountType === "Fixed Amount" ? Math.min(amount, value) : 0;
  return Math.round(raw * 100) / 100;
}

export function buildFeeTemplateApplication(template, feeTypes, studentCode, academicYear, notes = "") {
  if (!template) return { error: "Choose a fee template first." };
  const feeItems = (template.installments || []).flatMap(installment =>
    (installment.fees || [])
      .filter(line => line.feeTypeId && String(line.amount).trim() !== "" && Number.isFinite(Number(line.amount)) && Number(line.amount) >= 0)
      .map(line => {
        const feeType = feeTypes.find(type => String(type.id) === String(line.feeTypeId));
        const taxes = feeType?.taxes || line.taxes || {};
        const baseAmount = Math.max(0, Number(line.amount || 0));
        const discountType = line.discountType || "Default Discount";
        const discountValue = Number(line.discountValue || 0);
        const discountAmount = discountForLine(baseAmount, discountType, discountValue);
        const taxableAmount = Math.max(0, baseAmount - discountAmount);
        const taxRate = (taxes.cgst ? 9 : 0) + (taxes.sgst ? 9 : 0) + (taxes.igst ? 18 : 0);
        const taxAmount = Math.round(taxableAmount * taxRate) / 100;
        return {
          feeTypeId: String(line.feeTypeId),
          name: String(line.feeTypeName || feeType?.name || "Fee"),
          baseAmount,
          discountType,
          discountValue,
          discountAmount,
          taxes: { cgst: Boolean(taxes.cgst), sgst: Boolean(taxes.sgst), igst: Boolean(taxes.igst) },
          taxAmount: Math.round(taxAmount * 100) / 100,
          notes: String(line.notes || "").trim(),
          originalInstallment: String(installment.installment || ""),
          originalDueDate: line.originalDueDate || installment.dueDate || null,
          installmentNotes: String(installment.notes || "").trim()
        };
      })
  );

  if (!feeItems.length) return { error: "The selected fee template has no valid fee items. Review it in Manage Fee Templates first." };
  const feeNames = [...new Set(feeItems.map(item => item.name).filter(Boolean))];
  const feeName = feeNames.join(", ").slice(0, 240);
  const subAmount = Math.round(feeItems.reduce((sum, item) => sum + item.baseAmount, 0) * 100) / 100;
  const discount = Math.round(feeItems.reduce((sum, item) => sum + item.discountAmount, 0) * 100) / 100;
  const appliedTaxes = Math.round(feeItems.reduce((sum, item) => sum + item.taxAmount, 0) * 100) / 100;
  const dueDate = feeItems.map(item => item.originalDueDate).filter(Boolean).sort()[0] || null;
  const combinedNotes = [...new Set([notes, ...feeItems.flatMap(item => [item.installmentNotes, item.notes])].map(value => String(value || "").trim()).filter(Boolean))].join(" | ").slice(0, 500);

  if (!feeName || subAmount <= 0 || discount > subAmount) return { error: "The selected fee template does not produce a valid fee total." };
  return {
    payload: {
      templateId: String(template.id),
      templateName: String(template.name),
      academicYear: String(academicYear || template.academicYear || currentAcademicYear()),
      installmentName: "Multiple Installments",
      studentCodes: [String(studentCode)],
      feeName,
      subAmount,
      discount,
      appliedTaxes,
      lateFeeCharges: 0,
      dueDate,
      notes: combinedNotes,
      feeItems
    }
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function openAdmissionDocumentChecklist(student = {}, onBlocked) {
  const popup = window.open("", "_blank");
  if (!popup) {
    onBlocked?.("Your browser blocked the checklist window. Allow pop-ups and try again.");
    return;
  }
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || "New Student";
  const checklist = [
    "Completed admission form",
    "Student date-of-birth proof",
    "Previous school transfer certificate, if applicable",
    "Previous academic report / marksheet",
    "Aadhaar or other identity proof, if applicable",
    "Recent passport-size photographs",
    "Parent / guardian identity and contact details",
    "Category or RTE supporting documents, if applicable",
    "Immunization / medical records, if available"
  ];
  const rows = checklist.map(item => "<li><span class='box'></span>" + escapeHtml(item) + "</li>").join("");
  popup.document.open();
  popup.document.write("<!doctype html><html><head><meta charset='utf-8'><title>Admission Documents Checklist</title><style>body{font-family:Arial,sans-serif;color:#1f344b;margin:32px}h1{font-size:22px;margin:0 0 6px}p{color:#64778c;font-size:12px;margin:6px 0 20px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.line{border-bottom:1px solid #aab8c7;padding:8px 0;font-size:12px}ul{padding:0;list-style:none}li{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #e5ebf2;font-size:13px}.box{width:15px;height:15px;border:1px solid #7d8fa3;display:inline-block;flex:0 0 15px}@media print{body{margin:18mm}.no-print{display:none}}</style></head><body><h1>Student Admission — Document Checklist</h1><p>Please tick the documents submitted to the school. Requirements may vary by school and student category.</p><div class='meta'><div class='line'><b>Student:</b> " + escapeHtml(fullName) + "</div><div class='line'><b>Academic Year:</b> " + escapeHtml(student.academicYear || "") + "</div><div class='line'><b>Class:</b> " + escapeHtml(student.className || "") + "</div><div class='line'><b>Enrollment No.:</b> " + escapeHtml(student.enrollmentNumber || "To be assigned") + "</div></div><ul>" + rows + "</ul><div class='meta'><div class='line'><b>Received By:</b></div><div class='line'><b>Date:</b></div></div><button class='no-print' onclick='window.print()'>Print / Save as PDF</button><script>setTimeout(function(){window.print()},350);</script></body></html>");
  popup.document.close();
}
