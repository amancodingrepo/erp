import React, { useMemo, useState } from "react";
import downloadModuleCsv from "../../downloadModuleCsv.js";
import StudentTable from "../Students/StudentTable.jsx";

export default function ReportsPage({ students = [], t, notify, onOpenStudent }) {
  const [generatedReport, setGeneratedReport] = useState(false);
  const [reportType, setReportType] = useState("Student Directory");
  const [reportClass, setReportClass] = useState("All classes");
  const classes = useMemo(() => Array.from(new Set(students.map(student => student.className).filter(Boolean))).sort(), [students]);
  const reportStudents = useMemo(() => students.filter(student =>
    (reportClass === "All classes" || student.className === reportClass) &&
    (reportType !== "Active Students" || student.status === "Active") &&
    (reportType !== "Inactive Students" || student.status === "Inactive") &&
    (reportType !== "Fee Defaulters" || student.defaulter)
  ), [students, reportClass, reportType]);
  const classCounts = useMemo(() => classes.map(className => ({ className, total: students.filter(student => student.className === className).length })), [classes, students]);

  return <>
    {!generatedReport && <div className="module-note">{t("Choose a report and click Generate Report. Reports are created from the student records loaded from the school database.")}</div>}
    <section className="module-card"><h2>{t("Generate Report")}</h2><div className="module-form-grid"><label>{t("Report type")}<select value={reportType} onChange={event => { setReportType(event.target.value); setGeneratedReport(false); }}><option value="Student Directory">{t("Student Directory")}</option><option value="Active Students">{t("Active Students")}</option><option value="Inactive Students">{t("Inactive Students")}</option><option value="Fee Defaulters">{t("Fee Defaulters")}</option><option value="Class Summary">{t("Class Summary")}</option></select></label><label>{t("Class")}<select value={reportClass} onChange={event => { setReportClass(event.target.value); setGeneratedReport(false); }}><option value="All classes">{t("All classes")}</option>{classes.map(className => <option key={className}>{className}</option>)}</select></label></div><div className="module-actions-row"><button type="button" className="module-primary-button" onClick={() => { setGeneratedReport(true); notify(`${reportType} report generated from the school database.`); }}>{t("Generate Report")}</button><button type="button" className="module-secondary-button" onClick={() => downloadModuleCsv(`${reportType.toLowerCase().replaceAll(" ", "-")}.csv`, [["Student ID", "Student", "Class", "Parent", "Phone", "Status"], ...reportStudents.map(student => [student.id, student.name, student.className, student.parent, student.phone, student.status])])}>{t("Download CSV")}</button></div></section>
    {generatedReport && <section className="module-card"><div className="module-card-title"><h2>{t(reportType)}</h2><span>{reportStudents.length} {t("records")}</span></div>{reportType === "Class Summary" ? <div className="module-simple-table"><div>{t("Class ")}<b>{t("Students")}</b></div>{classCounts.filter(item => reportClass === "All classes" || item.className === reportClass).map(item => <div key={item.className}>{item.className}<b>{item.total}</b></div>)}</div> : <StudentTable rows={reportStudents} showOpen={false} t={t}/>}</section>}
  </>;
}
