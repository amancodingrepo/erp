# Developer notes — Campus ERP

This is a field notebook for someone who has to **understand, fix, or extend** the running school/college SIS. It is written in plain language after walking the code. Specs and gap lists live elsewhere; this file is “how the machine actually works.”

The app you run is **`apps/erp`**. The git repo root has research crawls and School Diary specs. Those are maps. The product is the Next.js app.

---

## 1. What this product is

A **web campus SIS** (student information system) for one school group with several campuses.

People who use it:

| Who | URL after login | Typical jobs |
| --- | --- | --- |
| Branch admin / office staff | `/staff/dashboard` | Students, fees, attendance, notices, My Branch |
| Teacher | `/staff/dashboard` (short desk) | Attendance, marks, timetable, homework |
| Parent | `/parent/dashboard` | Child fees, attendance, notices, pickup PIN |
| Student | `/student/dashboard` | Own timetable, exams, fees |
| Public | `/apply`, `/s/{campusCode}` | Online admission, published school page |

It is an **independent rebuild**. School Diary and the old college demo were used as a *job list* (what clerks already know how to do). We did not copy their UI, HTML, or assets.

**Campus** in this code = a **branch** in School Diary talk.  
**Academic session** = an **academic year**.

Live site (when deployed): `https://web-production-99e97.up.railway.app`  
Health check: `GET /api/health` → `{ "ok": true, "db": "up" }`.

---

## 2. Words you will see in the code

| Word | Meaning |
| --- | --- |
| **Org / Organization** | The trust or school group |
| **Campus** | One branch / physical school. Almost every row is tagged `campusId` |
| **Session** | Academic year (2025-26). Lists usually follow the “viewing session” |
| **Enrollment** | A student sitting in a class/section for a session |
| **Section** | The actual class group (Class 5-A). Fees and attendance hang off this |
| **Setting** | A JSON blob in table `Setting` keyed by `campusId` + `key`. Extra fields that never got a Prisma column live here |
| **Principal** | The logged-in user object (`AuthPrincipal`), not the school principal |
| **Actor** | `STAFF`, `STUDENT`, `GUARDIAN` |
| **Catalog / leftover** | Hundreds of staff URLs from the old college map. Most are one Workbench screen, not a unique page |
| **Report runner** | One API that runs named reports. There are not 80 separate report pages |

---

## 3. The one picture to keep in your head

```
Browser
  │  login form  (campus + portal + username + password or OTP)
  ▼
POST /api/v1/auth/login
  │  checks campus, portal, password (Argon2 / old bcrypt)
  │  writes cookie  erp_token  (JWT, 12 hours)
  ▼
middleware.ts
  │  /staff, /student, /parent need a valid token
  │  wrong actor is sent to their own home
  ▼
Layout shell
  │  staff  → StaffShell  (sidebar + search)
  │  parent/student → PortalShell
  ▼
Page
  │  a few real pages (dashboard, create student, collect fees)
  │  everything else  /staff/*  → catch-all → Workbench
  ▼
fetch /api/v1/...
  │  requireApiPermission  (role + permission + campus)
  │  Zod parse body
  │  service function in src/lib/services/
  ▼
Postgres (Prisma)  and/or  Setting JSON
```

If something is “broken,” it is almost always in **one of those layers**. Jump to [§9 How to narrow down a glitch](#9-how-to-narrow-down-a-glitch).

---

## 4. Login and who gets which desk

Login is **`POST /api/v1/auth/login`**. Body: `username`, `password`, `portal` (`staff` | `student` | `parent`), optional `campusCode`.

Staff username can be the typed username, **or phone, or employee id** (see `campus-staff-login.ts`). Password minimum 8 on create.

Cookie: **`erp_token`**. JWT is signed in `auth-token.ts`. Middleware reads that cookie.

Roles that matter day to day:

- **SuperAdmin / PlatformAdmin** — `hasPermission` always true. Can create staff and students. PlatformAdmin can switch campus (`POST /api/v1/auth/switch-campus`).
- **Principal / Registrar / Accountant / HOD** — office staff. They get the **Branch Admin** desk (17 sidebar items + My Branch dashboard).
- **Teacher only** — `isTeacherDesk()` in `nav-permissions.ts`. Short menu. Office URLs show “Not on the teacher desk.”
- **Parent / Student** — portal APIs under `/api/v1/portal/*`. Never trust a client-sent `studentId`; `assertCanAccessStudent` checks the token.

OTP login: `POST /api/v1/auth/otp/request` then `/verify`. Codes live in Setting `auth.otpChallenges`. The login page shows the code only when `NODE_ENV=test` or `ERP_OTP_ECHO=1`.

Same email, several users in the org → membership switch `GET/POST /api/v1/auth/memberships` and `POST /api/v1/auth/switch`.

---

## 5. Staff screens: why there are 300 URLs but not 300 pages

Staff layout wraps everything in **StaffShell**.

For office staff (not a pure teacher), the left menu is **not** the 42-group college catalog. It is:
           
1. A **flat 17-item desk** (Notice Board → Store Vendor) from `branch-admin-nav.ts`
2. Collapsed **More office screens** for the leftover catalog
3. Search / Ctrl+K still searches the full catalog

Dashboard `/staff/dashboard` is **My Branch**: KPI cards + three columns (Users / Academics / Administrative). Aliases: `/staff/my-branch`, `/staff/admin/managebranch`.

Almost every other `/staff/...` URL hits:

```
apps/erp/src/app/(staff)/staff/[...slug]/page.tsx
  → Workbench
      → special-screens.tsx  LIVE map   (real React panels)
      → leftover-screens.tsx            (same panels, extra aliases)
      → remaining-screens.tsx
      → CatalogRecordOps                (generic name/code form)
```

**If a staff page looks empty or generic**, the href is missing from those LIVE maps. Add it next to a similar screen. Do not invent a new Next.js page unless the flow is special (collect fees, student profile, dashboard).

Nav permissions: `NAV_PERMISSIONS` in `nav-permissions.ts`. Teacher prefixes are listed there too.

---

## 6. API shape (how a change is supposed to look)

Routes live under **`apps/erp/src/app/api/v1/`**. One folder ≈ one resource.

A typical mutation:

1. `requireApiPermission(request, "fees", "collect", "collect")`  
   Loads the user from cookie or `Authorization: Bearer`. Checks CSRF on cookie POSTs in production (`csrf.ts`). SuperAdmin/PlatformAdmin skip the permission list.
2. Parse JSON with Zod.
3. Call a function in **`src/lib/services/`**.
4. Return `ok()` / `created()` / `fail()` from `http.ts`.

HTTP codes you will see:

| Code | Meaning |
| --- | --- |
| 401 | No token / inactive user |
| 403 | Wrong role, CSRF, or teacher hitting office API |
| 404 | Row not in this campus |
| 409 | Duplicate (`P2002`) or business conflict (cannot delete, cheque bounce rules, already cancelled) |
| 422 | Zod / validation (`fields` in JSON) |
| 429 | Login rate limit |

**Campus scoping is mandatory.** Helpers in `campus.ts` (`sessionInCampus`, `classInCampus`, `staffInCampus`, …). If a list “leaks” another school’s students, a query forgot `campusId`.

**Viewing session:** query `sessionId`, then cookie `erp_session`, then the campus current session (`session-context.ts`). Staff shell has a year dropdown that POSTs `/api/v1/sessions/context`.

---

## 7. Database: Prisma tables vs Setting JSON

Real, relational things are Prisma models in `apps/erp/prisma/schema.prisma`: User, Student, Enrollment, FeeInvoice, Payment, AttendanceMark, Notice, …

Things that were added later, when **migrate was blocked**, sit in **`Setting`**:

```
campusId + key  →  JSON value
```

Examples:

| Key | What it stores |
| --- | --- |
| `academics.classTeachers` | section → staff |
| `academics.sessionPrefixes` | receipt / invoice / admission prefixes |
| `fees.receiptSeq.{sessionId}` | receipt counter (row-locked in SQL) |
| `fees.installments` | named installment types |
| `store.catalog` / `store.orders` | store extras |
| `transport.pings` | staff-posted GPS points |
| `hr.staffExtras` | category, driving licence |
| `auth.otpChallenges` | OTP hashes |

When you cannot find a column on the Prisma model, **grep the Setting key**. Do not add a Prisma column unless migrate is allowed again.

Constraint the team already hit: **`campus-*` services must not import `fees.ts`, reports, or `diary.ts`** (circular imports). Put shared parsers in `campus-spec-aliases.ts` or a small `campus-*.ts` file.

---

## 8. Important flows (so you know which file to open)

### Students
List/search: `students-list.tsx` → `GET /api/v1/students` (`students-list.ts`).  
Create: `/staff/student/create`.  
Profile: `/staff/students/{id}` (tabs: guardians, fees, transport, documents).  
School IDs (PEN, APAAR, scholar, RFID, …) are on the student row or extras.

### Fees
Types / masters / assign → invoices.  
Collect: `POST /api/v1/fees/payments` **requires header `Idempotency-Key`**. Same key + same payload returns the same receipt (200), not a second charge.  
Never delete a payment. Cancel/reverse writes a **contra** (negative) row. Cheque bounce is `POST .../payments/{id}/bounce` (CHEQUE only).  
Receipt numbers: `allocateSessionNumber` in `campus-session-prefixes.ts` (locked increment). Unique on `Payment.receiptNo` globally.

### Attendance
Mark book: `PUT /api/v1/attendance/students` with **`Idempotency-Key`**.  
Missing mark = **Not Taken**, not Present.  
Monthly % uses working days; LEAVE is exempt; empty calendar falls back to marked days (`attendance.ts`).

### Notices / messages
Notices: `diary.ts` + `/api/v1/notices` and nested `/channels/{id}/notices`.  
Private parent mail is **ParentRequest** at `/staff/messages` (`/api/v1/messages`). That is not WhatsApp and not push.

### Transport
Routes, stops, assign in/out. GPS is **staff pings** in Setting `transport.pings`, not a vendor live stream.

### Reports
One runner: `GET /api/v1/reports/{key}` (csv/xlsx/pdf via query). Grains in `src/lib/reports/`. **Do not add 80 unique report pages.** Wire a new key on the runner.

### Public apply
`/apply` → `POST /api/v1/public/...` applications. Staff inbox: AdmissionOps. Convert to student is enroll.

---

## 9. How to narrow down a glitch

Work **top to bottom**. Write down URL, user, campus, what you clicked, expected vs actual.

### A. The page will not load

1. Open `/api/health`. If `db: "down"` the app is up and Postgres is not (local) or Railway Postgres is unhappy.
2. Hard refresh `/login`. Cookie `erp_token` missing → middleware sends you to login.
3. Wrong portal (staff user on Parent) fails login. That is intended.
4. Teacher on `/staff/feetype` sees the “not on the teacher desk” card. Intended.

### B. The page loads, the action fails

1. Browser **Network** tab → the `/api/v1/...` call.
2. Read status + JSON `error` / `message` / `fields`.
3. Map the URL to a file:  
   `/api/v1/fees/payments` → `apps/erp/src/app/api/v1/fees/payments/route.ts` → `lib/services/fees.ts`.
4. 422 → body shape (Zod). 409 → duplicate or “already cancelled”. 403 → permission or CSRF.

### C. Data is wrong or missing

1. Confirm **campus**. Two campuses both have user `admin`. Login campus is the tenant.
2. Confirm **academic year** (cookie `erp_session`). Last year’s enrollments will not show in this year’s list.
3. Confirm you are not looking at Setting JSON (house colour, store price, GPS ping) while grepping only Prisma.
4. Student not in fees: no enrollment in the viewing session, or master not assigned to that class.

### D. “I changed the UI and nothing happened”

Staff URL might be served by **Workbench**, not the file you edited. Search `special-screens.tsx` and `leftover-screens.tsx` for the href.

### E. CI / deploy

| Job | Command | Needs Postgres? |
| --- | --- | --- |
| unit-and-types | `npx tsc --noEmit` then `npm run test:unit` | No |
| integration-postgres | `npx vitest run src/test` | Yes, seeded |
| railway-up | Docker `npm run build` then start | Railway |

Run from **`apps/erp`** (repo root has no `package.json`).

Windows typecheck:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
npx tsc --noEmit
```

`password.test.ts` can time out on slow Argon2 (~5s). Re-run that file.

Docker **build** runs Next lint. An `<a href="/staff/...">` fails `@next/next/no-html-link-for-pages`. Use `next/link`.

Receipt unique errors in parallel tests: sequence bump is row-locked; collect retries on `receiptNo` collision.

### F. Grep cheats

```
href /staff/foo          → leftover-screens, special-screens, nav-permissions
API path                 → apps/erp/src/app/api/v1/<path>/route.ts
Business rule            → apps/erp/src/lib/services/
Permission string        → permission-catalog.ts + NAV_PERMISSIONS
Setting key              → grep the key string (e.g. store.orders)
School Diary job         → docs/school-diary-erp-spec/  and  docs/school-diary-gap.md
```

---

## 10. Folder map (only the useful bits)

```
erp/
  apps/erp/                    ← the product
    prisma/schema.prisma
    src/app/
      (auth)/login
      (staff)/staff/...        pages + [...slug] catch-all
      (parent)/  (student)/
      (public)/apply  s/[code]
      api/v1/                  all JSON APIs
      api/health
    src/components/
      layout/staff-shell.tsx   sidebar, search, year switch
      modules/                 Workbench panels
    src/lib/
      principal.ts             who is this request?
      permissions.ts
      services/                business logic
      catalog/                 nav + leftover maps
      reports/                 one runner
    src/test/                  integration (needs DB)
  docs/school-diary-erp-spec/  what clerks expect
  docs/school-diary-gap.md     what we skipped on purpose
  RAILWAY.md
  TESTING.md                   click-through for non-devs
```

---

## 11. Local run

```bash
cd apps/erp
cp .env.example .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp
npm install
npm run db:setup    # generate + migrate/push + seed
npm run dev
```

Open http://localhost:3000/login

Seed password `Admin@12345` (or `SEED_ADMIN_PASSWORD`):

| Campus | Portal | User |
| --- | --- | --- |
| MAIN | Staff | `admin` |
| MAIN | Staff | `teacher` |
| MAIN | Student | `student1` |
| MAIN | Parent | `parent1` |
| EAST | Staff | `admin` |

Always sign out before switching people.

---

## 12. What is *supposed* to be missing

These are product choices, not unfinished bugs:

- Native iOS/Android parent apps
- Live GPS vendor / device stream / ETA (staff pings exist)
- ~80 unique `/Reports/*` pages (one runner + PDF/XLSX)
- CCTV live stream proxy (HTTPS camera URLs only)
- Push notifications
- Full store payment-gateway checkout for parents (order record exists)

Do not “fix” those by copying vendor apps.

---

## 13. How to add a small feature without making a mess

1. Write or extend a test next to the service (`src/lib/services/foo.test.ts`) or in `src/test/` if it needs Postgres.
2. Put logic in `src/lib/services/`, campus-scoped.
3. Thin `route.ts`: auth, Zod, call service, `ok`/`fail`.
4. Wire the staff href in `special-screens.tsx` (and leftover alias if the old URL exists).
5. Add `NAV_PERMISSIONS` if the href is new.
6. Extra columns → Setting JSON until migrate is allowed.
7. From `apps/erp`: `npx tsc --noEmit` and `npm run test:unit`.
8. Do not push unless asked. Do not `railway up` unless asked (CI on `main` deploys after tests).

---

## 14. Other docs

| File | Use when |
| --- | --- |
| `apps/erp/README.md` | How to run the app |
| `TESTING.md` | Click-through for a non-developer |
| `RAILWAY.md` | Deploy env vars |
| `docs/school-diary-erp-spec/` | Clerk habits, My Branch links, API contract |
| `docs/school-diary-gap.md` | Landed vs skipped |
| `erp-spec/` | Old college demo map (catalog generator) |

If this notes file and the running code disagree, **trust the code** and update this file.

---

## Developer notes: School World conversion of the remaining staff screens

Status: all 323 Campus desk entries now open a native School World screen, and none fall back to the old iframe.
- Tests: 306 backend unit tests, 19 School World tests, type check and production build all pass.
- Checked in the browser against the local database, which was then restored.
- Nothing is committed.

### Decisions (and why each is the best option)

#### Backend
1. **Registers live in the existing `ScreenRecord` table (`screenKey = "register:<kind>"`) behind a strict API, not in new tables.**
   - Why: there's no migration to run against the live database.
   - Each of the 33 kinds still declares its fields once (`src/lib/services/registers.ts`). The server validates types, enums, ranges, date order and required fields, and checks each kind's own view and write permission.
   - Linked records (staff, student, class, subject, program, leave type, exam paper, another register) must belong to the caller's campus.
   - Screens read the field definitions from `GET /v1/registers`, so each rule lives in one place.
   - If a register later needs reporting joins, it can move to a real table without changing the API.
2. **The free-form stores (`/v1/records`, `/api/module-data/*`) refuse `register:` keys.** Why: both let any staff member read or write any key, which would bypass register validation and permissions.
3. **Rules that span rows are enforced on the server**, not just shown in the UI:
   - A student can have only one gate pass that is issued or out.
   - Other-course applications are refused for closed courses and for duplicates.
   - An application can't be approved once the course's seats are full.
   - A register row that another register still points at can't be deleted.
4. **Gate passes get a server-made code** that can't be edited. Why: the gate scans or types it, so it must be unique and can't be chosen by the client.
5. **Login Credentials Send (`POST /v1/students/send-logins`) emails a new temporary password.** It changes a password only after the email is delivered, and refuses to run when email isn't set up. Why: stored passwords are hashed, so the old one can't be resent, and resetting first could lock people out.
6. **The message log keeps a masked copy of login emails** (`********`). Why: staff can read the log, and it used to store plain-text portal passwords.
7. **New reports were added to the existing engine**, so CSV, Excel and PDF work for free:
   - `transport-students` and `hostel-students`
   - `student-log`
   - `backlog`: finalised marks below the pass mark, or absent. Draft marks are ignored.
   - `admission-summary`: by program, using the real statuses Applied, Fee paid, Enrolled and Rejected.
8. **Student profile edits now write an audit entry** with the changed fields only. Why: otherwise "Student log update" would be empty for the most common change.
9. **Specializations get their own API**, and Assign Major/Minor is `PATCH /v1/sections/[id]`. The specialization must belong to the section's own program, and one in use can't be deleted.
10. **Generate Income Tax is worked out on the server** (`POST /v1/payroll/income-tax`) with the payroll engine's own `tdsAnnual` function and slabs. Each declaration is capped at its element's limit, and nothing is saved. Why: the yearly figure and the monthly payslip TDS can never disagree, and the maths is unit-tested (`src/lib/income-tax.test.ts`).
11. **SMS and email gateway settings stay in server settings.** `GET /v1/message-channels` returns only "on" or "off". Why: storing a webhook address per campus would let a campus admin make the server call any address (SSRF).

#### Screens
12. **Bulk Delete disables students** (reason required) and doesn't hard-delete them. Why: there's no delete API, and erasing a student would break fee receipts, marks and attendance history. They can be enabled again.
13. **Bulk Update is an editable grid per class or section, not a CSV upload.**
    - It saves only the rows you changed, one at a time, and names any that failed.
    - Roll number, status and email are left out: roll numbers belong to the enrollment (they have their own screen), status changes have their own flows, and the list doesn't return email.
    - Staff bulk update can change an email but not clear it, because the API rejects a blank email.
14. **Exam remuneration bill prices a duty only when exactly one rate exists for it.** Otherwise it flags "no rate" or "more than one rate" instead of guessing.
15. **Copy Old Lessons skips lessons the target class already has** (same subject, week and title), so running it twice doesn't duplicate them.
16. **Video Tutorial uses the shared-content store**, with a "Video" content type created on first use. Why: videos then also appear in the content share list, with no second store.
17. **Desk entries whose work an existing screen already does reuse that screen.** Exam Form, Exam Result, Mark Entry Multi Subjectwise, Assign Seat Number, Student ID Card, Design Admit Card, Print Marksheet Format, Manage Attributes, Sidebar Menu, Payment Category (both), Batch Setting, Optional Subjects (both) and Online Admission Setting all work this way. Why: one screen per job avoids two versions drifting apart.
18. **Features that have no engine get an honest information page**: Captcha, Languages, System Fields, Student Profile Update, System Update, Online Course Setting, Notification Setting and the Schedule Email/SMS log. Why: a form that saves settings nothing reads would be misleading.

### Security fixes made along the way
- `POST /v1/programs` now checks that the department is in your campus.
- `POST /v1/sections` now checks the specialization.
- The staff routes no longer return the password hash. This needs a deploy and password resets.

### Wiring check (every link and request)
- **Static check.** Every API address that School World calls (398 distinct) was matched against the 495 backend routes and their HTTP methods.
  - Only the Super Admin page's `/superadmin/*` calls have no backend. That page can't be reached, because no account is ever given the `super_admin` role.
- **Runtime sweep.** All 325 Campus desk buttons were opened in the browser with every request recorded: no crashes, and no failed requests except the expected 403 on Multi Branch for a non-platform admin.
- **Sidebar links.** All 30 sidebar modules, plus the Campus desk, open a page.
- **Fixed during the check:**
  - Fee reminder (Fees module and the student page) had no backend. `POST /api/students/[code]/fee-reminder` now puts the outstanding fees for the year in each linked parent's inbox. Nothing is emailed, matching what the screen says.
  - "Reset password" in Manage Students had no backend. `POST /api/students/[code]/reset-password` (school admins) returns a temporary password the student must change.
  - The parent and student inbox, mark-as-read and attachments allowed staff only, so the parent portal's messages never loaded. Accounts can now read their own messages; posting to the school stays staff-only.
  - Parent "Contact Staff" had no backend. It now lists staff in active categories the school hasn't blocked for parents, and allows at most 20 messages an hour.
  - Scheduled messages were never delivered, because nothing switched them from "scheduled" to "sent". They now appear in the inbox once their time has passed.
  - **Data leak:** `/api/fees`, fee receipt data, `/api/attendance` and the attendance calendar returned every student's records to any signed-in account, including parents and students. They're now limited by `ownStudentsFilter`: staff see the campus, a student sees themselves, and a parent sees their children (tested in `school-world-shape.test.ts`).
  - Removed the "previous screen" frames and the desk's old-layout fallback. The ERP sends `X-Frame-Options: DENY`, so they could only ever show a blank frame.

### Not verified
- Sending login emails was only tested up to the "email is not set up" refusal, because there's no mail server locally.
- Multi Branch add/switch was only seen as the "platform administrators only" message, because the local admin isn't a platform admin.
- Backup and restore were only opened, not run.
- Copy Old Lessons copying across classes wasn't run, because the local database has only one class. The same-class guard and the skip logic were checked.

### Found, not fixed (needs a decision)
- Marksheet formats (Design Marksheet) are stored and assigned, but the marksheet PDF ignores them, and there's no API to unassign a section back to the standard layout.
- `loadSmtpConfig` falls back to **any campus's** SMTP settings, so one campus can send mail with another campus's credentials.
- The login URL in emails falls back to a Railway address when `AUTH_URL` isn't set.
- Earlier findings still stand:
  - Exam endpoints don't check that ids belong to the campus.
  - The reports API only checks that the caller is staff.
  - SuperAdmin can be granted by anyone with `users.edit`.
  - Backup restore replaces every campus.

### Deploy strategy (School World release)

**Why staged:** a push to `main` deploys to the live Lightsail server straight away, and this release changes access rules (fees, attendance, messages) as well as screens. So every step is set up to be stopped or undone, and nothing reaches production untested.

**What already protects a deploy** (`.github/workflows/docker-image.yml` + `deploy/lightsail/promote.sh`):
- The image is built only after `ci` passes on `main`.
- The new container must pass a health check (`/api/health` reports the database up, and `/` serves School World) within 90 seconds. Otherwise the previous image is started again automatically.

**Added in this release:**
- `promote.sh` now takes a `pg_dump` of the production database inside the running container before swapping images. If the dump fails, the deploy stops and the current version keeps running.
- Dumps go to `uploads/backups/erp-predeploy-*.dump`, which persists across image swaps and shows in Backup / Restore. The last 5 are kept.
- Why: the nightly backup workflow has failed every day since the move to Lightsail (`ERP_BACKUP_URL` returns 404), so without this there would be no restore point.

**Steps:**
1. **Local gate.** Type check, unit tests, School World tests and build all pass. Every Campus desk screen was opened in the browser, with requests recorded.
2. **Pull request.** Push the `school-world` branch and open a PR to `main`. CI runs everything, including the Postgres integration tests (`src/test`), on a throwaway database, and nothing deploys. Fix and re-push until it's green.
3. **Merge.** Merging triggers `ci` on `main`, then `docker-image`: build, push to GHCR, back up, swap, health check, automatic rollback if unhealthy.
4. **Smoke test on the live site:**
   - `/api/health`
   - The School World home page and Campus desk
   - A register screen (add and remove a row)
   - A report
   - Fees and attendance as staff, and as a parent account showing only their own child
5. **Afterwards:**
   - Reset staff passwords, because older versions sent password hashes in staff API responses.
   - Save the campus mail server under Email Setting so login emails go out.
   - Fix the nightly backup: point `ERP_BACKUP_URL` at the Lightsail host's `/api/v1/backup/job` and put a matching `BACKUP_JOB_TOKEN` (16+ characters) in `/opt/campus-erp/app.env`. This is a server setting, so the owner does it.

**Rollback:**
- **App only:** this release has no database migration, so going back is safe at any time. Revert the merge commit on `main` (`git revert -m 1 <merge sha>`) and push. That deploys the previous code, again behind CI and the health check.
- **Data:** if data needs restoring, use Backup / Restore with the `erp-predeploy-*` dump. This replaces every campus, so it's a last resort.

**Known limits after deploy:**
- SMS is only logged until `SMS_WEBHOOK_URL` is set on the server.
- The old `/staff/...` pages and the ERP `/login` still work; School World is at `/`.

### Default passwords (fixed after the first live audit)
- **What was wrong:** the first seed on a new database creates `admin`, `teacher`, `student1` and `parent1` on the MAIN and EAST campuses. All of them get `SEED_ADMIN_PASSWORD`, or the public default `Admin@12345` from the README, CI and tests when that isn't set. Normal restarts skip the seed when campuses exist, so passwords were never reset. But until changed, these logins worked on production with a known password. A forced re-seed (`FORCE_SEED=true`) also reset every one of them.
- **Fix:** `src/lib/default-credentials.ts`, called from the seed on every production start.
  - Demo accounts still on a known password are switched off.
  - `admin` accounts still on a known password must change it at next School World sign-in. They're never switched off, so nobody is locked out.
  - Accounts whose password was changed are left alone, and it's skipped outside production (or with `ALLOW_DEFAULT_PASSWORDS=true`).
  - A forced re-seed no longer resets passwords or re-enables accounts.
  - Why this approach: it closes the hole without anyone having to remember a manual step, and it can't lock the owner out.
- **Still to do:** the old ERP `/login` doesn't enforce "must change password", so change the admin password yourself as well. Set a strong `SEED_ADMIN_PASSWORD` on the server, so any future fresh install doesn't start on a known password.
