# School World ERP — Page and Component Layout

Each module's page-level JSX is kept in its own folder. The app-wide routing/dispatch code is in `../app/SidebarModulePage.jsx`; authenticated app orchestration is in `../main.jsx`.

## Component conventions

- Keep the module page/controller responsible for data loading, state, mutations and passing callbacks.
- Put a substantial card, table, form, modal/dialog, filter panel, or self-contained workflow in its own component beside the module page.
- Put formatting, parsing, aggregation and pure calculation functions in a module-scoped `*Utils.js` file. Utilities should not render UI or own React state.
- Put a component under the module folder when it is shared within that module. Promote it to `src/shared/` only when multiple modules genuinely use the same behavior.
- Keep shared behavior single-sourced. Search `src/shared/` and the module folder before adding a new helper. Do not duplicate helpers just to avoid imports.
- Different business workflows should not be forced into one generic component simply because they look similar.
- **Database schema discipline:** inspect the current schema and API payloads before adding a field. Reuse the existing database column/JSON field and one canonical source of truth wherever it represents the same information; don't create duplicate columns for labels already represented by an existing field.
- **Ask for explicit user approval before adding, removing, renaming or migrating database columns.** Do not infer that similarly named fields in different entity tables are safe to delete; confirm their purpose and dependencies first.
- When multiple UI components display the same stored value (for example an installment name), use the same shared resolver and follow the backend's canonical field precedence.

## Current module map

- **Dashboard** — `SchoolDashboard.jsx` coordinates the metric cards, quick actions, attendance, class, events, birthdays, assistant and footer components.
- **Contacts** — `ContactsModule.jsx` coordinates directory state; `ContactsResultsTable.jsx` handles results/pagination and `ContactsDialogs.jsx` handles action dialogs. Formatting/preferences are in `contactsUtils.js`.
- **Events** — `EventsCalendar.jsx` coordinates data; calendar views, detail panels, editor, audience pickers and event details are separate components. Date/event helpers live in `eventsUtils.js`.
- **Fees** — `FeesModulePage.jsx` coordinates fee data and mutations; manage, report, late-fee, payment-reversal, edit and reversal-dialog interfaces are separate components. Reporting/export helpers live in `feeReportUtils.js`.
- **Students** — `ManageStudentsPage.jsx` coordinates the directory, summary cards, filters, results and action dialog. `StudentEditPage.jsx` coordinates separate student-information, parent, fee, summary, day-care, transport and immunization tabs, plus payment dialogs. Student helpers are in `studentEditUtils.js`; receipt PDF rendering lives in `Templates/FeeReceipt/feeReceiptPdf.js`.
- **Notice Board** — `NoticeBoardModule.jsx` coordinates publishing; audience, summaries, composer, feed and detail dialog are separate components. `NoticeRecipientPortal.jsx` is composed from its header, filters, notice feed, message feed and detail dialog.
- **Messages** — `MessagesModule.jsx` coordinates message state; composer, list and dialogs are separate components.
- **Admissions** — `AdmissionFormPage.jsx` coordinates form state/saving; field groups, documents, actions and saved enquiries are separate components.
- **Super Admin** — `SuperAdminPage.jsx` coordinates school creation/loading/saving; shared school profile fields and logo picker are used by create and edit screens.
- **My Branch** — navigation/feature registry are separate. Fee types, catalog pages, and bulk upload remain focused subpages. The fee structure-template builder is organized under `Templates/FeeStructure/` and remains reachable from My Branch.

## Shared CSV handling

`src/shared/csvUtils.js` owns common quoted-CSV parsing and CSV download behavior. Student imports, Contacts exports and Bulk Fees Upload reuse it. Module-specific header mapping and row validation remain with each module.

## Validation

Run `npm run build` and `node --check server/index.js` from `school_diary_fullstack_release_v2`. Use a non-production/test dataset for interactive end-to-end checks.

The refactor preserves existing CSS class names, routes and callback-based behavior wherever the UI section was extracted. Build success alone does not replace browser testing of every workflow.

## Template code

All template-specific code is organized in [`Templates/README.md`](./Templates/README.md), with dedicated folders for Fee Receipt, Fee Structure, Performance Report, shared Assignments, and the pending Admit Card feature.
