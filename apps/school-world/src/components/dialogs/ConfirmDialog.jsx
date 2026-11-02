import React from "react";
import { AlertTriangle } from "lucide-react";
import BaseDialog from "./BaseDialog.jsx";

/** Standard confirmation dialog. Keep action-specific behavior in onConfirm. */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onClose
}) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      labelledBy="sw-confirm-dialog-title"
      describedBy="sw-confirm-dialog-message"
      className="sw-confirm-dialog"
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
    >
      <div className="sw-confirm-dialog-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </div>
      <h2 id="sw-confirm-dialog-title">{title}</h2>
      <p id="sw-confirm-dialog-message">{message}</p>
      <div className="sw-confirm-dialog-actions">
        <button type="button" className="sw-dialog-button sw-dialog-button-secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={["sw-dialog-button", danger ? "sw-dialog-button-danger" : "sw-dialog-button-primary"].join(" ")}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </BaseDialog>
  );
}
