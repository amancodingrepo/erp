import React from "react";
import BaseDialog from "../../components/dialogs/BaseDialog.jsx";

/**
 * Events-specific adapter around the shared dialog foundation.
 * Event components retain their own markup and feature behavior; shared modal
 * mechanics are implemented once in BaseDialog to avoid CSS/listener clashes.
 */
export default function EventDialogShell({
  open,
  onClose,
  modalClassName,
  backdropClassName = "",
  labelledBy,
  children
}) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      className={modalClassName}
      backdropClassName={["events-modal-backdrop", backdropClassName].filter(Boolean).join(" ")}
      labelledBy={labelledBy}
      closeOnBackdrop
      closeOnEscape
      zIndex={10000}
    >
      {children}
    </BaseDialog>
  );
}
