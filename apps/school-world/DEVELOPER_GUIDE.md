# School World — Developer Guide

This is a React + Vite application. Feature code is organized by module under `src/pages/`; shared application routing remains in `src/main.jsx` and `src/app/SidebarModulePage.jsx`.

## Routing and application shell

- `src/main.jsx` — application entry/orchestrator, authentication, view transitions, and root-level student workflows.
- `src/app/SidebarModulePage.jsx` — maps sidebar module names to dedicated page components and supplies the shared shell, title, notification, and navigation props.
- `src/LegacyShell.jsx` — shared School World top bar, sidebar navigation, and module layout.
- `src/styles.css` — global theme tokens and shared/component-specific CSS. Page JSX is grouped by module; the shared stylesheet is intentionally retained so existing theme behavior remains consistent during this refactor.

## Module pages

| Module | Main page source |
|---|---|
| Dashboard | `src/pages/Dashboard/SchoolDashboard.jsx` |
| Contacts | `src/pages/Contacts/ContactsModule.jsx` |
| Events | `src/pages/Events/EventsCalendar.jsx` |
| Messages | `src/pages/Messages/MessagesModule.jsx` |
| Notice Board | `src/pages/NoticeBoard/NoticeBoardModule.jsx` |
| Notice recipient portal | `src/pages/NoticeBoard/NoticeRecipientPortal.jsx` |
| My Branch overview | `src/pages/MyBranch/MyBranchModulePage.jsx` |
| Fees | `src/pages/Fees/FeesModulePage.jsx` |
| Attendance | `src/pages/Attendance/AttendanceModulePage.jsx` |
| Attendance Dashboard | `src/pages/AttendanceDashboard/AttendanceDashboardPage.jsx` |
| Day Care | `src/pages/DayCare/DayCareModulePage.jsx` |
| Search Users | `src/pages/SearchUsers/SearchUsersPage.jsx` |
| Performance Report | `src/pages/PerformanceReport/PerformanceReportPage.jsx` |
| Reports | `src/pages/Reports/ReportsPage.jsx` |
| Transport | `src/pages/Transport/TransportModulePage.jsx` |
| Questionnaires | `src/pages/Questionnaires/QuestionnairesModulePage.jsx` |
| Manage Store | `src/pages/ManageStore/StoreInventoryPage.jsx` |
| Store Vendor | `src/pages/StoreVendor/StoreVendorPage.jsx` |
| Manage Students | `src/pages/Students/ManageStudentsPage.jsx` |
| Edit Student | `src/pages/Students/StudentEditPage.jsx` |
| Student form controls | `src/pages/Students/StudentFormFields.jsx` |
| Student summary | `src/pages/Students/StudentSummaryView.jsx` |
| Student table | `src/pages/Students/StudentTable.jsx` |
| Admission / Enquiry | `src/pages/Admissions/AdmissionFormPage.jsx` |
| Login | `src/pages/Auth/LoginPage.jsx` |
| Change Password | `src/pages/Auth/ChangePasswordPage.jsx` |
| Super Admin | `src/pages/SuperAdmin/SuperAdminPage.jsx` |
| Shared generic fallback | `src/pages/Shared/GenericModulePage.jsx` |

## My Branch subpages

Every My Branch link that previously used a shared generic detail view now has its own page component under `src/pages/MyBranch/subpages/`. For the exact link-to-file map, see `src/pages/MyBranch/subpages/README.md`.

Links that already open another full module continue to route to that module rather than duplicating its UI (for example Manage Parents and Children → Manage Students, Manage Routes → Transport, and Manage Performance Report Templates → Performance Report).

`ManageFeeTypesPage.jsx` and `ManageFeeTemplatesPage.jsx` are dedicated, database-backed My Branch pages. They persist per-school records through `/module-data/manage-fee-types` and `/module-data/manage-fee-templates`. Templates read the visible fee types, support installment detail editing, export to Excel-compatible `.xls`, and apply to explicitly selected students by creating fee records through `/fees`. Keep these workflows in their own files; do not route either link through the general Fees page.

`MyBranchFeatureShell.jsx` is the shared visual shell for these subpages. Each subpage component supplies its own title, description, group, and icon; put future feature-specific form, state, validation, and API calls in that subpage's file rather than in the shell.

## Shared helpers and services

- `src/api.js` — shared frontend API client.
- `src/downloadModuleCsv.js` — CSV download helper.
- `src/useModuleDataField.js` — hook for loading/saving a module-specific data field.
- `src/i18n.jsx` — translation and language helpers.
- `src/school-config.js` — school display configuration.
- `src/DatabaseSession.jsx` — authenticated database-session context.
- `src/AppThemeControl.jsx` — application theme selector.
- `src/student-data.js` — student seed/demo data.
- `src/student-form-utils.js` — shared student form defaults and edit-tab definitions.

## Backend

- `server/index.js` — Express API endpoints and backend request handling.
- `server/migrate.js` and `server/migrations/` — database migrations.

## Adding or modifying a page

1. Edit the page component in its module folder under `src/pages/`.
2. Keep reusable controls in shared components and avoid duplicating shell/layout code.
3. Register a new top-level sidebar module in `src/app/SidebarModulePage.jsx` and add its title description there.
4. For a new My Branch option, create a dedicated file in `src/pages/MyBranch/subpages/`, import it into `MyBranchModulePage.jsx`, and map the corresponding card to that component.
5. Use the existing API client and shared theme styles. Preserve authentication, permissions, return navigation, and notification behavior.
6. Build and test the preview branch before changes are considered ready.

## Scrolling and nested scroll containers (required for every card)
- The Dashboard overview cards use a fixed-height, aligned grid; scroll only the card's data/list region (or the School AI Assistant body), never its heading.
- For Dashboard inner scrolling, keep scroll chaining at the default/auto behavior so wheel and touch gestures can continue scrolling the outer page when an inner list reaches its boundary. Do not use `overscroll-behavior: contain`.


Any change that adds scrolling inside a card, panel, table, or module must preserve the ability to scroll the main page. Treat inner scrolling and page scrolling as one feature; do not mark a scrollable card complete after testing the card alone.

### Implementation rules

- Keep the outer page/content container scrollable. Do not add `overflow: hidden`, `position: fixed`, or a fixed viewport height to the page shell or main content as a shortcut to make an inner panel scroll.
- Constrain the card itself when needed, and use a flex-column layout. Allow its content region to shrink with `min-height: 0`.
- Keep the card header visible with `flex: 0 0 auto`; apply `overflow-y: auto` to the card's content/list region, not indiscriminately to every ancestor.
- Keep nested scrolls chained to the page by default. Do **not** use `overscroll-behavior-y: contain` or `none` on a card's inner list unless the user explicitly requests scroll trapping. These values stop wheel/touch scrolling from bubbling to the parent at the inner list's top or bottom.
- Do not intercept wheel, touch, Page Up/Down, or arrow-key events unless there is a documented need. Preserve normal browser behavior and keyboard accessibility.
- Use responsive heights and verify both desktop and mobile. Avoid hard-coding a height that makes the entire page unable to reach content below a card.

### Required regression checklist before marking the work done

1. Scroll inside the card when its list has more content than its viewport.
2. Continue scrolling when the card list reaches its bottom and confirm the main page moves.
3. Scroll the card back to its top, continue scrolling upward, and confirm the main page moves upward.
4. Scroll the main page while the pointer is outside the card; verify content above and below the cards remains reachable.
5. Repeat with mouse wheel and trackpad/touch where available, at desktop and narrow/mobile widths.
6. Click existing card links, test keyboard focus/activation, and verify card navigation is unchanged.
7. Run the project build and, for preview work, verify the deployed Railway preview after a hard refresh.

Any future card-scrolling change must include these checks and record any untested build/browser validation honestly.

## Preview-only workflow

Preview development uses branch `feature/notice-board-theme-settings` and Railway environment `school-diary-theme-preview`. Do not merge this work into main or deploy it to staging/production as part of a preview-only task.
