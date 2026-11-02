# Template Assignments

`TemplateAssignmentsPanel.jsx` is the Super Admin UI for assigning existing templates to individual school-admin accounts. It currently supports the template types implemented by the existing backend catalog, including fee receipts and performance reports.

Keep assignment UI shared here rather than embedding assignment logic inside each template editor. Add another template type only after its catalog, settings, API, and persistence requirements are defined; ask before schema or migration changes.

Each school-admin card also includes a fee receipt notes editor. Notes are scoped by school and selected receipt template, and are kept as separate relational rows. The editor supports adding, editing, removing and ordering notes. Saving is disabled until migration `007_fee_receipt_template_notes.sql` has been applied to the approved database.
