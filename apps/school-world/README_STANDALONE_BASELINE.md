# School Diary v4 — Notice Board Dynamic Cards & View Reports

This build is based on the previous `school_diary_v4_notice_board_larger_body_text` version. Changes are limited to Notice Board UI, view tracking/export behavior, the related styles, and translations required for new labels. Other pages, Manage Students, Edit Student, My Branch, routing, and existing student data are preserved.

## Requested updates
- Notice cards render one per row in both Cards and List modes.
- Notice cards use distinct subtle color treatments for News, Alert, Homework – Worksheet, and Homework – Assignment.
- Added a clickable News summary card next to Total Notices. It filters to News notices for the selected academic year.
- Added Open Notice: viewing a notice records one named recipient view, and repeat opens by the same recipient do not increment the unique view count.
- Export Views downloads individual viewed-recipient details; Export Not Viewed downloads all eligible recipients for the notice audience who do not have a view record. CSVs include name, ID, class/section, roll and enrollment numbers, contacts, parent/guardian, email, demographic/address details, status, viewed status, and timestamps where available.
- A local-demo Test viewer selector lets the user simulate opening a notice as an eligible recipient because this prototype has no login/backend connection. In an account-connected deployment, `window.SCHOOL_DIARY_CURRENT_USER` or `SCHOOL_DIARY_CONFIG.currentUser` can identify the active user; administrative roles are not counted as recipient views.
- Recipient eligibility uses available student records and optional configured user lists in `SCHOOL_DIARY_CONFIG` for teachers, day-care users, parents, and route recipients. The demo does not invent users where the selected audience directory has no records; exports include an explanatory row in that case.

## Preserved features
Academic-year filtering, School/Class/Route categories, dynamic school label, editable route names, attachment upload/preview/download, reply permission, News/Alert tabs, homework notice types, search/date filters, exports, delete control, English/Hindi toggle, local storage persistence, and the existing layout/branding remain available.

## Run
1. Extract the ZIP to a new folder.
2. Run `START-APP.bat`.
3. Keep the terminal open and navigate to the local URL shown by Vite.

## Demo limitation
Notices, routes, attachments, and view records are saved to local browser storage. This is not a real multi-user backend, so view events made in one browser will not synchronize to another user's browser/device. True cross-user view tracking and authoritative recipient exports require server-side authentication, audience records, and view-event storage. Attachments are limited to 5 files and 2 MB total per notice in this local demo.

JSX/TSX parser checks, static functional assertions, CSV column-count checks, CSS brace checks, changed-file scope checks, and ZIP integrity passed. A full Vite build/browser runtime test could not be completed because npm dependency installation timed out in this environment.
