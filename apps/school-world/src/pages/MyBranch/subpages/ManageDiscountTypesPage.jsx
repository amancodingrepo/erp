import React from "react";
import FeeMasterCatalogPage from "./FeeMasterCatalogPage.jsx";

const fields = [
  { key: "name", label: "Discount Type Name", required: true, placeholder: "e.g. Sibling Discount", wide: true },
  { key: "calculationType", label: "Calculation Type", required: true, defaultValue: "Fixed Amount", options: [{ value: "Fixed Amount", label: "Fixed Amount" }, { value: "Percentage", label: "Percentage" }] },
  { key: "value", label: "Default Discount Value", type: "number", min: 0, max: 100000000, defaultValue: 0 },
  { key: "description", label: "Description / Eligibility", type: "textarea", placeholder: "Describe which students can use this discount.", wide: true }
];

export default function ManageDiscountTypesPage(props) {
  return <FeeMasterCatalogPage
    {...props}
    moduleKey="manage-discount-types"
    title="Manage Discount Types"
    description="Create and maintain fixed-amount and percentage discount types for school fee workflows."
    fields={fields}
  />;
}
