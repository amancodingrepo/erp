import { appLocale, currencyCode, currencySymbol, formatMoney } from "../../school-locale.js";
export const FEE_REPORT_TYPES = [
  { key: "cheques", label: "Cheque Submitted Report", description: "Payments with a saved payment reference. A reference is not assumed to be a verified cheque number." },
  { key: "fee-reports", label: "Fee Reports", description: "Paid fee records within the selected settlement-date range." },
  { key: "due", label: "Fees Due Report", description: "Outstanding fee balances filtered by academic year, class, fee type and due date." },
  { key: "concession", label: "Fees Concession Report", description: "Rows with concession/discount values exposed in student data or fee names." },
  { key: "payable", label: "Fees Payable Report", description: "All fee records with an outstanding balance." },
  { key: "paid-admission", label: "Paid Fee & Admission Fee Report", description: "Paid transactions, including admission fees where they are named in the fee ledger." },
  { key: "routewise", label: "Routewise Fees Payable Report", description: "Outstanding balances grouped by the route available in student records." },
  { key: "ledger", label: "Fee Ledger", description: "Full fee ledger with paid, due, and reference information." },
  { key: "receipts", label: "Download Fee Receipts", description: "Paid fee register that can be downloaded as an Excel file or PDF." }
];

export const FEE_REPORT_COLUMNS = [
  { key: "serialNo", label: "S.No.", numeric: true },
  { key: "studentName", label: "Student Name" },
  { key: "studentCode", label: "Student ID" },
  { key: "className", label: "Class" },
  { key: "section", label: "Section" },
  { key: "academicYear", label: "Academic Year" },
  { key: "feeName", label: "Fee Type" },
  { key: "installmentName", label: "Installment" },
  { key: "feeBreakdown", label: "Fee Breakdown" },
  { key: "amount", label: "Total Fees", numeric: true },
  { key: "amountPaid", label: "Paid Fees", numeric: true },
  { key: "balance", label: "Balance", numeric: true },
  { key: "dueDate", label: "Due Date" },
  { key: "paidDate", label: "Payment Date" },
  { key: "status", label: "Fee Status" },
  { key: "studentStatus", label: "Student Status" },
  { key: "parentName", label: "Parent / Guardian" },
  { key: "fatherName", label: "Father Name" },
  { key: "hostelName", label: "Hostel" },
  { key: "routeName", label: "Route" },
  { key: "reference", label: "Payment Reference" },
  { key: "concessionAmount", label: "Concession", numeric: true }
];

export const FEE_PDF_COLUMNS = [
  { key: "studentName", label: "Student", width: 86 },
  { key: "studentCode", label: "Student ID", width: 44 },
  { key: "className", label: "Class", width: 40 },
  { key: "academicYear", label: "Year", width: 46 },
  { key: "feeName", label: "Fee Type", width: 65 },
  { key: "installmentName", label: "Installment", width: 62 },
  { key: "feeBreakdown", label: "Breakdown", width: 120 },
  { key: "amount", label: "Total", width: 48 },
  { key: "amountPaid", label: "Paid", width: 48 },
  { key: "balance", label: "Balance", width: 51 },
  { key: "dueDate", label: "Due Date", width: 50 },
  { key: "status", label: "Status", width: 44 },
  { key: "paidDate", label: "Paid Date", width: 50 },
  { key: "reference", label: "Payment Reference", width: 83 }
];

export const CONSOLIDATED_COLUMNS = [
  { key: "studentName", label: "Student Name" },
  { key: "studentCode", label: "Student ID" },
  { key: "className", label: "Class" },
  { key: "section", label: "Section" },
  { key: "academicYear", label: "Academic Year" },
  { key: "routeName", label: "Route" },
  { key: "feeCount", label: "Fee Records", numeric: true },
  { key: "amount", label: "Total Fees", numeric: true },
  { key: "amountPaid", label: "Paid Fees", numeric: true },
  { key: "balance", label: "Outstanding Balance", numeric: true }
];

export function money(value) {
  return formatMoney(Number(value || 0), { maximumFractionDigits: 2 });
}
export function plainDate(value) {
  return value ? String(value).slice(0, 10) : "";
}
export function normalized(value) {
  return String(value || "").trim().toLowerCase();
}
export function localDateKey(date) {
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
export function groupFeeInstallments(rows) {
  const groups = new Map();
  rows.forEach(fee => {
    const metadata = fee.metadata || {};
    const templateId = String(metadata.feeTemplateId || "");
    const installmentName = String(fee.installmentName || metadata.installmentName || metadata.templateFeeItems?.[0]?.originalInstallment || "");
    const dueDate = plainDate(fee.dueDate);
    const key = templateId
      ? ["template", fee.studentCode, templateId, fee.academicYear || "", installmentName, dueDate].join("|")
      : "record|" + String(fee.id);
    if (!groups.has(key)) {
      groups.set(key, {
        ...fee,
        groupedRecords: [fee],
        amount: Number(fee.amount || 0),
        amountPaid: Number(fee.amountPaid || 0),
        balance: Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0)),
        subAmount: Number(metadata.subAmount ?? fee.amount ?? 0),
        discount: Number(metadata.discount || 0),
        lateFeeCharges: Number(metadata.lateFeeCharges || 0),
        concessionAmount: Number(fee.concessionAmount || 0)
      });
    } else {
      const group = groups.get(key);
      group.groupedRecords.push(fee);
      group.amount += Number(fee.amount || 0);
      group.amountPaid += Number(fee.amountPaid || 0);
      group.balance += Math.max(0, Number(fee.amount || 0) - Number(fee.amountPaid || 0));
      group.subAmount += Number(metadata.subAmount ?? fee.amount ?? 0);
      group.discount += Number(metadata.discount || 0);
      group.lateFeeCharges += Number(metadata.lateFeeCharges || 0);
      group.concessionAmount += Number(fee.concessionAmount || 0);
    }
  });
  return [...groups.values()].map(group => {
    const records = group.groupedRecords;
    const names = [...new Set(records.map(record => {
      const firstItem = Array.isArray(record.metadata?.templateFeeItems) ? record.metadata.templateFeeItems[0] : null;
      return firstItem?.name || record.feeName || "";
    }).filter(Boolean))];
    const refs = [...new Set(records.map(record => String(record.reference || "").trim()).filter(Boolean))];
    const paidDates = [...new Set(records.map(record => plainDate(record.paidAt)).filter(Boolean))];
    group.amount = Math.round(group.amount * 100) / 100;
    group.amountPaid = Math.round(group.amountPaid * 100) / 100;
    group.balance = Math.round(group.balance * 100) / 100;
    group.subAmount = Math.round(group.subAmount * 100) / 100;
    group.discount = Math.round(group.discount * 100) / 100;
    group.lateFeeCharges = Math.round(group.lateFeeCharges * 100) / 100;
    group.concessionAmount = Math.round(group.concessionAmount * 100) / 100;
    if (group.metadata?.feeTemplateId) group.feeName = names.join(", ");
    group.feeBreakdown = records.map(record => record.feeBreakdown).filter(Boolean).join(" | ");
    group.reference = refs.join(" · ");
    group.paidDate = paidDates.join(" · ");
    group.status = group.amount > 0 && group.amountPaid >= group.amount ? "Paid" : group.amountPaid > 0 ? "Partial" : "Pending";
    return group;
  });
}
export function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
export function saveBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
export function spreadsheetXml(title, columns, rows, subtitle) {
  const rowCells = (values, style) => "<Row>" + values.map(value => {
    const isNumber = typeof value === "number" && Number.isFinite(value);
    const type = isNumber ? "Number" : "String";
    return "<Cell" + (style ? " ss:StyleID=\"" + style + "\"" : "") + "><Data ss:Type=\"" + type + "\">" + xmlEscape(value ?? "") + "</Data></Cell>";
  }).join("") + "</Row>";
  const columnXml = columns.map(column => "<Column ss:Width=\"" + Math.max(70, Math.min(200, (column.label || "").length * 7 + 18)) + "\"/>").join("");
  const titleRow = "<Row ss:Height=\"28\"><Cell ss:StyleID=\"Title\" ss:MergeAcross=\"" + Math.max(0, columns.length - 1) + "\"><Data ss:Type=\"String\">" + xmlEscape(title) + "</Data></Cell></Row>";
  const subtitleRow = "<Row><Cell ss:StyleID=\"Subtitle\" ss:MergeAcross=\"" + Math.max(0, columns.length - 1) + "\"><Data ss:Type=\"String\">" + xmlEscape(subtitle || "") + "</Data></Cell></Row>";
  const headerRow = rowCells(columns.map(column => column.label), "Header");
  const dataRows = rows.map(row => rowCells(columns.map(column => {
    const value = row[column.key];
    if (column.numeric) {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    }
    return value == null ? "" : value;
  }), ""));
  const totalRow = rowCells([
    "TOTALS", "", "", "", "", "", rows.length,
    rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0),
    rows.reduce((sum, row) => sum + Number(row.balance || 0), 0)
  ], "Total");
  return "<?xml version=\"1.0\"?>" +
    "<?mso-application progid=\"Excel.Sheet\"?>" +
    "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">" +
    "<Styles>" +
    "<Style ss:ID=\"Default\"><Alignment ss:Vertical=\"Center\"/><Font ss:FontName=\"Arial\" ss:Size=\"10\"/></Style>" +
    "<Style ss:ID=\"Title\"><Font ss:FontName=\"Arial\" ss:Size=\"16\" ss:Bold=\"1\" ss:Color=\"#173E70\"/></Style>" +
    "<Style ss:ID=\"Subtitle\"><Font ss:FontName=\"Arial\" ss:Size=\"9\" ss:Color=\"#66768B\"/></Style>" +
    "<Style ss:ID=\"Header\"><Font ss:Bold=\"1\" ss:Color=\"#FFFFFF\"/><Interior ss:Color=\"#245E93\" ss:Pattern=\"Solid\"/><Alignment ss:Vertical=\"Center\"/></Style>" +
    "<Style ss:ID=\"Total\"><Font ss:Bold=\"1\" ss:Color=\"#173E70\"/><Interior ss:Color=\"#EAF2FA\" ss:Pattern=\"Solid\"/></Style>" +
    "</Styles><Worksheet ss:Name=\"Fee Report\"><Table>" + columnXml + titleRow + subtitleRow + headerRow + dataRows.join("") +
    (columns === CONSOLIDATED_COLUMNS ? totalRow : "") + "</Table><WorksheetOptions xmlns=\"urn:schemas-microsoft-com:office:excel\"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>";
}
export function pdfSafeText(value) {
  return String(value ?? "")
    // PDF text can't draw every currency symbol: write the school's currency code instead.
    .split(currencySymbol()).join(currencyCode() + " ")
    .replace(/₹/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/·/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}
export function pdfEscape(value) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
export function buildFeePdf(title, rows, summaryText, templateSettings = null) {
  const settings = templateSettings && typeof templateSettings === "object" ? templateSettings : null;
  const portrait = settings?.pageOrientation === "portrait";
  const pageWidth = portrait ? 595 : 842;
  const pageHeight = portrait ? 842 : 595;
  const left = 26;
  const visibleColumns = settings ? {
    studentName: settings.showStudentName,
    studentCode: settings.showStudentCode,
    className: settings.showClassSection,
    academicYear: settings.showAcademicYear,
    feeBreakdown: settings.showFeeBreakdown,
    amountPaid: settings.showPaidAmount,
    balance: settings.showBalance,
    reference: settings.showPaymentReference !== false
  } : null;
  const originalColumns = settings ? FEE_PDF_COLUMNS.filter(column => visibleColumns[column.key] !== false) : FEE_PDF_COLUMNS;
  const originalWidth = originalColumns.reduce((sum, column) => sum + column.width, 0);
  const columnScale = Math.min(1, Math.max(0.1, (pageWidth - left * 2) / Math.max(1, originalWidth)));
  const columns = originalColumns.map(column => ({ ...column, width: column.width * columnScale }));
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const headerRectY = pageHeight - 97;
  const startX = left + Math.max(0, (pageWidth - left * 2 - totalWidth) / 2);
  const pages = [];
  let commands = [];
  let rowY = 0;
  let pageNumber = 0;
  const drawText = (x, y, text, size, bold, color) => {
    const font = bold ? "F2" : "F1";
    commands.push((color || "0.18 0.25 0.34") + " rg BT /" + font + " " + size + " Tf 1 0 0 1 " + Math.round(x) + " " + Math.round(y) + " Tm (" + pdfEscape(text) + ") Tj ET");
  };
  const fillRect = (x, y, width, height, color) => {
    commands.push((color || "1 1 1") + " rg " + Math.round(x) + " " + Math.round(y) + " " + Math.round(width) + " " + Math.round(height) + " re f");
  };
  const line = (x1, y1, x2, y2, color) => {
    commands.push((color || "0.86 0.89 0.92") + " RG 0.45 w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  };
  const textMax = (width, size) => Math.max(4, Math.floor((width - 7) / (size * 0.52)));
  const startPage = () => {
    pageNumber += 1;
    commands = [];
    drawText(left, pageHeight - 33, title, 17, true, "0.10 0.27 0.47");
    drawText(left, pageHeight - 50, "Generated " + new Date().toLocaleString(appLocale()), 8, false, "0.37 0.44 0.53");
    drawText(left, pageHeight - 65, summaryText, 8, true, "0.20 0.30 0.41");
    fillRect(startX, headerRectY, totalWidth, 22, "0.14 0.34 0.54");
    let x = startX;
    columns.forEach(column => {
      drawText(x + 3, headerRectY + 8, column.label.slice(0, textMax(column.width, 7)), 7, true, "1 1 1");
      x += column.width;
    });
    rowY = headerRectY - 16;
  };
  const finishPage = () => {
    if (settings?.showSignatureLine) {
      line(left, 29, left + 145, 29, "0.53 0.60 0.68");
      drawText(left, 17, "Authorized signature", 7, false, "0.37 0.44 0.53");
    }
    if (settings && String(settings.footerText || "").trim()) {
      drawText(left + 180, 17, String(settings.footerText).slice(0, 90), 7, false, "0.37 0.44 0.53");
    }
    pages.push(commands.join("\n"));
  };
  startPage();
  rows.forEach((row, index) => {
    if (rowY < 38) {
      finishPage();
      startPage();
    }
    if (index % 2 === 1) fillRect(startX, rowY - 5, totalWidth, 17, "0.95 0.97 0.99");
    line(startX, rowY - 6, startX + totalWidth, rowY - 6, "0.87 0.90 0.93");
    let x = startX;
    columns.forEach(column => {
      let value = row[column.key];
      if (["amount", "amountPaid", "balance"].includes(column.key)) value = Number(value || 0).toLocaleString(appLocale(), { maximumFractionDigits: 0 });
      const text = pdfSafeText(value);
      drawText(x + 3, rowY, text.length > textMax(column.width, 6.7) ? text.slice(0, textMax(column.width, 6.7) - 1) + "~" : text, 6.7, false, "0.20 0.25 0.31");
      x += column.width;
    });
    rowY -= 18;
  });
  if (!rows.length) drawText(startX, rowY, "No rows matched these filters.", 10, false, "0.35 0.42 0.50");
  finishPage();
  pages.forEach((page, index) => {
    pages[index] = page + "\n" + "0.45 0.50 0.56 rg BT /F1 8 Tf 1 0 0 1 " + (pageWidth - 72) + " 16 Tm (" + (index + 1) + " / " + pages.length + ") Tj ET";
  });
  const allPages = pages;
  const objects = [];
  const pageIds = allPages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  allPages.forEach((page, index) => {
    const pageId = 5 + index * 2;
    const streamId = pageId + 1;
    objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageWidth + " " + pageHeight + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + streamId + " 0 R >>";
    objects[streamId] = "<< /Length " + page.length + " >>\nstream\n" + page + "\nendstream";
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += i + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i += 1) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return pdf;
}
