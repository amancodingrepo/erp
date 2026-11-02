import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * App-level coordinator: one dialog at a time. Feature-specific components are
 * supplied by callers and continue to own their form state and API operations.
 */
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [activeDialog, setActiveDialog] = useState(null);

  const closeDialog = useCallback(() => setActiveDialog(null), []);
  const openDialog = useCallback((Component, props = {}) => {
    if (typeof Component !== "function") {
      throw new TypeError("openDialog expects a React dialog component.");
    }
    setActiveDialog({ Component, props, key: Date.now() });
  }, []);

  const value = useMemo(() => ({
    openDialog,
    closeDialog,
    isDialogOpen: Boolean(activeDialog)
  }), [openDialog, closeDialog, activeDialog]);

  const ActiveComponent = activeDialog?.Component;
  return (
    <DialogContext.Provider value={value}>
      {children}
      {ActiveComponent ? (
        <ActiveComponent
          key={activeDialog.key}
          {...activeDialog.props}
          onClose={closeDialog}
        />
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider.");
  }
  return context;
}
