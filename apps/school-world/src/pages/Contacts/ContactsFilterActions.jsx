import React from "react";
import { Check, ChevronDown, Download, Plus, RefreshCw, Search } from "lucide-react";

export default function ContactsFilterActions({ context }) {
  const { query, setQuery, gender, setGender, setSelectedKeys, setPage, allVisibleSelected, toggleAllVisible, mode, activeBroadcast, openAddMembersModal, openCreateBroadcast, displayedContacts, exportOpen, setExportOpen, exportRows, refreshAll } = context;
  return (
    <>
        <div className="contacts-filterbar">
          <label className="contacts-search"><strong>Filter</strong><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Start typing to filter list..."/><Search size={15}/></label>
          <label className="contacts-gender-filter"><select value={gender} onChange={e=>{setGender(e.target.value);setSelectedKeys([]);setPage(1);}}><option value="">-- Select Gender / Group --</option><option value="Male">Male</option><option value="Female">Female</option><option value="Not Specified">Not Specified</option><option value="teachers-staff">Teachers &amp; Staff</option></select><ChevronDown size={14}/></label>
        </div>
        <div className="contacts-list-actions">
          <label className="contacts-select-all" title="Select all visible contacts"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}/></label>
          <div className="contacts-list-actions-left">
            {mode==="broadcast" && activeBroadcast ? <button type="button" className="contacts-create-list" onClick={openAddMembersModal}><Plus size={13}/> Add Members</button>
              : <button type="button" className="contacts-create-list" onClick={openCreateBroadcast}><Plus size={13}/> Create New Broadcast List</button>}
            <span className="contacts-count">{displayedContacts.length} contacts</span>
          </div>
          
          <div className="contacts-export-wrap"><button type="button" className="contacts-export-button" onClick={()=>setExportOpen(v=>!v)}>Export <ChevronDown size={13}/></button>{exportOpen&&<div className="contacts-export-menu"><button type="button" onClick={()=>exportRows("visible")}><Download size={13}/> Export filtered contacts</button><button type="button" onClick={()=>exportRows("selected")}><Check size={13}/> Export selected contacts</button></div>}</div>
          <button type="button" className="contacts-refresh-button" title="Refresh contacts" aria-label="Refresh contacts" onClick={refreshAll}><RefreshCw size={14}/></button>
        </div>
    </>
  );
}
