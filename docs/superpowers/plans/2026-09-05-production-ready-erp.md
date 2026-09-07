# Production-Ready College ERP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current `apps/erp` scaffold (catalog routes + a few live SIS flows) into a production college ERP: real domain screens, campus-scoped APIs, RBAC, audit, PDFs, student/parent portals, and the acceptance tests in `erp-spec/production/acceptance-tests.md`.

**Architecture:** Keep Next.js 15 App Router + Prisma 6 + PostgreSQL. **v1 is not “every CSV `priority=core` row.”** v1 is the acceptance-test matrix plus the wired routes listed per task. JWT claims must include `studentId` / `guardianId` (allow-list) so portals cannot IDOR. Prefer existing Prisma models (`ClassSubject.staffId`, `Setting` for module flags, `ExamMark.isBlocked`) over inventing tables. Optional modules stay hidden until Phase B/C.

**Tech Stack:** Next.js 15, React 19, Prisma 6, PostgreSQL 18, Zod, Vitest, jose JWT, bcrypt (migrate to Argon2id), `@react-pdf/renderer` for receipts/marksheets, local disk then S3-compatible uploads, Razorpay later (MVP cash/UPI offline first).

**Execution:** Subagent-driven. Phase B-1 online admission implemented 2026-09-06. Branch `main`.

### Progress

| Task | Status | Commits |
|------|--------|---------|
| 0 Baseline (secrets, migrate, health) | **Done** | `3bb7208` |
| 1 RBAC, audit, users/roles, password reset | **Done** | `a58c9e8` + `e2839d3` (SuperAdmin lockout 409, guardian campus IDOR) |
| 2 Academics (periods, timetable, working days, promotion) | **Done** | `b17acdc` + `6f447fe` (empty `studentIds` 422, per-student same-section, timetable campus checks) |
| 3 Students SIS | **Done** | `cb08823` |
| 4 Fees production | **Done** | `19ace1e` |
| 5 Attendance + leave | **Done** | `867e948` |
| 6 Examinations production | **Done** | `09bc265` |
| 7 Staff directory + notices + settings | **Done** | `1f15b4a` |
| 8 Student and parent portals | **Done** | `fcd51d2` |
| 9 Files, PDF letterhead, command palette | **Done** | `a13ad9c` |
| 10 First-class reports | **Done** | `3934717` |
| 11 Hide unwired screens | **Done** | `8b01ace` |
| 12 Security and ops hardening | **Done** | `0add3f4` |
| 13 Acceptance test suite | **Done** | — |

**Leftover (non-blocking, pick up in later tasks):**
- Timetable clash read is still outside the write `$transaction` (TOCTOU) — fold into Task 5/12 if concurrent PUTs matter.
- `POST /api/v1/sessions/[id]/activate` should also `where: { id, campusId }` — fold into Task 7 settings or next academics touch.
- Seed still needs accountant, student1, parent1, demo class roster (Task 3/8).

**Spec source of truth (in this order):**
1. `erp-spec/production/schema.prisma`
2. `erp-spec/production/collect-fees-live.md` / `mark-entry-live.md` / `portals-live.md`
3. `erp-spec/production/field-catalog-live.md`
4. `erp-spec/production/api-contracts.md`
5. `erp-spec/production/permissions.md`
6. `erp-spec/production/acceptance-tests.md`
7. Module narratives `erp-spec/01`–`16`

---

## Current build — what is and is not production

| Area | Today (after Task 2) | Production bar |
|---|---|---|
| Screens | 335 catch-all routes; academics + users/roles wired; rest generic registers | v1 wired set only (not every CSV `core` row) |
| Students | Minimal create (name, admissionNo, optional class) | Full create form (`06-students.md` + field catalog), 360 tabs, CSV import, roll generator, documents |
| Fees | Manual invoice + payment; Teacher **403** on collect; no class assign, ledger, fine slab, PDF | Type→Group→Master→assign class→line collect→immutable receipt→cancel contra |
| Attendance | Bulk mark; working-days API exists, not yet enforced on mark | Working calendar, leave codes LEAVE, % ignores holidays, lock after N days |
| Exams | Group/exam/subject/marks/finalize; promotion does not delete marks | Cascade filters, roster, draft/finalize, result block → withheld, PDF |
| RBAC | Nav gated by permission + module flags; optional modules seeded off; SuperAdmin last-admin 409 | Same + student/parent IDOR tests (Task 8) |
| Auth | Strong local `AUTH_SECRET`; health; forgot/set-password; JWT `studentId`/`guardianId`/`childIds` | Portals using those claims; Argon2id (Task 12) |
| Audit | `writeAudit` on fee pay, mark finalize, student disable, role PUT; `AuditLog.campusId` | Also draft mark saves (Task 6) |
| Files | None | Allowlisted uploads, encrypted Aadhaar/PAN |
| Portals | `/student/dashboard` stub | Student + parent dashboards |
| Tests | 34 Vitest (permissions, catalog, health, teacher 403, last SuperAdmin, academics) | Full `acceptance-tests.md` |
| Ops | Baseline migrate `0_init` + `rbac_audit_password_reset`; `/api/health` | Argon2id, DB login rate limit, backup runbook |

**Do not:** clone MPOnline PHP/CSS, implement System Update, or build 148 one-off report PHP views. **Do:** 335 routes remain; core screens become real; remaining optional modules stay as thin but *correct* CRUD on real tables (not `ScreenRecord`) after Phase A.

**Production v1 (ship to a college) = MVP-1..4 + settings + audit + student/parent portals + PDFs + 12 reports.** That is the only scope that may be called production-ready. Public `/apply`, merit, hostel, Razorpay, NAAC, payroll statutory are Phase B/C — do not build them in Tasks 0–13. CSV `priority=core` includes ~172 rows (railway, ATKT, seating, System Update); **do not** treat that flag as the v1 backlog.

---

## Target layout (additions)

```
apps/erp/
  prisma/migrations/          # 0_init + rbac_audit_password_reset exist
  prisma/seed.ts              # richer demo: 1 program, 2 sections, 5 students, fee master
  src/lib/
    crypto.ts                 # envelope encrypt aadhaar/pan
    audit.ts                  # exists (Task 1)
    secrets.ts                # exists (Task 0)
    current-session.ts        # default session from campus.currentSessionId
    uploads.ts                # disk/S3, mime allowlist
    pdf/
      receipt.tsx
      marksheet.tsx
      admit-card.tsx
    services/
      students.ts
      fees.ts                 # assignMaster, collect, cancel, dueSearch, applyFine
      attendance.ts
      exams.ts
      promotion.ts            # exists (Task 2)
  src/app/api/v1/             # one route family per api-contracts.md
  src/components/modules/     # real screens; delete workbench usage for wired routes
  src/app/(staff)/staff/...   # keep [...slug] as fallback only for unwired optional modules
  src/app/(student)/          # /student/* portal
  src/app/(parent)/           # /parent/*
```

---

## Cross-cutting rules (every task)

- Campus scope: `where: { campusId: user.campusId }` on every query. Never take `campusId` from the body.
- Session default: `campus.currentSessionId`.
- TDD: write the failing Vitest (API handler or service) first for each acceptance case.
- Money: `Decimal`; display INR; never float-add in JS — use Prisma `Decimal` in the service.
- Receipts and finalized marks are immutable; cancel/unfinalize is a new event.
- Teacher fixture in tests must get 403 on `POST /api/v1/fees/payments`.
- Commit after each task.

### Schema rules (do not invent tables)

Use `erp-spec/production/schema.prisma` as-is unless a task lists an additive migration.

| Need | Use |
|---|---|
| Class teacher / subject teacher | `ClassSubject.staffId` (and a query/UI, not `ClassTeacher`) |
| Program intake seats | `Setting` JSON or skip until Phase B; do **not** add `ProgramIntake` in v1 |
| Subject groups / semester bundles | `ClassSubject` + naming; no `SubjectGroup` table in v1 |
| Module on/off | `Setting` key `module.{id}.enabled` — **not** `ModuleFlag` |
| Password reset | **Done (Task 1):** `PasswordReset { tokenHash, userId, expiresAt }` |
| Guardian login | **Done (Task 1):** `Guardian.userId` optional unique FK to `User` |
| JWT | **Done (Task 1):** claims `userId`, `campusId`, `actorType`, `roles[]`, `studentId?`, `guardianId?`, `childIds?` |
| Idempotent pay | **Add** `Payment.idempotencyKey String? @unique` — stop stuffing keys into `reference` |
| Fine/discount on line | **Add** `FeeInvoiceLine.discount`, `fine`, `dueDate` |
| Collect identity | Always pass `enrollmentId` (`StudentEnrollment.id`) as well as `studentId` (live `student_session_id`) |
| Result block | `ExamMark.isBlocked=true` for **all** marks in that exam group for the student — no new `ExamResultBlock` |
| Audit | **Done (Task 1):** `AuditLog.campusId`; still add draft mark saves in Task 6 |
| Custom fields | existing `CustomField` / `CustomFieldValue` — wire in Task 7 |

After `prisma db push` history, first migrate is baseline. Later tasks: `npx prisma migrate dev --name <task_slug>` for each schema change.

---

### Task 0: Production baseline (secrets, migrate, health) — DONE `3bb7208`

**Files:**
- Create: `apps/erp/src/lib/secrets.ts`
- Modify: `apps/erp/src/lib/auth-token.ts` (call `requireAuthSecret()`)
- Modify: `apps/erp/.env.example`
- Create: `apps/erp/src/app/api/health/route.ts`
- Create: `apps/erp/prisma/migrations/` via CLI

- [x] **Step 1:** Generate a 32+ byte `AUTH_SECRET` locally; put only in `.env` (never commit). `.env.example` stays `AUTH_SECRET=` empty with a comment.

- [x] **Step 2:** Fail boot if `NODE_ENV=production` and secret is missing/`changeme`. Implement in `src/lib/secrets.ts` and import from `auth-token.ts`.

```ts
// src/lib/secrets.ts
export function requireAuthSecret() {
  const s = process.env.AUTH_SECRET ?? "";
  if (process.env.NODE_ENV === "production" && s.length < 32) {
    throw new Error("AUTH_SECRET must be >= 32 chars in production");
  }
  return s || "dev-only-not-for-production";
}
```

- [x] **Step 3:** Baseline migrate used `migrate diff --from-empty` → `prisma/migrations/0_init` then `migrate resolve --applied 0_init` (existing db-push database; not `migrate dev`).

- [x] **Step 4:** `GET /api/health` returns `{ ok: true, db: "up" }` after `prisma.$queryRaw` `SELECT 1`.

- [x] **Step 5:** Commit `chore: production baseline secrets migrate health`

---

### Task 1: Auth, users, RBAC, audit (production) — DONE `a58c9e8` + `e2839d3`

**Spec:** `02-auth-roles.md`, `permissions.md`, `portals-live.md`

**Files:**
- Modify: `src/lib/permissions.ts`, `src/lib/principal.ts`, `src/lib/permission-catalog.ts`
- Modify: `src/components/layout/staff-shell.tsx` (filter NAV by permission + module flags)
- Create: `src/lib/audit.ts`
- Modify: `prisma/schema.prisma` — `PasswordReset`, `Guardian.userId`, `AuditLog.campusId`
- Create: `src/app/api/v1/roles/route.ts`, `src/app/api/v1/roles/[id]/permissions/route.ts`
- Create: `src/app/api/v1/users/route.ts`, `src/app/api/v1/modules/route.ts` (read/write `Setting`)
- Create: `src/app/api/v1/settings/route.ts`
- Test: `src/lib/permissions.test.ts`, `src/test/auth-fees-403.test.ts`

- [x] **Step 1:** Write failing test (copy-paste):

```ts
// src/test/auth-fees-403.test.ts
it("teacher cannot collect fees", async () => {
  const token = await login("teacher", "staff");
  const res = await api("POST", "/api/v1/fees/payments", token, { invoiceId: "x", amount: 1, method: "CASH" });
  expect(res.status).toBe(403);
  expect(res.body.error).toBe("forbidden");
});
```

Run: `npx vitest run src/test/auth-fees-403.test.ts`  
Expected: FAIL (no teacher user and/or route does not 403).

- [x] **Step 2:** Seed a Teacher user in `prisma/seed.ts` (`teacher` / same password policy) with Teacher grants only.

- [x] **Step 3:** `writeAudit({ userId, action, entity, entityId, before, after, ip })` wrapping fee pay, mark finalize, student disable, role permission PUT.

- [x] **Step 4:** Module flags live in `Setting` (`key=module.hostel.enabled`, `value=false`). `GET /api/v1/modules`, `PATCH /api/v1/modules/:key`. Staff shell hides group if off. Seed optional modules `false`.

- [x] **Step 5:** Map each `NAV` item to a permission key (default `{module}.profile.view` or explicit map in `src/lib/catalog/nav-permissions.ts`). Hide items without `view`.

- [x] **Step 6:** `/staff/users` and `/staff/roles` real UIs (not workbench): list users by actorType tabs Staff|Student|Parent; enable/disable; assign roles.

- [x] **Step 7:** Forgot password + invite set-password tokens (`PasswordReset` model, 15 min TTL). Student/parent first login via invite, never a shared default.

- [x] **Step 8:** Run tests; commit `feat: rbac nav gating audit users roles`

**Review fixes (`e2839d3`):** last SuperAdmin disable/demote → 409; guardian link campus-scoped; PUT SuperAdmin role grants → 403.

---

### Task 2: Academics complete — DONE `b17acdc` + `6f447fe`

**Spec:** `04-academics.md`, api-contracts sessions/classes/timetable

**Missing vs spec:** timetable API, period CRUD, assign teachers via `ClassSubject`, promotion, working days. **Do not add** `ClassTeacher`, `ProgramIntake`, or `SubjectGroup` in v1.

**Files:**
- Schema already has `ClassSubject`, `Period`, `TimetableSlot`, `WorkingDay`
- Create: `src/app/api/v1/timetable/route.ts`
- Create: `src/app/api/v1/periods/route.ts`
- Create: `src/app/api/v1/working-days/route.ts`
- Create: `src/lib/services/promotion.ts`
- Create: `src/app/api/v1/promotions/route.ts`
- Replace workbench on: `/staff/classes`, `/staff/sections`, `/staff/subject`, `/staff/sessions`, `/staff/department`, `/staff/course-master`, `/staff/timetable/classreport`, `/staff/stdtransfer`, `/staff/holiday/set-working-days`

- [x] **Step 1:** Tests: unique section name per class → 409; activate session → lists default to it.

- [x] **Step 2:** Period master CRUD; assign subject teacher by writing `ClassSubject.staffId`; timetable PUT with clash detection (same staff two rooms, same room two classes). Extra: `POST/GET /api/v1/class-subjects`.

- [x] **Step 3:** Working days: mark date working/holiday; attendance service will consume this (Task 5).

- [x] **Step 4:** Promotion service: `promote({ fromSectionId, toSectionId, toSessionId, studentIds })` in one transaction; old `StudentEnrollment.isCurrent=false`; new row; **do not copy/delete ExamMark**. Empty `studentIds` → 422. Same-section sequential promote is per-student.

- [x] **Step 5:** Dedicated academics screens (`academics-hub.tsx` + `special-screens.tsx`).

- [x] **Step 6:** Commit `feat: academics timetable promotion working days`

---

### Task 3: Students production (SIS heart) — **NEXT**

**Spec:** `06-students.md`, field-catalog student create, portals-live 360 tabs, api-contracts students

**Files:**
- Modify: `src/app/api/v1/students/route.ts` (full Zod from field catalog)
- Create: `src/app/api/v1/students/import/route.ts`
- Create: `src/app/api/v1/students/roll-numbers/route.ts`
- Create: `src/app/api/v1/students/[id]/documents/route.ts`
- Create: `src/lib/services/students.ts`
- Create: `src/lib/crypto.ts`
- Replace: `src/app/(staff)/staff/students/create/page.tsx` (multi-section form)
- Replace: `src/app/(staff)/staff/students/[id]/page.tsx` (360 tabs: Profile, Guardians, Documents, Fees, Attendance, Exams, Timeline)
- Wire: `/staff/student/search`, `/staff/student/create`, `/staff/student/disablestudentslist`, `/staff/student/generaterollnumber`, `/staff/student/student-bulk-upload`, `/staff/category`

- [ ] **Step 1:** Failing tests from acceptance-tests Students section (unique admissionNo, duplicate 409, search fragment, disable+reason).

- [ ] **Step 2:** Zod `studentCreateSchema` covering identity, contact, addresses (permanent/local + same-as), previous education, bank, guardians (father/mother), optional class/section/session. Encrypt `aadhaarEnc`/`panEnc` with `crypto.ts` (AES-256-GCM, key `FIELD_ENCRYPTION_KEY`).

- [ ] **Step 3:** List API returns LIVE columns only: Student ID, Name, Class, Roll, Enrollment No, Father/Spouse, DOB, Gender, Category, Mobile.

- [ ] **Step 4:** 360 GET includes enrollments history, invoices summary, last 30 attendance, exam marks (honor `isBlocked`).

- [ ] **Step 5:** Roll generator: class, section, startFrom, arrangement mix|boys_first|girls_first, sort last|first|id.

- [ ] **Step 6:** CSV import: parse header from spec; **transaction per file**; any bad row → zero inserts + `{ errors: [{ line, fields }] }`.

- [ ] **Step 7:** Documents upload: `uploads.ts` allowlist jpg/png/pdf, max 5MB, store under `uploads/{campusId}/students/{id}/`.

- [ ] **Step 8:** Categories + disable reasons real masters (`/staff/category`, `/staff/disable-reason`).

- [ ] **Step 9:** Commit `feat: production student SIS create 360 import rolls`

---

### Task 4: Fees production

**Spec:** `07-fees.md`, `collect-fees-live.md`, api-contracts fees, acceptance Fees

This is the highest-risk module. Do not keep the current “create invoice then pay amount” as the only path.

**Files:**
- Create: `src/lib/services/fees.ts`
- Modify: `prisma/schema.prisma` — `Payment.idempotencyKey`, `FeeInvoiceLine.discount|fine|dueDate`
- Modify: `src/app/api/v1/fees/payments/route.ts` (line-level pay, fine, discount, `enrollmentId`)
- Create: `src/app/api/v1/students/[id]/ledger/route.ts`
- Create: `src/app/api/v1/fees/due/route.ts`
- Create: `src/app/api/v1/fees/receipts/[receiptNo]/route.ts`
- Create: `src/app/api/v1/fee-masters/[id]/assign/route.ts`
- Create: `src/lib/pdf/receipt.tsx`
- Replace: collect UI to match live: search class/section/keyword → row → addfee page with **lines** Amount/Paid/Discount/Fine/Balance
- Wire: `/staff/studentfee`, `/staff/studentfee/feesearch`, `/staff/studentfee/feereceipt`, `/staff/feetype`, `/staff/feegroup`, `/staff/feemaster`, `/staff/feemastercoursewise`, `/staff/feediscount`, `/staff/fine-rules`

- [ ] **Step 1:** Failing tests — master Tuition 20000 + Exam 2000; assign class; each student invoice 22000; pay 10000 PARTIAL + receiptNo; same Idempotency-Key; pay rest+fine PAID; cancel → contra, invoice reopens, original receipt remains.

- [ ] **Step 2:** `assignMasterToClass({ masterId, classId, sessionId })` creates `FeeInvoice` + `FeeInvoiceLine` per current enrollment if none exist.

- [ ] **Step 3:** Collect body includes `enrollmentId` (live `student_session_id`) + `invoiceId` + optional `lineId`. Pay against lines (FIFO if omitted). Persist `idempotencyKey`. `receiptNo` sequential per campus `RCP-{session}-{seq}`. Cancel inserts a contra payment row (negative/zero-out via new row) and sets `cancelledAt` on the original; **never update `amount`**.

- [ ] **Step 4:** Fine: `FineRule.afterDays` vs dueDate; computed at collect; cashier may waive with reason (audit).

- [ ] **Step 5:** Discount named `FeeDiscount` attachable to payment. Scholarship method credits invoice.

- [ ] **Step 6:** Cancel payment: `cancelledAt`, reverse paid, **never rewrite amount**. PDF receipt watermark Cancelled.

- [ ] **Step 7:** Ledger GET and due search (fee group multi-select + class/section).

- [ ] **Step 8:** Collect UI live columns from `collect-fees-live.md`. Print uses campus name from settings.

- [ ] **Step 9:** Commit `feat: production fee collect ledger receipts`

---

### Task 5: Attendance + leave

**Spec:** `08-attendance-leave.md`, acceptance Attendance

**Files:**
- Modify: `src/lib/services/attendance.ts` (new)
- Modify: `src/app/api/v1/attendance/students/route.ts`
- Create: `src/app/api/v1/attendance/staff/route.ts`
- Create: `src/app/api/v1/leave-types/route.ts`, `src/app/api/v1/leave-requests/route.ts`
- Wire: `/staff/stuattendence`, `/staff/stuattendence/attendencereport`, `/staff/approve-leave`, `/staff/staffattendance`, `/staff/leavetypes`

- [ ] **Step 1:** Tests: holiday date 422 unless override; monthly % ignores HOLIDAY; approved student leave codes LEAVE not ABSENT.

- [ ] **Step 2:** PUT attendance checks `WorkingDay`; lock edits older than `settings.attendanceLockDays` except Principal/SuperAdmin.

- [ ] **Step 3:** Student leave approve writes attendance LEAVE for date range.

- [ ] **Step 4:** Staff attendance + leave types + apply/approve (single-level first; multi-level HOD→Principal in Phase B).

- [ ] **Step 5:** Commit `feat: attendance calendar leave coding`

---

### Task 6: Examinations production

**Spec:** `09-examinations.md`, `mark-entry-live.md`, acceptance Exams

**Files:**
- Create: `src/lib/services/exams.ts`
- Keep marks at `PUT /api/v1/exams/[id]/marks` where `id` is `examSubjectId` (matches `api-contracts.md` `/exams/:examSubjectId/marks`)
- Create: `src/app/api/v1/exams/[id]/roster/route.ts`
- Create: `src/app/api/v1/students/[id]/result-block/route.ts` `{ examGroupId, blocked, reason }`
- Create: `src/lib/pdf/marksheet.tsx`, `src/lib/pdf/admit-card.tsx`
- Replace mark entry UI: cascade exam group → exam → class → section → subject → grid (Student ID, Roll, Name, Absent, Marks, Max)
- Wire: `/staff/examgroup`, `/staff/examgroup/mark-entry-single-subject`, `/staff/examresult`, `/staff/examresult/exam-result-block-unblock`, `/staff/grade`

- [ ] **Step 1:** Tests: Regular + COLLEGE_GRADE group; subject max 100 min 40; absent student; finalize → teacher PUT 403; block → marksheet `{ status: "withheld" }`; ATKT groupKind independent.

- [ ] **Step 2:** Roster GET from current enrollments of exam’s classes.

- [ ] **Step 3:** Marks PUT is draft until finalize; `finalizedAt` on all rows; only Principal/SuperAdmin after.

- [ ] **Step 4:** Result block: `ExamMark.updateMany` where student + exam subjects in that `examGroupId` set `isBlocked`. Marksheet returns `{ status: "withheld", marks: [] }`.

- [ ] **Step 5:** PDF marksheet/admit card from campus letterhead settings. Placeholders: student name, roll, exam, subjects table.

- [ ] **Step 6:** Grades CRUD (`Grade` model already in schema).

- [ ] **Step 7:** Commit `feat: exam mark entry finalize withheld pdf`

---

### Task 7: Staff directory + notices + settings UI

**Spec:** `10-hr-payroll.md` (directory only for v1), `14-reports-settings.md`, api-contracts settings

**Files:**
- Create: `src/app/api/v1/designations/route.ts`
- Modify: `src/app/api/v1/staff/route.ts` (full fields)
- Modify: `src/app/api/v1/notices/route.ts`
- Modify: `src/app/api/v1/settings/route.ts` (campus name, logo, dateFormat, timezone, attendanceMode, current session)
- Wire: `/staff/staff`, `/staff/designation`, `/staff/notification`, `/staff/schsettings`, `/staff/sessions`

- [ ] **Step 1:** Settings PATCH institute name; receipt PDF test asserts new name (acceptance Settings).

- [ ] **Step 1b:** Custom fields — `GET/POST /api/v1/custom-fields`, `belongTo=Student`, type Dropdown; student create form renders extra inputs; values in `CustomFieldValue`. Test: field appears on create (acceptance Settings).

- [ ] **Step 2:** Staff create with employeeId unique, department, designation, user login optional.

- [ ] **Step 3:** Notice board audience all|staff|students|class.

- [ ] **Step 4:** Payroll, recruitment, mentoring: **not** in v1. Leave screens as labelled “Phase B” empty states linking to this plan — do not keep fake ScreenRecord finance data.

- [ ] **Step 5:** Commit `feat: staff directory notices campus settings`

---

### Task 8: Student and parent portals

**Spec:** `student-parent-portal.md`, `portals-live.md`

**Files:**
- Create: `src/app/(student)/student/layout.tsx` + pages: dashboard, profile, fees, attendance, timetable, notices, exams
- Create: `src/app/(parent)/parent/layout.tsx` + child switcher
- Modify: `src/lib/auth-token.ts` + `principal.ts` — claims `studentId` / `guardianId` / `childIds`; ignore client `studentId`
- Modify: `src/middleware.ts` — `/student/*`, `/parent/*`
- Modify: login portal routing

- [ ] **Step 1:** IDOR tests (all must 403 or empty, never another student’s payload):

```ts
it("student cannot read another student", async () => {
  const token = await login("student1", "student");
  for (const path of [
    `/api/v1/students/${OTHER_ID}`,
    `/api/v1/students/${OTHER_ID}/ledger`,
    `/api/v1/students/${OTHER_ID}/marksheet`,
    `/api/v1/students/${OTHER_ID}/documents`,
  ]) {
    const res = await api("GET", path, token);
    expect([401, 403, 404]).toContain(res.status);
  }
});
it("student cannot collect fees", async () => {
  const token = await login("student1", "student");
  const res = await api("POST", "/api/v1/fees/payments", token, {});
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2:** Seed student user linked to a Student + parent user linked via guardian.

- [ ] **Step 3:** Student dashboard: next class (timetable placeholder), dues, attendance %, notices.

- [ ] **Step 4:** Fees: ledger + download receipt PDF (own invoices only). Online pay stub until Razorpay task.

- [ ] **Step 5:** Results: if blocked, show “Result withheld”, never empty marks.

- [ ] **Step 6:** Commit `feat: student and parent portals`

---

### Task 9: Files, PDF letterhead, command palette data search

**Spec:** architecture file handling, UX differences in `16-rebuild-blueprint.md`

**Files:**
- Create: `src/lib/uploads.ts`
- Create: `src/app/api/v1/search/route.ts` (students by name/admissionNo, receipts by receiptNo)
- Modify: command palette in `staff-shell.tsx` to query `/api/v1/search` as well as screen titles
- Modify: print header/footer settings page `/staff/print-headerfooter`

- [ ] **Step 1:** File type allowlist from settings (default pdf,jpg,png,jpeg). Reject double extensions.

- [ ] **Step 2:** Global search returns students + receipts; palette opens 360 or receipt.

- [ ] **Step 3:** Commit `feat: uploads global search letterhead`

---

### Task 10: First-class reports (not 148 views)

**Spec:** `14-reports-settings.md` rebuild approach

**Implement these 12 only in v1:**

1. Student information (class list)
2. Daily fee collection
3. Head-wise collection
4. Balance / due fees
5. Attendance monthly register
6. Class attendance %
7. Exam result list
8. User log
9. Payment log
10. Audit trail
11. Staff directory
12. Disabled students

**Files:**
- Create: `src/lib/reports/*.ts` query functions
- Create: `src/app/api/v1/reports/[key]/route.ts` → `{ columns, rows }` + `?format=csv`
- Wire matching `/staff/report/...` and `/staff/attendencereports/attendance` etc. to a shared `ReportView` component (filters + table + CSV)

- [ ] **Step 1:** One report test: due report only unpaid lines of selected fee group.

- [ ] **Step 2:** Shared `ReportView` component; no copy-paste tables.

- [ ] **Step 3:** Commit `feat: first-class reports csv`

---

### Task 11: Hide unwired screens; only v1 routes are real — DONE

**v1 wired set** (must not use `GenericScreen`): every href listed in Tasks 2–10 (students, fees, attendance, exams, academics, staff, notices, settings, roles, users, reports, portals).

**Everything else** (including CSV `priority=core` extras: railway, ATKT, seating, online exam, System Update, merit): hidden via `Setting module.*.enabled=false` **or** shown with a non-editable “Not in production v1” empty state. No `ScreenRecord` writes in production seed.

- [x] **Step 1:** Seed optional + out-of-v1 modules disabled. SuperAdmin can enable for demo, but workbench is read-only.

- [x] **Step 2:** Grep `GenericScreen` / `ScreenRecord` — zero writes from v1 wired pages.

- [x] **Step 3:** Commit `feat: hide unwired screens for v1`

---

### Task 12: Security and ops hardening — DONE

**Files:**
- Create: `apps/erp/src/lib/rate-limit-db.ts` (table `LoginAttempt` or reuse existing map until table exists — prefer DB)
- Modify: `apps/erp/next.config.ts` `headers()`
- Modify: `apps/erp/src/lib/principal.ts` Argon2id verify+hash
- Create: `apps/erp/docs/ops-backup.md` (operator runs `pg_dump`; **do not** shell out `pg_dump` from a Next route)
- Test: `src/test/login-rate-limit.test.ts`

- [x] **Step 1:** Failing test: 6th bad password → 429 (acceptance Auth). Persist attempts in DB so restart does not reset.

- [x] **Step 2:** Argon2id for new hashes; bcrypt.compare still accepted for seed admin until rehash on login.

- [x] **Step 3:** Security headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.

- [x] **Step 4:** `FIELD_ENCRYPTION_KEY` required when `NODE_ENV=production`.

- [x] **Step 5:** Backup runbook only. `/staff/updater` stays disabled forever.

- [x] **Step 6:** Commit `chore: security ops hardening`

---

### Task 13: Acceptance test suite (gate to call it production) — DONE

**Files:** `apps/erp/src/app/api/acceptance/` or `apps/erp/src/test/acceptance/*.test.ts` using Prisma test DB.

Port every bullet in `erp-spec/production/acceptance-tests.md` to Vitest.

Run:

```
cd apps/erp
npx vitest run src/lib src/test
npx tsc --noEmit
npx next build
```

Manual (still required):
1. Login admin → dashboard stats
2. Login teacher → no Collect Fees nav, payments 403
3. Admit student with full form → appears in search
4. Assign fee master → collect partial → receipt PDF
5. Mark attendance including a holiday (rejected)
6. Enter marks → finalize → teacher locked; block student → withheld
7. Promote FY-A → SY-A; old marks remain
8. Student portal: own dues, cannot pay another student
9. Disable student → cannot login
10. Turn module hostel off → nav gone

- [x] **Step 1:** CI script `npm test && npm run build` documented in `apps/erp/README.md`.

- [x] **Step 2:** Commit `test: production acceptance matrix`

---

## Phase B (after v1 green) — sell to Indian colleges

Order from `16-rebuild-blueprint.md`:

1. Online admission public form + application fee (`05-admissions.md`) — **in progress**
2. Razorpay/Cashfree webhook + multi-merchant mapping — **done**
3. Merit/cutoff batch job (only if government college) — **done**
4. Hostel + transport + fee heads — **done**
5. SMS/email templates + reminders — **done**
6. ID cards / certificates templates — **done**
7. Enquiry CRM (front office)
8. Library issue/return
9. ATKT + revaluation windows

## Phase C (accreditation / university)

NAAC tasks + evidence, CO-PO mapping + attainment, feedback forms, Indian payroll statutory (PF/ESI/PT/TDS), seating arrangement, GMeet/Zoom as URL storage only.

**Skip until a signed SOW:** canteen POS, railway concession, multi-branch, LMS/online course, system updater, visiting-staff payroll, chat.

---

## Seed data for demos (extend `prisma/seed.ts`)

Must exist after `npm run db:seed`:

- Org Indore College / Main Campus / session 2025-26 current
- SuperAdmin `admin`, Teacher `teacher` **(seeded Task 1)**, Accountant `accountant`, Student `student1`, Parent `parent1` **(still Task 3/8)**
- Dept Science → Program B.Sc → Class FY → Sections A, B
- 5 students in FY-A, 2 in FY-B
- Fee types Tuition + Exam, group FY Regular, master 20000+2000 assigned to FY
- One exam group Regular COLLEGE_GRADE with one subject
- Working days for current month
- Notices sample

Passwords only via `SEED_ADMIN_PASSWORD` (default documented, rotated in real deploys).

---

## Suggested calendar

| Week | Exit criterion | Status |
|---|---|---|
| 1 | Task 0–1: secrets, migrate, RBAC nav, audit, teacher 403 | **Done** |
| 2 | Task 2 academics done; Task 3 full student SIS + import | **Task 2 done; Task 3 next** |
| 3 | Task 4: fees assign/collect/receipt/cancel | Pending |
| 4 | Task 5–6: attendance + exams finalize/PDF | Pending |
| 5 | Task 7–8: settings, staff, student/parent portals | Pending |
| 6 | Task 9–11: reports, hide optional modules, core off workbench | Pending |
| 7 | Task 12–13: security + full acceptance green | Pending |
| 8 | Buffer, demo data, ops runbook | Pending |

---

## Open decisions (defaults if you do not reply)

| Topic | Default |
|---|---|
| PDF | `@react-pdf/renderer` (no Chromium in prod) |
| Uploads v1 | Local `uploads/` behind auth; S3 when `S3_BUCKET` set |
| Payments v1 | Cash/UPI/cheque offline; Razorpay Phase B |
| Hash | Argon2id for new users; bcrypt verify legacy |
| Optional modules | Disabled in seed until Phase B |

---

## Execution notes for agents

- **Resume at Task 3.** Do not re-do Tasks 0–2 unless a regression appears.
- Work in `apps/erp` only. Do not edit `erp-crawl/`.
- Do not copy vendor HTML from crawl into the product.
- Prefer services in `src/lib/services` over fat route handlers.
- One PR/commit per Task above.
- After Task 13 is green, the product may be called **production-ready v1**. Until then, the 335-page catalog is a map, not an ERP.
