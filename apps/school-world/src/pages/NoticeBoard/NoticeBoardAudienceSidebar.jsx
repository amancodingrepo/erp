import React from "react";
import { Bus, Building2, CalendarDays, Check, ChevronDown, Filter, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function NoticeBoardAudienceSidebar({ context }) {
  const { board, expanded, toggleBoard, schoolTargets, filterTargets, chooseSchoolTarget, classes, schoolAudience, classAudience, chooseClass, routes, routeAudience, routeBeingEdited, routeNameEdit, setRouteNameEdit, saveRouteName, setRouteBeingEdited, removeRoute, newRoute, setNewRoute, addRoute, listSearchDraft, setListSearchDraft, setListSearch, listSearch } = context;
  function renderBoardAccordion(id, label, Icon) {
    return <div className="notice-board-accordion" key={id}>
      <button type="button" className={`notice-board-category${board === id ? " current" : ""}`} onClick={() => toggleBoard(id)} aria-expanded={Boolean(expanded[id])}>
        <span className="notice-board-category-title"><Icon size={15}/>{t(label)}</span>
        {expanded[id] ? <ChevronDown size={14}/> : <Plus size={14}/>}
      </button>
      {expanded[id] && <div className={`notice-board-target-list${id === "class" ? " notice-board-class-list" : ""}`}>
        {id === "school" && schoolTargets.filter(item => filterTargets(item.label)).map(item => <button type="button" key={item.value} className={`notice-board-target${board === "school" && schoolAudience === item.value ? " selected" : ""}`} onClick={() => chooseSchoolTarget(item.value)}>{item.label}</button>)}
        {id === "class" && classes.filter(value => filterTargets(value)).map(value => <button type="button" key={value} className={`notice-board-target${board === "class" && classAudience === value ? " selected" : ""}`} onClick={() => chooseClass(value)}>{value}</button>)}
        {id === "route" && <>
          {routes.filter(value => filterTargets(value)).map(value => <div key={value} className={`notice-board-route-row${board === "route" && routeAudience === value ? " selected" : ""}`}>
            {routeBeingEdited === value
              ? <><input aria-label={t("Edit route name")} value={routeNameEdit} onChange={event => setRouteNameEdit(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveRouteName(value); if (event.key === "Escape") setRouteBeingEdited(""); }}/><button type="button" className="notice-board-mini-action" onClick={() => saveRouteName(value)} title={t("Save route name")}><Check size={13}/></button><button type="button" className="notice-board-mini-action" onClick={() => setRouteBeingEdited("")} title={t("Cancel")}><X size={13}/></button></>
              : <><button type="button" className={`notice-board-target notice-board-route-target${board === "route" && routeAudience === value ? " selected" : ""}`} onClick={() => chooseRoute(value)}>{value}</button><button type="button" className="notice-board-mini-action" title={t("Edit route name")} aria-label={`${t("Edit route name")} ${value}`} onClick={() => { setRouteBeingEdited(value); setRouteNameEdit(value); }}><Pencil size={12}/></button><button type="button" className="notice-board-mini-action danger" title={t("Remove route")} aria-label={`${t("Remove route")} ${value}`} onClick={() => removeRoute(value)}><Trash2 size={12}/></button></>}
          </div>)}
          <form className="notice-board-add-route" onSubmit={event => { event.preventDefault(); addRoute(); }}><input value={newRoute} onChange={event => setNewRoute(event.target.value)} placeholder={t("Add bus number or route name")} aria-label={t("Add bus number or route name")}/><button className="notice-board-mini-action add" type="submit" title={t("Add route")}><Plus size={14}/></button></form>
        </>}
      </div>}
    </div>;
  }
  return (
        <aside className="notice-board-rail">
        <div className="notice-board-rail-heading"><strong>{t("Notice audience")}</strong><span>{t("Select where to publish")}</span></div>
        <form className="notice-board-target-filter" onSubmit={event => { event.preventDefault(); setListSearch(listSearchDraft.trim()); }}>
          <button type="submit" className="notice-board-filter-button"><Filter size={13}/>{t("Filter")}</button>
          <input value={listSearchDraft} onChange={event => setListSearchDraft(event.target.value)} placeholder={t("Start typing to filter list...")} aria-label={t("Filter categories, classes, and routes")}/>
          {listSearch && <button type="button" className="notice-board-mini-action" onClick={() => { setListSearch(""); setListSearchDraft(""); }} title={t("Clear filter")}><X size={13}/></button>}
        </form>
        <nav className="notice-board-category-nav" aria-label={t("Notice board categories")}>
          {renderBoardAccordion("school", "School Notice Board", Building2)}
          {renderBoardAccordion("class", "Class Notice Boards", UsersRound)}
          {renderBoardAccordion("route", "Route Notice Boards", Bus)}
        </nav>
        <div className="notice-board-rail-footer"><CalendarDays size={12}/>{t("Year-specific notices")}</div>
      </aside>
  );
}
