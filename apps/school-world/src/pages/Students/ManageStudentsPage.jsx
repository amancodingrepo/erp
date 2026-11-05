import React from "react";
import { FileSpreadsheet, UploadCloud, Home, ChevronRight, CheckCircle2 } from "lucide-react";
import { t } from "../../i18n.jsx";
import ManageStudentsHeader from "./ManageStudentsHeader.jsx";
import StudentSummaryCards from "./StudentSummaryCards.jsx";
import StudentDirectoryControls from "./StudentDirectoryControls.jsx";
import StudentDirectoryResults from "./StudentDirectoryResults.jsx";
import StudentActionDialog from "./StudentActionDialog.jsx";
import "./BulkStudentImport.css";

export default function ManageStudentsPage({ context }) {
  const {
    schoolName, user, onLogout, navItems, currentView, activeSidebarModule, openSidebarModule,
    students, downloadStudentCsvTemplate, csvInputRef, handleStudentCsvImport, importBusy,
    downloadStudentExcelTemplate, excelInputRef, handleStudentExcelImport, excelImportBusy,
    excelImportErrors = [], excelImportSummary = "",
    setActiveTab, page, setPage, classFilter, setClassFilter, availableClasses, yearFilter,
    setYearFilter, availableYears, query, setQuery, showFilters, setShowFilters, sortBy,
    setSortBy, activeTab, design, setDesign, visible, filtered, safePage, pageSize,
    setPageSize, totalPages, actions, openAction, actionLabel, toast, clearToast, modal, setModal,
    form, setForm, feeDetailsLoading, feeDetailRecords, submitModal, notify
  } = context;

  return (
    <div className="app-shell">
      <ManageStudentsHeader context={{ schoolName, navItems, currentView, activeSidebarModule, openSidebarModule, notify }} />
      <main className="main">
        <div className="page-top">
          <div>
            <div className="eyebrow">{t("STUDENT ADMINISTRATION")}</div>
            <h1>{t("Manage Students")}</h1>
            <p>{t("Student directory and account management.")}</p>
          </div>
          <div className="page-top-tools">
            <div className="page-import-tools">
              <button type="button" className="outline-button" onClick={downloadStudentExcelTemplate} title={t("Download the complete Excel template with required fields")}><FileSpreadsheet size={15}/>{t("Excel template")}</button>
              <button type="button" className="primary-button" onClick={() => excelInputRef.current?.click()} disabled={excelImportBusy || importBusy}><UploadCloud size={15}/>{excelImportBusy ? t("Validating / importing…") : t("Bulk upload Excel")}</button>
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden onChange={handleStudentExcelImport}/>
              <button type="button" className="outline-button" onClick={downloadStudentCsvTemplate} title={t("Download CSV import template")}><FileSpreadsheet size={15}/>{t("CSV template")}</button>
              <button type="button" className="outline-button" onClick={() => csvInputRef.current?.click()} disabled={importBusy || excelImportBusy}><UploadCloud size={15}/>{importBusy ? t("Importing…") : t("Import CSV")}</button>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleStudentCsvImport}/>
            </div>
            <div className="breadcrumb"><Home size={15}/>{t(" Home ")}<ChevronRight size={14}/><strong>{t("Manage Students")}</strong></div>
          </div>
        </div>

        {(excelImportErrors.length > 0 || excelImportSummary) && <section className={"bulk-student-feedback" + (excelImportErrors.length ? " has-errors" : " has-success")} role={excelImportErrors.length ? "alert" : "status"}>
          <div className="bulk-student-feedback-title">
            <strong>{excelImportErrors.length ? t("Bulk upload blocked — no student records were saved") : t("Bulk upload completed")}</strong>
            {excelImportSummary && <span>{excelImportSummary}</span>}
          </div>
          {excelImportErrors.length > 0 && <>
            <p>{t("Please correct the fields listed below in the Excel file and upload it again. No rows were submitted when these errors were found.")}</p>
            <ul>{excelImportErrors.map((issue, index) => <li key={String(issue.rowNumber || "file") + "-" + index}>
              {issue.rowNumber > 0 ? <strong>{t("Excel row")} {issue.rowNumber}: </strong> : null}
              <span>{(issue.fields || []).join("; ")}</span>
            </li>)}</ul>
          </>}
          <button type="button" className="bulk-student-feedback-dismiss" onClick={() => { context.setExcelImportErrors?.([]); context.setExcelImportSummary?.(""); }} hidden={!context.setExcelImportErrors}>{t("Dismiss")}</button>
        </section>}
        <StudentSummaryCards context={{ students, setActiveTab, setPage, t }} />
        <StudentDirectoryControls context={{
          classFilter, setClassFilter, page, setPage, availableClasses, yearFilter, setYearFilter,
          availableYears, query, setQuery, showFilters, setShowFilters, sortBy, setSortBy,
          activeTab, setActiveTab, design, setDesign, students, t
        }} />
        <StudentDirectoryResults context={{
          design, visible, students, t, setClassFilter, setActiveTab, setQuery, setYearFilter,
          setPage, actions, openAction, actionLabel, safePage, pageSize, setPageSize, totalPages, filtered
        }} />
      </main>
      {toast && <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={18}/><span>{toast}</span><button type="button" className="toast-close" onClick={clearToast} aria-label="Close notification" title="Close notification">×</button></div>}
      <StudentActionDialog context={{ t, setModal, modal, actions, actionLabel, openAction, form, setForm, feeDetailsLoading, feeDetailRecords, submitModal }} />
    </div>
  );
}
