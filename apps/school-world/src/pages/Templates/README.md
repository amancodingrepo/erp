# School World ERP — Template Code Map

Template-specific source lives under this folder, grouped by the business artifact it creates or configures. Keep each template type's page, rendering logic, styles, and local helpers together. Cross-type assignment UI lives in `Assignments/`.

## Folder map

| Folder | Responsibility | Current entry point |
|---|---|---|
| `FeeReceipt/` | PDF fee receipt generation and receipt-specific formatting | `feeReceiptPdf.js` |
| `FeeStructure/` | School fee schedule templates, installment editor, list, and application workspace | `ManageFeeTemplatesPage.jsx` |
| `PerformanceReport/` | Academic performance module, report-template tab, and its CSS | `PerformanceReportPage.jsx` |
| `Assignments/` | Super Admin's per-school-admin template assignment UI | `TemplateAssignmentsPanel.jsx` |
| `AdmitCard/` | Reserved location for a dedicated admit-card template feature | See its README before adding UI/API code |

## Guidelines

- Keep type-specific UI and pure rendering helpers in the matching folder.
- Shared template assignment/catalog behavior belongs in `Assignments/`; don't duplicate it in each template type.
- Receipt output consumes the school profile and assigned receipt-template settings returned by the existing API. Keep school branding and field visibility configurable; don't hard-code school-specific values.
- Existing callers are routed to the moved modules. When adding a new template type, update its route/import and document its data/API contract.
- Do not add JSON/JSONB as a shortcut for new application data. Reuse existing relational structures where they fit. Ask the project owner before changing tables, columns, constraints, or migrations.
- Do not deploy or merge these changes into production/staging without explicit approval.

## Current scope

The refactor reorganizes implemented code only. An admit-card template editor/rendering flow is not currently implemented in this branch; the `AdmitCard/` folder documents that gap instead of shipping a disconnected UI that cannot save or load a real template.
