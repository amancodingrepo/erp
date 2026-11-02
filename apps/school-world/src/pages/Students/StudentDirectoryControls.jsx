import React from "react";
import { Search, ChevronDown, X, SlidersHorizontal, LayoutGrid, Table2 } from "lucide-react";

export default function StudentDirectoryControls({ context }) {
  const { classFilter, setClassFilter, page, setPage, availableClasses, yearFilter, setYearFilter, availableYears, query, setQuery, showFilters, setShowFilters, sortBy, setSortBy, activeTab, setActiveTab, design, setDesign, students, t } = context;
  return (
    <>
    <section className="filter-row">
            <label>{t("Class")}<select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setPage(1)}}><option value="All classes">{t("All classes")}</option>{availableClasses.map(c=><option key={c}>{c}</option>)}</select></label>
            <label>{t("Academic Year")}<select value={yearFilter} onChange={e=>{setYearFilter(e.target.value);setPage(1)}}><option value="-- All --">{t("-- All --")}</option>{availableYears.map(y=><option key={y}>{y}</option>)}</select></label>
            <div className="searchbox"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder={t("Search name, parent, phone...")}/>{query && <button className="icon-button" onClick={()=>setQuery("")} aria-label={t("Clear search")}><X size={16}/></button>}</div>
            <button className="outline-button filter-toggle" onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal size={16}/>{t(" Filters")}</button>
          </section>
          {showFilters && <section className="advanced-filters"><label>{t("Sort by")}<select value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="name">{t("Student name")}</option><option value="enrolled">{t("Enrollment date")}</option></select></label><button className="text-button" onClick={()=>{setClassFilter("All classes");setYearFilter("-- All --");setQuery("");setActiveTab("All");setSortBy("name");setPage(1)}}>{t("Clear all filters")}</button></section>}
    
          <section className="directory-toolbar">
            <div className="tabs">{["Active","Inactive","All","Defaulters"].map(tab=><button key={tab} className={activeTab===tab?"tab active":"tab"} onClick={()=>{setActiveTab(tab);setPage(1)}}>{t(tab==="All"?"All students":tab==="Defaulters"?"Fee Defaulters":tab)} {tab==="Active"&&<span>{students.filter(s=>s.status==="Active").length}</span>}{tab==="Inactive"&&<span>{students.filter(s=>s.status==="Inactive").length}</span>}{tab==="Defaulters"&&<span>{students.filter(s=>s.defaulter).length}</span>}</button>)}</div>
            <div className="view-switch"><button className={design==="cards"?"chosen":""} onClick={()=>setDesign("cards")}><LayoutGrid size={16}/>{t(" Cards")}</button><button className={design==="table"?"chosen":""} onClick={()=>setDesign("table")}><Table2 size={16}/>{t(" Table")}</button></div>
          </section>
    </>
  );
}
