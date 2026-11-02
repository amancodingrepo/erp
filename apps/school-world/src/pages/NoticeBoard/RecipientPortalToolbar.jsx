import React from "react";
import { Bell, CalendarDays, Newspaper, Search } from "lucide-react";

export default function RecipientPortalToolbar({ context }) {
  const { year, setYear, years, query, setQuery, tab, setTab, notices } = context;
  return (
    <>
    <section className="recipient-portal-tools"><label><CalendarDays size={17}/><select value={year} onChange={e=>setYear(e.target.value)}><option>All years</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="recipient-portal-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your notices"/></label></section>
        <div className="recipient-portal-tabs"><button className={tab==='All'?'selected':''} onClick={()=>setTab('All')}>All ({notices.length})</button><button className={tab==='News'?'selected':''} onClick={()=>setTab('News')}><Newspaper size={15}/> News</button><button className={tab==='Alert'?'selected':''} onClick={()=>setTab('Alert')}><Bell size={15}/> Alerts</button></div>
    </>
  );
}
