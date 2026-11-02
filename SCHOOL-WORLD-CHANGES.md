# School World work in this ERP tree

Handoff for continuing inside `C:\Users\visha\Downloads\erp\erp`.

This folder is already the git worktree. `git worktree list` shows only this path, on `main` at `7cb4274` (`polish`), tracking `origin/main`. Nothing from this work is committed. Open this directory as the project and keep going from the dirty tree.

Do not commit `apps/erp/.env`. It is gitignored. It holds the local database URL and `AUTH_SECRET`.

## What this tree is now

School World is the browser app. The ERP Next.js app is the API. The old School World Express server is still in `apps/school-world/server/index.js` as a response-shape reference. Do not start it. `npm run dev` in `apps/school-world` starts Express. Use `npm run dev:web` only.

Old School World screens call `/api/...`. College screens keep calling `/api/v1/...`. The Vite dev server proxies `/api` to the Next app.

## How to run it again

1. Local Postgres is the Windows service on port 5432. Use only the database named `erp`. Other local databases and the existing Docker containers were not part of this work and must stay untouched.
2. From `apps/erp`: `npm run dev -- --hostname 127.0.0.1 --port 3010`
3. From `apps/school-world`: set `ERP_API_TARGET=http://127.0.0.1:3010`, then `npm run dev:web`
4. Open `http://127.0.0.1:5173/`
5. Sign in as username `admin`, password `Admin@12345`. `teacher` uses the same password. The form label says email or phone. The API matches the username.

`vite.config.js` still defaults the proxy to `http://127.0.0.1:3000` unless `ERP_API_TARGET` is set. Port 3000 is not this ERP.

The dev servers that were used for testing are stopped.

## Product changes

### Frontend copy

`apps/school-world/` is the School World app copied into this repo. It is untracked. Small edits on top of the cloned frontend:

- `src/api.js` prefers `body.message`, then `body.error`. A non-JSON error stays `Request failed (status).`
- `src/app/SidebarModulePage.jsx` renders Messages, Day Care, Transport, Questionnaires, Manage Store, Store Vendor, and Admissions. Those screens are no longer a “not connected” panel.
- `src/pages/Templates/PerformanceReport/PerformanceReportPage.jsx` declares `selectedExam` before it is used. Do not add a second `const selectedExam`.
- `src/styles.css` differs from the clone only in sidebar `overscroll-behavior-y: auto` and the theme control `z-index: 40`. Dialogs were checked in the browser. CSS variables are not what keeps a dialog closed.

### API translator

New School World routes live under `apps/erp/src/app/api/`. They are thin wrappers. Shared behavior is in:

- `apps/erp/src/lib/school-world-bridge.ts`
- `apps/erp/src/lib/school-world-shape.ts`
- `apps/erp/src/lib/school-world-fees.ts`

`/api/v1/**` was left as the college API. Static segments such as `admit`, `import`, `bulk-import`, `recipients`, and `classes` are their own route files so they are not captured by a dynamic `[id]` segment.

Route groups added for the old screens:

- Auth: `auth/login`, `auth/logout`, `auth/me`, `auth/change-password`
- Shell: `bootstrap`, `module-data/[moduleKey]`, `school/settings`
- People and users: `people`, `people/[personId]`, `users`, `users/[userId]`, `users/[userId]/password`, `users/[userId]/reset-password`
- Students: `students`, `students/[studentCode]`, `students/[studentCode]/details`, `students/[studentCode]/photo`, `students/admit`, `students/import`, `students/bulk-import`, `student-details`, `student-optional-subjects`
- School setup: `academic-years`, `school-classes`, `school-subjects`, `school-subject-categories`, `school-subject-types`, plus each `sync` route
- Staff: `staff-categories`, `staff-category-assignments`, `one-way-communication`
- Transport and notices: `transport/routes`, `routes`
- Fees: `fees`, `fees/apply-template`, `fees/pay-installment`, `fees/[feeId]`, installment, receipt-data, reverse-payment, template-assignment, `my-template-assignments`
- Messages, questionnaires, admissions, external links, attendance, notices

Login maps a Prisma connection failure and Prisma codes P1000, P1001, P1002, P1003, P1008, P1017, and P2024 to HTTP 503 with “The school database is not reachable.” A missing or wrong password stays HTTP 401 with “Email or password is incorrect.”

`schoolWorldRole` maps a role whose name contains `admin` to `school_admin`. The seeded SuperAdmin user therefore enters the school shell. `teacher` is checked before `admin`.

Message recipients set `canReceiveMessage: true` for active users. Without that flag the recipient checkboxes stay disabled.

Student ids on the old screens are admission numbers. `metadata.erpStudentId` and `studentDbId` are the Prisma cuid. Do not UUID-check ids.

### Schema

`apps/erp/prisma/schema.prisma` has an uncommitted additive diff: campus, user, student, fee, attendance, and notice fields, plus School World models such as `AdmissionEnquiry`, `SchoolRoute`, `Event`, `Message`, `Questionnaire`, `StoreItem`, `StoreVendor`, `StaffCategory`, `ExternalLink`, `SubjectCategory`, and `SubjectType`. Existing ERP models were kept.

`apps/erp/prisma/migrations/20261027140000_school_world_shape/migration.sql` is the designed SQL. It was not applied with `migrate deploy`. There is no `_prisma_migrations` table.

The local `erp` database was created empty and shaped with `npm run db:setup` (`prisma db push` plus seed). The tables from the current schema are present there. Do not point Prisma at any other database name. Do not `db push` to Neon. Push again only when a new column is actually required.

Seed campus id is `seed-campus-main`. Seed users are `admin` and `teacher`. `mustChangePassword` is false for the seed admin.

## Data already in local `erp`

Keep it. It is test data written while checking screens.

- Class catalog Grade 1 section A, subject English, academic year 2026-27
- Staff categories Office and Library, staff Ravi Clerk
- Transport Route A and Route B, notice route “Notice Route”
- External link Calendar, questionnaire “Welcome quiz”
- Admission enquiry Asha Rao
- Student Meera Rao, admission `SW-475ECC4B`, mother Lata Rao
- One sent teacher message, “Assembly is at 8:10.”
- Store vendor City Books, a day-care check-in
- One-way communication: Library blocked for parents, Office not blocked
- Fee type “Tuition Fee”

Contacts defaults the year filter to `2026-2027`. Meera’s year is `2026-27`, so she stays hidden until the filter changes.

## Behavior that is still incomplete

These were seen and left alone.

- Add Installment stays closed until the template has a name and a visible fee type exists. The page shows a sentence instead of the dialog.
- Apply Fee Template stays closed until a template has been saved.
- Collect Fee pays through the v1 payment API and does not update the old Fees-screen `line.paid` flag. Mark fully paid stays disabled. A free-typed `POST /api/fees` is rejected.
- `useModuleDataField` replaces the whole `ScreenRecord` payload, so sibling keys in the same bag can be wiped.
- Password minimums disagree: change-password 12, set-password 8, School World staff password 10.
- Forgot-password does not return the token. Set-password with an invalid body returns 422 and `fields` only.
- Pay-installment has no `Idempotency-Key`. v1 payments require one.
- Notice list responses can still include attachment bytes.
- Questionnaire submissions are an empty list. Optional subjects stay empty until a class catalog has `subjectMappings`.
- Day Care’s heading still says “sample records.” Check-in itself is saved.
- `tsc --noEmit` still fails in the older fees receipt-data and update-installment files. Those errors were already there.

## Dirty files that are not this product work

Do not treat these as School World changes unless you know you want them:

- SkillGod refreshes in `AGENTS.md`, `CLAUDE.md`, `CONVENTIONS.md`, `GEMINI.md`, `SKILLGOD.md`, `.agents/AGENTS.md`, `.github/copilot-instructions.md`, `.skillgod/events.jsonl`, `.skillgod/hook_status.json`
- `apps/erp/Dockerfile`, `apps/erp/.dockerignore`, `deploy/lightsail/`
- `emedley-dashboard-1.html`, `graphify-out/`, `school-diary-erp-spec/`, `schooldiary.md`

## Suggested next step in this repo

Create a branch from `main` before the first commit. Stage `apps/school-world`, `apps/erp/src/app/api` for the School World routes, `apps/erp/src/lib/school-world-*.ts`, `apps/erp/prisma/schema.prisma`, and the migration folder. Leave `.env` and the unrelated dirty files unstaged.
