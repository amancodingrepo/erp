import React from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronsLeft,
  ChevronsRight, ChevronLeft, ChevronRight, ContactRound, Download,
  LoaderCircle, MoreHorizontal, Plus, RefreshCw, UserRound, Users
} from "lucide-react";
import { classLabel, relativeLastSeen } from "./contactsUtils.js";

export default function ContactsResultsTable(props) {
  const { directoryLoading, isBroadcastEmpty, activeBroadcast, openAddMembersModal, openCreateBroadcast, displayedContacts, exportOpen, setExportOpen, exportRows, refreshAll, allVisibleSelected, toggleAllVisible, mode, sortedContacts, openActionKey, setOpenActionKey, setActionMenuPosition, visibleColumns, columnWidths, pageContacts, selectedKeys, toggleSelected, openRowActions, onOpenContact, sortBy, setSortBy, setSortDirection, sortDirection, classLabel, relativeLastSeen, safePage, pageSize, setPageSize, setPage, pageCount } = props;
  return (
    directoryLoading ? <div className="contacts-empty"><LoaderCircle size={20} className="contacts-spin"/>Loading contacts…</div>
          : isBroadcastEmpty ? <div className="contacts-broadcast-empty"><div><Users size={30}/><strong>{activeBroadcast ? "Your “"+activeBroadcast.name+"” list is empty" : "Create a broadcast list for frequently contacted groups"}</strong><span>{activeBroadcast ? "Add students, parents, teachers, or other contacts to this list. Existing contacts are not changed." : "Choose contacts from All Contacts or a class, then create a list to send communications to the same group again."}</span>{activeBroadcast ? <button type="button" className="contacts-create-list" onClick={openAddMembersModal}><Plus size={14}/> Add Members</button> : <button type="button" className="contacts-create-list" onClick={openCreateBroadcast}><Plus size={14}/> Create New Broadcast List</button>}</div></div>
          : sortedContacts.length ? <div className="contacts-table-card">
            <div className="contacts-table-scroll" role="region" aria-label="Contacts table" tabIndex="0" onScroll={()=>{if(openActionKey){setOpenActionKey("");setActionMenuPosition(null);}}}>
              <table className="contacts-data-table">
                <colgroup>
                  <col style={{width:"42px"}}/>
                  {visibleColumns.map(column=><col key={column.key} style={{width:(columnWidths[column.key]||column.width)+"px",minWidth:(column.minWidth||60)+"px"}}/>)}
                </colgroup>
                <thead><tr>
                  <th className="contacts-table-check"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all filtered contacts"/></th>
                  {visibleColumns.map(column=><th key={column.key} className={column.key==="actions"?"contacts-table-actions-col":""}>
                    {column.key==="actions" ? <span>{column.label}</span> : <button type="button" className="contacts-sort-button" onClick={()=>{if(sortBy===column.key)setSortDirection(direction=>direction==="asc"?"desc":"asc");else{setSortBy(column.key);setSortDirection("asc");}}}>
                      <span>{column.label}</span>{sortBy===column.key?(sortDirection==="asc"?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUpDown size={12}/>}</button>}
                  </th>)}
                </tr></thead>
                <tbody>{pageContacts.map(row=><tr key={row.key} tabIndex={0} aria-label={"Open edit page for "+row.name} title={"Open edit page for "+row.name} className={"contacts-record-clickable "+(row.status==="Inactive"?"is-inactive ":"")+(selectedKeys.includes(row.key)?"is-selected":"")} onClick={event=>{const target=event.target;if(target instanceof Element&&target.closest("button,input,select,textarea,a,label,[role='menu']"))return;onOpenContact?.(row);}} onKeyDown={event=>{if((event.key==="Enter"||event.key===" ")&&event.target===event.currentTarget){event.preventDefault();onOpenContact?.(row);}}}>
                  <td className="contacts-table-check"><input type="checkbox" checked={selectedKeys.includes(row.key)} onChange={()=>toggleSelected(row.key)} aria-label={"Select "+row.name}/></td>
                  {visibleColumns.map(column=><td key={column.key} className={column.key==="actions"?"contacts-table-actions-col":""}>
                    {column.key==="name" ? <div className="contacts-table-name-cell"><span className="contacts-table-avatar">{row.photoDataUrl?<img src={row.photoDataUrl} alt=""/>:row.kind==="student"?<UserRound size={19}/>:<ContactRound size={18}/>}</span><span className="contacts-table-name-copy"><strong>{row.name}</strong><small>{row.kind==="student"?(row.scholarNumber?"Scholar No: "+row.scholarNumber:"Student ID: "+row.studentId):(row.raw.designation||row.role)}</small></span></div>
                    : column.key==="type" ? <span className={"contacts-type-pill "+String(row.role||"contact").toLowerCase().replace(/[^a-z]+/g,"-")}>{row.raw.designation||row.role||"Contact"}</span>
                    : column.key==="studentId" ? <span className="contacts-table-muted">{row.studentId||"—"}</span>
                    : column.key==="class" ? <span>{row.className?classLabel(row.className,row.section):"—"}</span>
                    : column.key==="parent" ? <span>{row.parentName||"—"}</span>
                    : column.key==="email" ? (row.email?<span className="contacts-table-email" title={row.email}>{row.email}</span>:"—")
                    : column.key==="phone" ? (row.phone?<span className="contacts-table-phone">{row.phone}</span>:"—")
                    : column.key==="gender" ? <span>{row.gender||"Not Specified"}</span>
                    : column.key==="status" ? <span className={"contacts-status-pill "+(row.status==="Inactive"?"inactive":"active")}>{row.status||"Active"}</span>
                    : column.key==="lastSeen" ? <span className="contacts-table-last-seen">{relativeLastSeen(row.lastSeen)}</span>
                    : column.key==="actions" ? <div className="contacts-row-action-wrap">
                        {row.kind==="account" ? <span className="contacts-account-tag">Login account</span> : <button type="button" className="contacts-row-actions-trigger" aria-label={"Actions for "+row.name} aria-expanded={openActionKey===row.key} onClick={event=>{if(openActionKey===row.key){setOpenActionKey("");setActionMenuPosition(null);}else openRowActions(row,event);}}><MoreHorizontal size={17}/><span>Actions</span><ChevronDown size={12}/></button>}
                      </div>
                    : null}
                  </td>)}
                </tr>)}</tbody>
              </table>
            </div>
            <div className="contacts-pagination">
              <span>Showing {sortedContacts.length?((safePage-1)*pageSize+1):0}–{Math.min(safePage*pageSize,sortedContacts.length)} of {sortedContacts.length} contacts · {selectedKeys.length} selected</span>
              <div className="contacts-pagination-controls">
                <label>Rows <select value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1);}}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
                <span className="contacts-page-count">Page {safePage} of {pageCount}</span>
                <button type="button" aria-label="First page" disabled={safePage===1} onClick={()=>setPage(1)}><ChevronsLeft size={14}/></button>
                <button type="button" aria-label="Previous page" disabled={safePage===1} onClick={()=>setPage(currentPage=>Math.max(1,currentPage-1))}><ChevronLeft size={14}/></button>
                <button type="button" aria-label="Next page" disabled={safePage>=pageCount} onClick={()=>setPage(currentPage=>Math.min(pageCount,currentPage+1))}><ChevronRight size={14}/></button>
                <button type="button" aria-label="Last page" disabled={safePage>=pageCount} onClick={()=>setPage(pageCount)}><ChevronsRight size={14}/></button>
              </div>
            </div>
          </div> : <div className="contacts-empty"><ContactRound size={26}/><strong>No contacts found</strong><span>Try changing the year, class, gender, or search text.</span></div>
  );
}
