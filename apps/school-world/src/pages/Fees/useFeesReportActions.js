import { apiGet } from "../../api.js";
import { buildReceiptPrintHtml } from "./FeesReceiptPrint.js";
import { FEE_REPORT_COLUMNS, money, saveBlob, spreadsheetXml, buildFeePdf } from "./feeReportUtils.js";

export default function useFeesReportActions({ setReportFilters, setReportGenerated, setReportType, setReportSort, setView, setReportMenuOpen, notify, includeSchoolName, schoolName, reportType, feeReceiptTemplate, selectedReport, reportRows, filteredFeeLedgerRows }) {
  function updateReportFilter(key, value) {
    setReportFilters(previous => ({ ...previous, [key]: value }));
    setReportGenerated(false);
  }
  function openReport(key) {
    setReportType(key);
    setReportSort(key === "routewise" ? "routeName" : "studentName");
    setView("reports");
    setReportGenerated(false);
    setReportMenuOpen(false);
    setReportFilters(previous => ({ ...previous, fromDate: "", toDate: "", referenceSearch: "" }));
  }
  function exportXls(title, rows, columns = FEE_REPORT_COLUMNS) {
    if (!rows.length) {
      notify("There are no matching fee records to export. Change the filters or generate another report.");
      return;
    }
    const subtitle = "School: " + (includeSchoolName ? schoolName : "School World") + " | Generated: " + new Date().toLocaleString("en-IN") + " | Records: " + rows.length;
    saveBlob(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".xls", spreadsheetXml(title, columns, rows, subtitle), "application/vnd.ms-excel;charset=utf-8");
    notify("Excel-compatible report downloaded.");
  }
  function exportPdf(title, rows) {
    if (!rows.length) {
      notify("There are no matching fee records to export. Click Show after adjusting the filters.");
      return;
    }
    const totals = "Records: " + rows.length + " | Total fees: " + money(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)) +
      " | Paid: " + money(rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0)) +
      " | Outstanding: " + money(rows.reduce((sum, row) => sum + Number(row.balance || 0), 0));
    const receiptSettings = reportType === "receipts" ? feeReceiptTemplate?.receiptSettings : null;
    if (reportType === "receipts" && !receiptSettings) {
      notify("A Super Admin must assign a fee receipt template before receipt reports can be exported.");
      return;
    }
    const finalTitle = reportType === "receipts"
      ? ((receiptSettings.showSchoolName ? schoolName + " - " : "") + String(receiptSettings.headerText || "").trim())
      : (includeSchoolName ? schoolName + " - " + title : title);
    saveBlob(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".pdf", buildFeePdf(finalTitle, rows, totals, receiptSettings), "application/pdf");
    notify("PDF report downloaded.");
  }
  async function printFeeReceipt(fee) {
    const feeId = String(fee?.id || (fee?.groupedRecords || [])[0]?.id || "");
    if (!feeId) {
      notify("This fee row does not have a saved fee record ID.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=760");
    if (!printWindow) {
      notify("Allow pop-ups for School World to print a fee receipt.");
      return;
    }
    try {
      printWindow.document.open();
      printWindow.document.write("<!doctype html><html><head><title>Loading fee receipt…</title></head><body style='font-family:Arial,sans-serif;padding:30px;color:#456'>Loading saved payment details…</body></html>");
      printWindow.document.close();
      const receipt = await apiGet("/fees/" + encodeURIComponent(feeId) + "/receipt-data");
      if (!receipt?.feeReceiptTemplate?.receiptSettings) throw new Error("No fee receipt template is assigned in the database. Ask Super Admin to apply one.");
      printWindow.document.open();
      printWindow.document.write(buildReceiptPrintHtml(receipt));
      printWindow.document.close();
    } catch (error) {
      try { printWindow.close(); } catch (_) {}
      notify("Fee receipt could not be opened: " + (error?.message || "Please try again."));
    }
  }

  function exportManageXls() {
    exportXls("Fee Ledger", filteredFeeLedgerRows.map((row, index) => ({ ...row, serialNo: index + 1 })));
  }
  function exportManagePdf() {
    exportPdf("Fee Ledger", filteredFeeLedgerRows);
  }
  function generateReport() {
    setReportGenerated(true);
    notify(selectedReport.label + " generated with " + reportRows.length + " record(s).");
  }
  return { updateReportFilter, openReport, exportXls, exportPdf, printFeeReceipt, exportManageXls, exportManagePdf, generateReport };
}
