import React from "react";
import { FEE_REPORT_TYPES, money, plainDate, groupFeeInstallments } from "./feeReportUtils.js";
import { moneyLabel } from "../../school-locale.js";

export default function FeesManageSection({ context }) {
  const { t, feeRecords, collected, totalDue, studentsWithDues, ledgerFilterMode, setLedgerFilterMode, query, setQuery, manageYear, setManageYear, academicYears, classOptions, manageClass, setManageClass, reminderBusy, loading, sendFeeRemindersToStudents, reportMenuOpen, setReportMenuOpen, openReport, exportManageXls, exportManagePdf, showAddForm, feeDraft, setFeeDraft, students, feeBusy, addFeeRecord, studentSummaryRows, expandedStudentRows, setExpandedStudentRows, openStudentFees, printFeeReceipt } = context;
  return (
    <>
   <section className="fees-metric-grid" aria-label="Fee summary">
        <article className="fees-metric blue"><span>{t("Fee Records")}</span><strong>{feeRecords.length}</strong><small>{t("Saved fee ledger entries")}</small></article>
        <article className="fees-metric green"><span>{t("Amount Collected")}</span><strong>{money(collected)}</strong><small>{t("Recorded payments")}</small></article>
        <article className="fees-metric amber"><span>{t("Outstanding Balance")}</span><strong>{money(totalDue)}</strong><small>{t("Amounts remaining")}</small></article>
        <button type="button" className="fees-metric violet fees-metric-clickable" aria-pressed={ledgerFilterMode === "outstanding"} onClick={() => { setLedgerFilterMode(current => current === "outstanding" ? "all" : "outstanding"); setQuery(""); setManageYear(""); setManageClass(""); }}><span>{t("Students With Dues")}</span><strong>{studentsWithDues}</strong><small>{t("Click to show fee records with an outstanding balance")}</small></button>
      </section>

      <section className="fees-filter-panel">
        <div className="fees-filter-fields">
          <label>{t("Academic Year")}
            <select value={manageYear} onChange={event => setManageYear(event.target.value)}>
              <option value="">{t("All academic years")}</option>
              {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>{t("Class")}
            <select value={manageClass} onChange={event => setManageClass(event.target.value)}>
              <option value="">{t("All classes")}</option>
              {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
          <label className="fees-search-field">{t("Search")}
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Student, ID, fee type or reference")} />
          </label>
        </div>
        <div className="fees-reminder-toolbar" aria-label={t("Fee reminder actions")}>
          <button type="button" className="fees-reminder-button fees-reminder-all" onClick={() => sendFeeRemindersToStudents({ allClasses: true })} disabled={reminderBusy || loading}>
            {reminderBusy ? t("Creating reminders…") : t("Send Fee Reminder to All Classes")}
          </button>
          <button type="button" className="fees-reminder-button fees-reminder-class" onClick={() => sendFeeRemindersToStudents()} disabled={reminderBusy || loading || !manageClass}>
            {reminderBusy ? t("Creating reminders…") : t("Fee Reminder")}
          </button>
          {!manageClass && <span className="fees-reminder-hint">{t("Select a class for the class reminder.")}</span>}
        </div>
        <div className="fees-toolbar-actions">
          <div className="fees-report-menu-wrap">
            <button type="button" className="fees-button fees-button-blue" aria-expanded={reportMenuOpen} onClick={() => setReportMenuOpen(open => !open)}>{t("Reports")} <span>▾</span></button>
            {reportMenuOpen && <div className="fees-report-menu">
              {FEE_REPORT_TYPES.map(report => <button type="button" key={report.key} onClick={() => openReport(report.key)}><strong>{t(report.label)}</strong><small>{report.description}</small></button>)}
            </div>}
          </div>
          <button type="button" className="fees-button fees-button-light" onClick={exportManageXls}>{t("Export XLS")}</button>
          <button type="button" className="fees-button fees-button-light" onClick={exportManagePdf}>{t("Export PDF")}</button>
        </div>
      </section>

      {showAddForm && <section className="fees-card">
        <div className="fees-card-heading"><div><h3>{t("Add fee record")}</h3><p>{t("Save a fee against a student in the school database.")}</p></div></div>
        <div className="fees-form-grid">
          <label>{t("Student")}
            <select value={feeDraft.studentCode} onChange={event => setFeeDraft(previous => ({ ...previous, studentCode: event.target.value }))}>
              <option value="">{t("Select student")}</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.name || student.fullName} · {student.id}</option>)}
            </select>
          </label>
          <label>{t("Academic Year")}
            <select value={feeDraft.academicYear} onChange={event => setFeeDraft(previous => ({ ...previous, academicYear: event.target.value }))}>
              {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
              {!academicYears.includes(feeDraft.academicYear) && feeDraft.academicYear && <option value={feeDraft.academicYear}>{feeDraft.academicYear}</option>}
            </select>
          </label>
          <label>{t("Fee name")}<input value={feeDraft.feeName} onChange={event => setFeeDraft(previous => ({ ...previous, feeName: event.target.value }))} placeholder={t("Tuition Fee")} /></label>
          <label>{moneyLabel(t("Amount"))}<input type="number" min="0" step="0.01" value={feeDraft.amount} onChange={event => setFeeDraft(previous => ({ ...previous, amount: event.target.value }))} /></label>
          <label>{moneyLabel(t("Amount paid"))}<input type="number" min="0" step="0.01" value={feeDraft.amountPaid} onChange={event => setFeeDraft(previous => ({ ...previous, amountPaid: event.target.value }))} /></label>
          <label>{t("Due date")}<input type="date" value={feeDraft.dueDate} onChange={event => setFeeDraft(previous => ({ ...previous, dueDate: event.target.value }))} /></label>
          <label className="fees-wide-field">{t("Payment reference")}<input value={feeDraft.reference} onChange={event => setFeeDraft(previous => ({ ...previous, reference: event.target.value }))} placeholder={t("Receipt or transaction number")} /></label>
        </div>
        <div className="fees-card-actions"><button type="button" className="fees-button fees-button-primary" disabled={feeBusy} onClick={addFeeRecord}>{feeBusy ? t("Saving…") : t("Save fee record")}</button><button type="button" className="fees-button fees-button-light" onClick={() => setShowAddForm(false)}>{t("Cancel")}</button></div>
      </section>}

      {ledgerFilterMode !== "all" && <div className="fees-ledger-filter-notice"><span>{t(ledgerFilterMode === "due-through-today" ? "Showing outstanding balances with a due date through today." : "Showing all fee records with an outstanding balance.")}</span><button type="button" className="fees-link-button" onClick={() => setLedgerFilterMode("all")}>{t("Show all fee records")}</button></div>}
      <section className="fees-card fees-main-ledger-card fees-student-summary-card">
        <div className="fees-card-heading"><div><h3>{t("Fee ledger")}</h3><p>{studentSummaryRows.length} {t("students")} · {money(studentSummaryRows.reduce((sum, row) => sum + row.balance, 0))} {t("outstanding in this view")}</p></div><span className="fees-count-pill">{studentSummaryRows.length} {t("students")}</span></div>
        <div className="fees-table-scroll fees-ledger-table-scroll">
          <table className="fees-table fees-student-summary-table">
            <thead><tr><th>{t("Student Name")}</th><th>{t("Total Fees")}</th><th>{t("Paid Fees")}</th><th>{t("Next Payment Date")}</th><th>{t("Action")}</th></tr></thead>
            <tbody>{studentSummaryRows.map(summary => {
              const expanded = Boolean(expandedStudentRows[summary.studentCode]);
              const installmentRows = groupFeeInstallments(summary.fees);
              return <React.Fragment key={summary.studentCode}>
                <tr className="fees-student-summary-row">
                  <td><div className="fees-student-summary-name-cell">
                    <button type="button" className="fees-student-expand" aria-label={(expanded ? t("Collapse") : t("Expand")) + " " + summary.studentName + " fee details"} aria-expanded={expanded} onClick={() => setExpandedStudentRows(previous => ({ ...previous, [summary.studentCode]: !previous[summary.studentCode] }))}>{expanded ? "▾" : "▸"}</button>
                    <span className="fees-student-summary-name"><strong>{summary.studentName}</strong><small>{summary.className || "—"}{summary.section ? " · " + summary.section : ""} · {summary.studentCode}</small></span>
                  </div></td>
                  <td className="fees-money">{money(summary.totalFees)}</td>
                  <td className="fees-money">{money(summary.paidFees)}</td>
                  <td>{plainDate(summary.nextPaymentDate) || "—"}</td>
                  <td><button type="button" className="fees-pay-edit-button" onClick={() => openStudentFees(summary)}>{t("Pay / Edit")}</button></td>
                </tr>
                {expanded && <tr className="fees-student-detail-row"><td colSpan={5}>
                  <div className="fees-student-detail-wrap">
                    <div className="fees-student-detail-heading"><strong>{t("Fee details")}</strong><span>{installmentRows.length} {t("installment row(s)")}</span></div>
                    <table className="fees-table fees-installment-detail-table">
                      <thead><tr><th>{t("Fee Type / Installment")}</th><th>{t("Total Fees")}</th><th>{t("Paid Fees")}</th><th>{t("Outstanding")}</th><th>{t("Due Date")}</th><th>{t("Status")}</th><th>{t("Receipt")}</th></tr></thead>
                      <tbody>{installmentRows.map((fee, index) => <tr key={(fee.groupedRecords || [fee]).map(record => record.id).join("-")}>
                        <td><strong>{fee.feeName || "—"}</strong>{fee.metadata?.feeTemplateName && <small>{fee.metadata.feeTemplateName}</small>}{(fee.installmentName || fee.metadata?.installmentName || fee.metadata?.templateFeeItems?.[0]?.originalInstallment) && <small>{fee.installmentName || fee.metadata?.installmentName || fee.metadata?.templateFeeItems?.[0]?.originalInstallment}</small>}{fee.groupedRecords?.length > 1 && <small>{fee.groupedRecords.length} {t("fee types in this installment")}</small>}{fee.feeBreakdown && <small className="fee-report-breakdown">{fee.feeBreakdown}</small>}</td>
                        <td className="fees-money">{money(fee.amount)}</td><td className="fees-money">{money(fee.amountPaid)}</td><td className="fees-money">{money(fee.balance)}</td><td>{plainDate(fee.dueDate) || "—"}</td>
                        <td><span className={"fees-status " + (fee.balance <= 0 ? "paid" : Number(fee.amountPaid || 0) > 0 ? "partial" : "due")}>{t(fee.balance <= 0 ? "Paid" : Number(fee.amountPaid || 0) > 0 ? "Partial" : "Pending")}</span></td>
                        <td><button type="button" className="fees-pay-edit-button" disabled={Number(fee.amountPaid || 0) <= 0} onClick={() => printFeeReceipt(fee)}>{t("Print receipt")}</button></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                </td></tr>}
              </React.Fragment>;
            })}</tbody>
          </table>
          {loading ? <div className="fees-empty">{t("Loading fee records…")}</div> : !studentSummaryRows.length ? <div className="fees-empty">{t("No fee records match the current filters.")}</div> : null}
        </div>
      </section>
    
    </>
  );
}
