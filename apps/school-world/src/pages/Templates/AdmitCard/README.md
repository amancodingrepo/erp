# Admit Card Templates — Implementation Pending

This folder is reserved for a dedicated admit-card template feature. The current `AdmitNewStudentPage.jsx` is an admission-registration workflow, not a printable admit-card template editor/renderer, and no dedicated admit-card template flow is wired into the existing template catalog/assignment UI in this branch.

When implementing this type, keep the feature-specific page, preview/rendering component, styles, and helpers in this folder. First document the needed school/student/exam/session fields and inspect existing relational storage/API contracts. Do not add JSON/JSONB persistence or change tables, columns, constraints, or migrations without the owner's explicit approval. Do not connect a placeholder page to navigation until it can load/save real data.
