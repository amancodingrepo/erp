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
