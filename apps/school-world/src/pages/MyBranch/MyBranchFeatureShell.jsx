import React from "react";
import ManageSubjectTypesPage from "./subpages/ManageSubjectTypesPage.jsx";
import AcademicOperationPage from "./AcademicOperationPage.jsx";

export default function MyBranchFeatureShell(props) {
  const title = String(props.title || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (title === "manage subject types") {
    return <ManageSubjectTypesPage onBack={props.onBack} notify={props.notify} t={props.t} />;
  }
  return <AcademicOperationPage {...props} />;
}
