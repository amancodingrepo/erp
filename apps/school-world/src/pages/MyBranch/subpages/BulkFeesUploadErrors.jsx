import React from "react";

export default function BulkFeesUploadErrors({ context }) {
  const { text, uploadErrors } = context;
  if (!uploadErrors.length) return null;
  return (
    <div className="fees-setup-alert" role="alert">
      <strong>{text("Upload issues")}</strong>
      {uploadErrors.slice(0, 20).map((error, index) => <div key={index}>{text(error)}</div>)}
      {uploadErrors.length > 20 && <p>{text("Only the first 20 issues are shown.")}</p>}
    </div>
  );
}
