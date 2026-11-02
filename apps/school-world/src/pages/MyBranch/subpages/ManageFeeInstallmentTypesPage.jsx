import React from "react";
import FeeMasterCatalogPage from "./FeeMasterCatalogPage.jsx";

const fields = [
  { key: "name", label: "Installment Name", required: true, placeholder: "e.g. First Installment", wide: true },
  { key: "dueDay", label: "Default Due Day (1–31)", type: "number", min: 1, max: 31, defaultValue: 10 },
  { key: "description", label: "Description", type: "textarea", placeholder: "Describe the expected due date or usage.", wide: true }
];

export default function ManageFeeInstallmentTypesPage(props) {
  return <FeeMasterCatalogPage
    {...props}
    moduleKey="manage-fee-installment-types"
    title="Manage Fee Installment Types"
    description="Maintain installment labels and default due days for school fee schedules."
    fields={fields}
  />;
}
