import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import StudentTable from "../Students/StudentTable.jsx";

export default function SearchUsersPage({ students = [], onOpenStudent, t }) {
  const [search, setSearch] = useState("");
  const shownStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(student => !query || [student.id, student.name, student.className, student.father, student.parent, student.phone].some(value => String(value ?? "").toLowerCase().includes(query)));
  }, [students, search]);

  return <>
    <div className="module-card"><label className="module-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Search name, Student ID, class, parent or phone")}/></label><div className="module-result-line">{t("Showing")} {shownStudents.length} {t("of")} {students.length} {t("students")}</div></div>
    <StudentTable rows={shownStudents} onOpenStudent={onOpenStudent} parentModule="Search Users" t={t}/>
  </>;
}
