import React, { useEffect, useId, useRef, useState } from "react";

/**
 * Small dropdown used by the top bar: one trigger button and a panel. Closes on outside click,
 * Escape (focus returns to the trigger) and after choosing an item. Arrow keys move between items.
 */
export default function TopbarMenu({ label, icon, badge, children, panelClassName = "", align = "right", onOpen }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); return; }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = [...(panelRef.current?.querySelectorAll("[data-menu-item]:not([disabled])") || [])];
      if (!items.length) return;
      event.preventDefault();
      const at = items.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next].focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function toggle() {
    setOpen((was) => {
      if (!was) onOpen?.();
      return !was;
    });
  }
  const close = () => setOpen(false);

  return (
    <div className="tb-menu" ref={rootRef}>
      <button ref={triggerRef} type="button" className={"tb-trigger" + (open ? " open" : "")} aria-label={label} title={label} aria-haspopup="true" aria-expanded={open} aria-controls={id} onClick={toggle}>
        {icon}
        {badge ? <span className="tb-badge" aria-hidden="true">{badge}</span> : null}
      </button>
      {open && (
        <div id={id} ref={panelRef} className={"tb-panel tb-panel-" + align + " " + panelClassName} role="menu" aria-label={label}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

/** A menu row. Pass onSelect; the menu closes after it runs. */
export function MenuItem({ icon, children, hint, onSelect, close, danger, disabled }) {
  return (
    <button type="button" role="menuitem" data-menu-item="" className={"tb-item" + (danger ? " danger" : "")} disabled={disabled} onClick={() => { close?.(); onSelect?.(); }}>
      {icon ? <span className="tb-item-icon">{icon}</span> : null}
      <span className="tb-item-text"><span>{children}</span>{hint ? <small>{hint}</small> : null}</span>
    </button>
  );
}
