import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Search, Users, X } from "lucide-react";
import { classDisplay } from "./questionnaireUtils.js";

function getSelectionLabel(classes, selectedClasses, allClasses) {
  if (allClasses) return "All classes";
  if (!selectedClasses.length) return "Select classes";
  if (selectedClasses.length === 1) {
    const selected = classes.find(item => item.id === selectedClasses[0].id);
    return selected ? classDisplay(selected) : selectedClasses[0].className || "1 class selected";
  }
  return selectedClasses.length + " classes selected";
}

export default function ClassMultiSelect({
  classes = [],
  selectedClasses = [],
  allClasses = false,
  isOpen = false,
  setIsOpen,
  onToggleClass,
  onToggleAllClasses
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredClasses = useMemo(() => classes.filter(item =>
    classDisplay(item).toLowerCase().includes(query)
  ), [classes, query]);
  const selectedIds = new Set(selectedClasses.map(item => item.id));
  const selectedCount = allClasses ? classes.length : selectedClasses.length;
  const allFilteredSelected = filteredClasses.length > 0 &&
    filteredClasses.every(item => allClasses || selectedIds.has(item.id));

  function handleAllFiltered() {
    if (allClasses) {
      onToggleAllClasses(false);
      return;
    }
    if (allFilteredSelected) {
      filteredClasses.forEach(item => {
        if (selectedIds.has(item.id)) onToggleClass(item, false);
      });
      return;
    }
    filteredClasses.forEach(item => {
      if (!selectedIds.has(item.id)) onToggleClass(item, true);
    });
  }

  function clearSelection() {
    onToggleAllClasses(false);
    selectedClasses.forEach(item => {
      const found = classes.find(classItem => classItem.id === item.id);
      if (found) onToggleClass(found, false);
    });
  }

  return (
    <div className={"questionnaires-class-selector" + (isOpen ? " is-open" : "")}>
      <button
        type="button"
        className={"questionnaires-class-select " + (isOpen ? "open" : "")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(value => !value)}
      >
        <span className="questionnaires-class-select-icon"><Users size={16} /></span>
        <span className="questionnaires-class-select-copy">
          <strong>{getSelectionLabel(classes, selectedClasses, allClasses)}</strong>
          <small>{allClasses ? "Every active class will be included" : selectedCount ? "Click to change your selection" : "Choose one or more classes"}</small>
        </span>
        {selectedCount > 0 && <span className="questionnaires-class-count">{selectedCount}</span>}
        <ChevronDown size={16} className="questionnaires-class-chevron" />
      </button>

      {isOpen && <div className="questionnaires-class-menu" role="dialog" aria-label="Choose classes">
        <div className="questionnaires-class-menu-header">
          <div>
            <strong>Choose classes</strong>
            <span>{allClasses ? "All active classes selected" : selectedCount + " selected"}</span>
          </div>
          <button type="button" className="questionnaires-class-close" aria-label="Close class selector" onClick={() => setIsOpen(false)}><X size={16} /></button>
        </div>

        <label className="questionnaires-class-search">
          <Search size={15} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search classes..." aria-label="Search classes" />
          {search && <button type="button" aria-label="Clear class search" onClick={() => setSearch("")}><X size={13} /></button>}
        </label>

        <div className="questionnaires-class-quick-actions">
          <label className={"questionnaires-class-choice all" + (allClasses ? " checked" : "")}>
            <input type="checkbox" checked={Boolean(allClasses)} onChange={event => onToggleAllClasses(event.target.checked)} />
            <span className="questionnaires-class-checkmark">{allClasses && <Check size={12} />}</span>
            <span className="questionnaires-class-option-copy"><strong>All classes</strong><small>Include every active class</small></span>
          </label>
          <button type="button" onClick={handleAllFiltered} disabled={allClasses || !filteredClasses.length}>
            {allFilteredSelected ? "Clear filtered" : "Select filtered"}
          </button>
        </div>

        <div className="questionnaires-class-list">
          {filteredClasses.map(classItem => {
            const checked = Boolean(allClasses || selectedIds.has(classItem.id));
            return <label key={classItem.id} className={"questionnaires-class-choice" + (checked ? " checked" : "")}>
              <input
                type="checkbox"
                checked={checked}
                disabled={Boolean(allClasses)}
                onChange={event => onToggleClass(classItem, event.target.checked)}
              />
              <span className="questionnaires-class-checkmark">{checked && <Check size={12} />}</span>
              <span className="questionnaires-class-option-copy">
                <strong>{classDisplay(classItem)}</strong>
                <small>{classItem.section ? "Section " + classItem.section : "Active class"}</small>
              </span>
            </label>;
          })}
          {!filteredClasses.length && <div className="questionnaires-class-empty">{classes.length ? "No classes match your search." : "No active classes are available. Add classes in school setup first."}</div>}
        </div>

        <div className="questionnaires-class-menu-footer">
          <button type="button" className="questionnaires-class-clear" onClick={clearSelection} disabled={!selectedCount && !allClasses}>Clear selection</button>
          <button type="button" className="questionnaires-class-apply" onClick={() => setIsOpen(false)}><Check size={14} /> Done</button>
        </div>
      </div>}
    </div>
  );
}
