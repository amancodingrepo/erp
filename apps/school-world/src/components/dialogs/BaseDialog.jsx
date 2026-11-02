import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./dialogs.css";

/**
 * Shared modal foundation. Feature dialogs own their form state and business
 * rules; this component owns portal placement, dismissal, focus and scrolling.
 */
export default function BaseDialog({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  className = "",
  backdropClassName = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  zIndex = 10000
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    document.body.style.overflow = "hidden";
    if (scrollbarWidth) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const items = Array.from(focusable).filter((item) => item.getAttribute("aria-hidden") !== "true");
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (previousFocus && typeof previousFocus.focus === "function" && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, closeOnEscape]);

  if (!open || typeof document === "undefined") return null;

  const backdropClasses = ["sw-dialog-backdrop", backdropClassName].filter(Boolean).join(" ");
  const dialogClasses = ["sw-dialog-panel", className].filter(Boolean).join(" ");

  return createPortal(
    <div
      className={backdropClasses}
      style={{ zIndex }}
      data-sw-dialog-backdrop=""
      onPointerDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          event.preventDefault();
          closeRef.current?.();
        }
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={dialogClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </section>
    </div>,
    document.body
  );
}
