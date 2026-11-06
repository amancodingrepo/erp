import { formatMoney } from "../../school-locale.js";
export function escapeReceiptHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function buildReceiptPrintHtml(data) {
  const settings = data?.feeReceiptTemplate?.receiptSettings;
  if (!settings) throw new Error("No fee receipt template is assigned in the database.");
  const enabled = key => settings[key] === true;
  const school = data?.school || {};
  const student = data?.student || {};
  const records = Array.isArray(data?.records) ? data.records : [];
  const currency = value => formatMoney(Number(value || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const field = (label, value) => value ? '<div class="field"><span>' + escapeReceiptHtml(label) + '</span><strong>' + escapeReceiptHtml(value) + '</strong></div>' : "";
  const showLogo = enabled("showSchoolLogo") && /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(String(school.logo || ""));
  const schoolLogo = showLogo ? '<img class="school-logo" src="' + escapeReceiptHtml(school.logo) + '" alt="School logo">' : "";
  const schoolDetails = [
    enabled("showSchoolAddress") ? school.address : "",
    enabled("showSchoolPhone") ? school.phone : "",
    enabled("showSchoolEmail") ? school.email : ""
  ].filter(Boolean).map(escapeReceiptHtml).join(" · ");
  const paidAmountCell = amount => enabled("showPaidAmount") ? '<td class="money">' + escapeReceiptHtml(currency(amount)) + '</td>' : "";
  const visibleLines = enabled("showFeeBreakdown") ? records.map(record =>
    '<tr><td>' + escapeReceiptHtml(record.feeName || "Fee") +
      (record.installment ? '<small>' + escapeReceiptHtml(record.installment) + '</small>' : '') +
      (record.feeNotes ? '<small class="fee-notes">Notes: ' + escapeReceiptHtml(record.feeNotes) + '</small>' : '') +
      '</td>' + paidAmountCell(record.amountPaidThisReceipt) + '</tr>'
  ).join("") : '<tr><td>Payment received</td>' + paidAmountCell(data?.totalPaid) + '</tr>';
  const paidAmount = Number(data?.totalPaid || 0);
  const balance = records.reduce((total, record) => total + Math.max(0, Number(record.amount || 0) - Number(record.amountPaid || 0)), 0);
  const portrait = settings.pageOrientation === "portrait";
  const heading = String(settings.headerText || "").trim();
  const footer = String(settings.footerText || "").trim();
  const schoolReceiptNotes = (Array.isArray(data?.feeReceiptTemplate?.receiptNotes) ? data.feeReceiptTemplate.receiptNotes : [])
    .map(note => String(typeof note === "string" ? note : note?.noteText ?? note?.text ?? "").trim())
    .filter(Boolean);
  const receiptNotesSection = schoolReceiptNotes.length
    ? '<section class="receipt-policy-notes"><h3>Notes</h3><ol>' + schoolReceiptNotes.map(note => '<li>' + escapeReceiptHtml(note) + '</li>').join("") + '</ol></section>'
    : "";

  const orientation = portrait ? "portrait" : "landscape";
  const details = [
    enabled("showStudentName") ? field("Student", student.name) : "",
    enabled("showStudentCode") ? field("Student ID", student.id) : "",
    enabled("showClassSection") ? field("Class / Section", [student.className, student.section].filter(Boolean).join(" / ")) : "",
    enabled("showAcademicYear") ? field("Academic year", student.academicYear) : "",
    enabled("showParentName") ? field("Parent / Guardian", student.parentName) : ""
  ].filter(Boolean).join("");
  const paymentDetails = [
    enabled("showReceiptNumber") ? field("Receipt number", data?.receiptNumber) : "",
    field("Receipt date", data?.receiptDate),
    field("Payment date", data?.paymentDate),
    enabled("showPaymentMethod") ? field("Payment method", data?.paymentMethod) : "",
    enabled("showPaymentReference") ? field("Payment reference", data?.reference) : ""
  ].filter(Boolean).join("");
  const balanceLine = enabled("showBalance") ? '<div class="balance"><span>Outstanding balance</span><strong>' + escapeReceiptHtml(currency(balance)) + '</strong></div>' : "";
  const signature = enabled("showSignatureLine") ? '<div class="signature"><span></span><small>Authorized signature</small></div>' : "";
  const schoolName = enabled("showSchoolName") ? '<h1>' + escapeReceiptHtml(school.name || "School") + '</h1>' : "";
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeReceiptHtml(heading) + '</title><style>' +
    '@page{size:A4 ' + orientation + ';margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#203249;margin:0;background:#fff;font-size:12px}' +
    '.receipt{max-width:780px;margin:0 auto;border:1px solid #d9e2ec;border-radius:10px;padding:25px 28px}.brand{display:flex;gap:16px;align-items:center;border-bottom:2px solid #1b5f98;padding-bottom:18px;margin-bottom:18px}' +
    '.school-logo{width:76px;height:76px;object-fit:contain}.brand-copy{flex:1}h1{font-size:22px;margin:0 0 6px;color:#123c63}h2{font-size:17px;margin:20px 0 14px;color:#174f80;letter-spacing:.06em}' +
    '.school-details{color:#63768b;line-height:1.6}.receipt-policy-notes{margin-top:16px;padding:12px 14px;border:1px solid #d9e2ec;border-radius:7px;break-inside:avoid}.receipt-policy-notes h3{margin:0 0 9px;color:#234f77;font-size:15px}.receipt-policy-notes ol{margin:0;padding-left:24px}.receipt-policy-notes li{margin:0 0 7px;font-size:14px;line-height:1.6;overflow-wrap:anywhere}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 22px;margin:16px 0}.field span{display:block;color:#77879a;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}.field strong{font-size:12px;color:#233a52;overflow-wrap:anywhere}' +
    'table{width:100%;border-collapse:collapse;margin-top:14px}th{text-align:left;background:#eaf2fa;color:#234f77;font-size:10px;text-transform:uppercase;letter-spacing:.05em}th,td{padding:11px 10px;border-bottom:1px solid #e1e8ef}td small{display:block;color:#718398;margin-top:4px}.fee-notes{white-space:pre-wrap;overflow-wrap:anywhere;color:#4e6278!important}.money{text-align:right;white-space:nowrap}.total{display:flex;justify-content:flex-end;gap:40px;align-items:center;margin-top:16px;padding:14px;background:#f0f6fb;border-radius:8px}.total span,.balance span{color:#5c7187}.total strong{font-size:19px;color:#174f80}.balance{display:flex;justify-content:space-between;margin-top:10px;padding:9px 12px;background:#fafbfd;border:1px solid #e6edf4;border-radius:7px}.notes{margin-top:16px;white-space:pre-wrap;color:#5f7186}.signature{width:190px;margin:50px 0 0 auto;text-align:center}.signature span{display:block;border-top:1px solid #8393a5;margin-bottom:8px}.signature small{color:#63768b}.footer{border-top:1px solid #e1e8ef;padding-top:13px;margin-top:25px;color:#718398;text-align:center}' +
    '@media print{body{background:#fff}.receipt{border:0;border-radius:0;padding:0;max-width:none}}@media(max-width:560px){.receipt{padding:15px}.fields{grid-template-columns:1fr}.brand{align-items:flex-start}h1{font-size:18px}}' +
    '</style></head><body><main class="receipt"><header class="brand">' + schoolLogo + '<div class="brand-copy">' + schoolName +
    '<div class="school-details">' + schoolDetails + '</div></div></header><h2>' + escapeReceiptHtml(heading) + '</h2>' +
    '<section class="fields">' + paymentDetails + '</section><h3>Student details</h3><section class="fields">' + details + '</section>' +
    '<table><thead><tr><th>Fee / installment</th>' + (enabled("showPaidAmount") ? '<th class="money">Paid in this receipt</th>' : "") + '</tr></thead><tbody>' + visibleLines + '</tbody></table>' +
    (enabled("showPaidAmount") ? '<div class="total"><span>Total received</span><strong>' + escapeReceiptHtml(currency(paidAmount)) + '</strong></div>' : "") + balanceLine +
    (data?.notes ? '<div class="notes"><strong>Payment notes:</strong> ' + escapeReceiptHtml(data.notes) + '</div>' : '') + receiptNotesSection + signature +
    (footer ? '<div class="footer">' + escapeReceiptHtml(footer) + '</div>' : '') +
    '</main><script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},250);});<\/script></body></html>';
}
