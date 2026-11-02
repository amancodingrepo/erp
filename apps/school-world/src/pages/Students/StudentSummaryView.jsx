import React, { useMemo } from "react";
import downloadModuleCsv from "../../downloadModuleCsv.js";

export default function StudentSummaryView({ students = [], moduleName, t }) {
  const classes = useMemo(() => Array.from(new Set(students.map(student => student.className).filter(Boolean))).sort(), [students]);
  const activeCount = students.filter(student => student.status === "Active").length;
  const inactiveCount = students.filter(student => student.status === "Inactive").length;
  const defaulterCount = students.filter(student => student.defaulter).length;
  const classCounts = useMemo(() => classes.map(className => ({
    className,
    total: students.filter(student => student.className === className).length,
    active: students.filter(student => student.className === className && student.status === "Active").length
  })), [classes, students]);
  const statCard = (label, value, tone, detail) => <div className={`module-stat ${tone}`} key={label}><span>{t(label)}</span><strong>{value}</strong><small>{t(detail)}</small></div>;

  return <>
    <div className="module-stats-grid">{statCard("Total Students", students.length, "blue", "All imported records")}{statCard("Active Students", activeCount, "green", "Currently active")}{statCard("Inactive Students", inactiveCount, "red", "Inactive Child-ID records")}{statCard("Fee Defaulters", defaulterCount, "amber", "Marked in this demo")}</div>
    <section className="module-card"><div className="module-card-title"><h2>{t("Class-wise student summary")}</h2><button type="button" className="module-primary-button" onClick={() => downloadModuleCsv(`${moduleName.toLowerCase().replaceAll(" ", "-")}.csv`, [["Class", "Total Students", "Active Students"], ...classCounts.map(item => [item.className, item.total, item.active])])}>{t("Download report")}</button></div><div className="module-bars">{classCounts.map(item => <div className="module-bar-row" key={item.className}><span>{item.className}</span><div className="module-bar-track"><i style={{ width: `${students.length ? item.total / students.length * 100 : 0}%` }}/></div><strong>{item.total}</strong></div>)}</div></section>
  </>;
}
