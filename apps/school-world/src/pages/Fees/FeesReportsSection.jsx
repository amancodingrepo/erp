import React from "react";
import { FEE_REPORT_TYPES, CONSOLIDATED_COLUMNS, money, plainDate } from "./feeReportUtils.js";

export default function FeesReportsSection({ context }) {
  const { t, setView, selectedReport, reportType, setReportType, setReportSort, setReportGenerated, reportFilters, updateReportFilter, academicYears, classOptions, students, feeTypes, hostelOptions, routeOptions, reportSort, includeSchoolName, setIncludeSchoolName, generateReport, exportXls, exportPdf, reportRows, reportGenerated, reportTotal, reportPaid, reportOutstanding, reportTableColumns } = context;
  return (
    <section className="fees-reports-view">
      <div className="fees-report-title-row">
        <div><span className="fees-eyebrow">{t("REPORT CENTER")}</span><h3>{t(selectedReport.label)}</h3><p>{t(selectedReport.description)}</p></div>
        <button type="button" className="fees-button fees-button-light" onClick={() => setView("manage")}>← {t("Back to Manage Fees")}</button>
      </div>
      <section className="fees-card fees-report-filter-card">
        <div className="fees-report-filter-grid">
          <label>{t("Report")}
            <select value={reportType} onChange={event => { const nextType = event.target.value; setReportType(nextType); setReportSort(nextType === "routewise" ? "routeName" : "studentName"); setReportGenerated(false); }}>
              {FEE_REPORT_TYPES.map(report => <option key={report.key} value={report.key}>{t(report.label)}</option>)}
            </select>
          </label>
          <label>{t("Academic Year")}
            <select value={reportFilters.academicYear} onChange={event => updateReportFilter("academicYear", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>{t("Class")}
            <select value={reportFilters.className} onChange={event => updateReportFilter("className", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
          <label>{t("Section")}
            <select value={reportFilters.section} onChange={event => updateReportFilter("section", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {[...new Set(students.filter(student => !reportFilters.className || String(student.className || student.class) === reportFilters.className).map(student => student.section).filter(Boolean).map(String))].sort().map(section => <option key={section} value={section}>{section}</option>)}
            </select>
          </label>
          <label>{t("Fee Type")}
            <select value={reportFilters.feeType} onChange={event => updateReportFilter("feeType", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {feeTypes.map(feeType => <option key={feeType} value={feeType}>{feeType}</option>)}
            </select>
          </label>
          <label>{t("Hostel")}
            <select value={reportFilters.hostel} onChange={event => updateReportFilter("hostel", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {hostelOptions.map(hostel => <option key={hostel} value={hostel}>{hostel}</option>)}
            </select>
          </label>
          <label>{t("From Date")}<input type="date" value={reportFilters.fromDate} onChange={event => updateReportFilter("fromDate", event.target.value)} /></label>
          <label>{t("To Date")}<input type="date" min={reportFilters.fromDate || undefined} value={reportFilters.toDate} onChange={event => updateReportFilter("toDate", event.target.value)} /></label>
          <label>{t("In Route")}
            <select value={reportFilters.route} onChange={event => updateReportFilter("route", event.target.value)}>
              <option value="">{t("-- All --")}</option>
              {routeOptions.map(route => <option key={route} value={route}>{route}</option>)}
            </select>
          </label>
          <label>{t("Student Status")}
            <select value={reportFilters.studentStatus} onChange={event => updateReportFilter("studentStatus", event.target.value)}>
              <option value="All">{t("-- All --")}</option><option value="Active">{t("Active")}</option><option value="Inactive">{t("Inactive")}</option>
            </select>
          </label>
          <label>{t("Sort By")}
            <select value={reportSort} onChange={event => { setReportSort(event.target.value); setReportGenerated(false); }}>
              <option value="studentName">{t("Student Name")}</option><option value="routeName">{t("Route")}</option><option value="dueDate">{t("Due Date")}</option><option value="balance">{t("Balance (low to high)")}</option><option value="amountPaid">{t("Paid Amount (low to high)")}</option>
            </select>
          </label>
          <label>{t("Search by payment reference")}<input value={reportFilters.referenceSearch} onChange={event => updateReportFilter("referenceSearch", event.target.value)} placeholder={t("Receipt / cheque / transaction ref")} /></label>
        </div>
        <div className="fees-report-extra-options">
          <label><input type="checkbox" checked={includeSchoolName} onChange={event => setIncludeSchoolName(event.target.checked)} /> {t("Include school name in downloaded report")}</label>
          {reportType === "concession" && <span>{t("Concession details are shown only when available in the student data or fee name; no concession amount is inferred.")}</span>}
          {reportType === "cheques" && <span>{t("This report filters payment references saved on fee records; it does not invent bank or cheque data.")}</span>}
        </div>
        <div className="fees-report-buttons">
          <button type="button" className="fees-button fees-button-green" onClick={generateReport}>{t("Show report")}</button>
          <button type="button" className="fees-button fees-button-teal" onClick={() => exportXls(selectedReport.label, reportRows)}>{t("Export XLS")}</button>
          <button type="button" className="fees-button fees-button-teal" onClick={() => exportPdf(selectedReport.label, reportRows)}>{t("Export to PDF")}</button>
          <button type="button" className="fees-button fees-button-outline-teal" onClick={() => exportXls(selectedReport.label + " - Consolidated", consolidatedRows, CONSOLIDATED_COLUMNS)}>{t("Export Consolidated XLS")}</button>
          {reportType === "receipts" && <button type="button" className="fees-button fees-button-light" onClick={() => exportPdf("Fee Receipt Register", reportRows)}>{t("Download Fee Receipts PDF")}</button>}
        </div>
      </section>

      {reportGenerated && <section className="fees-card fees-report-results">
        <div className="fees-card-heading"><div><h3>{t(selectedReport.label)}</h3><p>{reportRows.length} {t("records")} · {t("Total")}: {money(reportTotal)} · {t("Paid")}: {money(reportPaid)} · {t("Outstanding")}: {money(reportOutstanding)}</p></div><span className="fees-count-pill">{reportRows.length} {t("rows")}</span></div>
        <div className="fees-table-scroll fees-report-table-scroll">
          <table className="fees-table fees-report-table"><thead><tr>{reportTableColumns.map(column => <th key={column.key}>{t(column.label)}</th>)}</tr></thead>
            <tbody>{reportRows.map(row => <tr key={row.id}><td>{row.serialNo}</td><td><strong>{row.studentName}</strong><small>{row.parentName || row.studentCode}</small></td><td>{row.studentCode || "—"}</td><td>{row.className || "—"}</td><td>{row.section || "—"}</td><td>{row.academicYear || "—"}</td><td>{row.feeName || "—"}</td><td><small className="fee-report-breakdown">{row.feeBreakdown || "—"}</small></td><td className="fees-money">{money(row.amount)}</td><td className="fees-money">{money(row.amountPaid)}</td><td className="fees-money">{money(row.balance)}</td><td>{plainDate(row.dueDate) || "—"}</td><td>{row.paidDate || "—"}</td><td><span className={"fees-status " + (row.status === "Paid" ? "paid" : row.status === "Partial" ? "partial" : "due")}>{t(row.status || "Pending")}</span></td><td>{row.routeName || "—"}</td><td>{row.reference || "—"}</td></tr>)}</tbody>
          </table>
          {!reportRows.length && <div className="fees-empty">{t("No fee records match these report filters.")}</div>}
        </div>
      </section>}
    </section>
  );
}
