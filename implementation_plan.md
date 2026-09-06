# College ERP — Build from Scratch

This project is a full-stack **College ERP** built fresh from thorough reverse-engineering of the MPOnline/SmartSchool demo ERP. The research folder contains 35 modules, 335 screens, 830 inferred API operations, a production-ready Prisma schema, API contracts, permission catalog, field catalog, and acceptance tests.

**Goal:** scaffold the real app codebase inside `c:\Users\Asus\Desktop\indore\` using the spec as a blueprint — not a clone.

---

## User Review Required

> [!IMPORTANT]
> **Stack choice — please confirm before I proceed:**
> The spec recommends **Next.js 15 (App Router) + Prisma + PostgreSQL** for the monorepo. This gives us API routes, React Server Components for the admin SPA, and a single repo for all portals.
> **Alternative:** Separate Nest/Fastify API + Next.js frontend.
> I'll default to **Next.js monorepo** unless you say otherwise.

> [!IMPORTANT]
> **Database** — Do you have a local PostgreSQL running, or should I wire `DATABASE_URL` for a cloud DB (Supabase / Neon)?

> [!WARNING]
> The `erp-spec/` and `erp-crawl/` research folders will be **kept in place**. The new app code will live in a new `apps/erp/` directory inside the same workspace root.

---

## Open Questions

- **UI framework:** Shadcn/ui (Radix + Tailwind) is recommended by the spec's thin-SPA approach. Confirm or override.
- **Auth library:** Auth.js v5 (recommended in spec `16-rebuild-blueprint.md`). Confirm or alternative.
- **Payment gateway:** Razorpay or Cashfree for Indian fee collection? (skippable for MVP-1).
- **PDF generation:** React-PDF or Puppeteer/Chromium print for marksheets/receipts?

---

## Proposed Changes

New app scaffolded as a **Next.js 15 monorepo** at `c:\Users\Asus\Desktop\indore\apps\erp\`.

### Monorepo Layout

```
indore/
├── erp-spec/          <- research (unchanged)
├── erp-crawl/         <- raw crawl (unchanged)
├── apps/
│   └── erp/           <- NEW: Next.js 15 app
│       ├── prisma/
│       │   └── schema.prisma   (806-line production schema from erp-spec)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/           login, logout pages
│       │   │   ├── (staff)/          staff SPA shell
│       │   │   │   ├── dashboard/
│       │   │   │   ├── students/
│       │   │   │   ├── academics/
│       │   │   │   ├── fees/
│       │   │   │   ├── attendance/
│       │   │   │   └── exams/
│       │   │   ├── (student)/        student portal
│       │   │   └── api/v1/           REST route handlers
│       │   ├── lib/
│       │   │   ├── db.ts             Prisma client singleton
│       │   │   ├── auth.ts           Auth.js config
│       │   │   └── permissions.ts    RBAC helpers
│       │   ├── components/
│       │   │   ├── ui/               Shadcn primitives
│       │   │   ├── layout/           Sidebar, TopBar, Breadcrumb
│       │   │   └── modules/          StudentTable, FeeCollect, etc.
│       │   └── middleware.ts         auth + RBAC guard
│       ├── .env.example
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
└── README.md          <- updated to point at apps/erp
```

---

### Phase 0 — Scaffold

#### [NEW] `apps/erp/` — Next.js 15 project
- `npx create-next-app@latest` with TypeScript, App Router, Tailwind
- Add dependencies: Prisma, @prisma/client, next-auth, bcryptjs, zod, shadcn/ui

#### [NEW] `apps/erp/prisma/schema.prisma`
- Copy the production schema from `erp-spec/production/schema.prisma` (all 806 lines, fully modelled)

#### [NEW] `apps/erp/.env.example`
```
DATABASE_URL=postgresql://user:pass@localhost:5432/erp
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=http://localhost:3000
```

---

### Phase 1 — Auth + RBAC

#### [NEW] `src/lib/auth.ts`
- Auth.js v5 with Credentials provider (staff / student / parent portals)
- JWT token carries: `userId`, `campusId`, `actorType`, `roles[]`

#### [NEW] `src/lib/permissions.ts`
- `requirePermission(module, feature, action)` — throws 403 if denied
- `hasPermission(user, perm)` — boolean for client UI gating

#### [NEW] `src/middleware.ts`
- Protects `/staff/*` and `/student/*` routes
- Redirects unauthenticated users to `/login`

#### [NEW] `src/app/api/v1/auth/route.ts`
- POST /auth/login, POST /auth/logout, GET /auth/me, PATCH /auth/password

---

### Phase 2 — Core Data APIs (MVP-1: SIS)

Build in order matching `erp-spec/production/api-contracts.md`:

| [NEW] Route file | Endpoints |
|---|---|
| `api/v1/sessions/` | GET, POST, POST /:id/activate |
| `api/v1/departments/` | GET, POST |
| `api/v1/programs/` | GET, POST |
| `api/v1/classes/` | GET, POST |
| `api/v1/sections/` | GET, POST |
| `api/v1/subjects/` | GET, POST |
| `api/v1/students/` | GET (paginated), POST, GET /:id, PATCH /:id, disable/enable |
| `api/v1/staff/` | GET, POST, GET /:id, PATCH |
| `api/v1/notices/` | GET, POST |

---

### Phase 3 — Fees (MVP-2)

| [NEW] Route file | Endpoints |
|---|---|
| `api/v1/fee-types/` | GET, POST |
| `api/v1/fee-groups/` | GET, POST |
| `api/v1/fee-masters/` | GET, POST |
| `api/v1/fees/invoices/` | POST |
| `api/v1/fees/payments/` | POST (with Idempotency-Key), GET receipts |
| `api/v1/fees/payments/[id]/cancel/` | POST |

---

### Phase 4 — Attendance (MVP-3)

| [NEW] Route file | Endpoints |
|---|---|
| `api/v1/attendance/students/` | GET (by class/date), PUT (bulk mark) |
| `api/v1/attendance/students/report/` | GET (date range) |

---

### Phase 5 — Exams (MVP-4)

| [NEW] Route file | Endpoints |
|---|---|
| `api/v1/exam-groups/` | GET, POST |
| `api/v1/exam-groups/[id]/exams/` | POST |
| `api/v1/exams/[id]/subjects/` | POST |
| `api/v1/exams/[examSubjectId]/marks/` | GET roster, PUT bulk marks |
| `api/v1/exams/[examSubjectId]/finalize/` | POST |
| `api/v1/students/[id]/marksheet/` | GET (PDF) |

---

### Phase 6 — Staff Admin UI

#### [NEW] `src/app/(staff)/layout.tsx`
- Fixed sidebar with all core module links
- Permission-gated nav (item hidden when role lacks `view`)
- Top bar: campus name, session switcher, user menu

#### [NEW] UI pages
- `/staff/dashboard` — stat cards (student count, fee collected, today's attendance)
- `/staff/students` — paginated search table + filters
- `/staff/students/[id]` — 360 profile with tabs
- `/staff/students/create` — multi-section create form
- `/staff/academics` — session / class / section / subject management
- `/staff/fees/collect` — search student → invoice → pay
- `/staff/attendance` — date picker + class/section → mark grid
- `/staff/exams` — exam group list → mark entry grid

---

### Phase 7 — Database Seeding

#### [NEW] `prisma/seed.ts`
- Seeds: Organization, Campus, AcademicSession (2025-26, isCurrent=true)
- SuperAdmin user (username: `admin`, temp password)
- Roles: SuperAdmin, Registrar, Accountant, Teacher, HOD, Principal, Student, Parent
- Full permission catalog from `erp-spec/production/permissions.md`

---

## Verification Plan

### Automated Tests
```bash
# Unit tests
npx vitest run src/lib/permissions.test.ts

# Integration (Prisma test DB)
npx vitest run src/app/api/

# Acceptance tests (from erp-spec/production/acceptance-tests.md)
# Teacher cannot collect fees -> 403
# Partial payment updates balance correctly
# Promotion does not erase previous session marks
# Disabled student cannot log in
# Result-blocked student sees "withheld" not empty marks
```

### Manual Verification
1. `npm run dev` — app starts at http://localhost:3000
2. Login as SuperAdmin → dashboard renders stat cards
3. Create a student → appears in search table with filters working
4. Assign fee master to class → collect fee for student → receipt downloads as PDF
5. Mark attendance for a class → report shows percentages
6. Enter exam marks → finalize → marksheet renders

---

## Build Order Summary

| Week | Milestone |
|------|-----------|
| 1 | Scaffold + Prisma schema + migrate + seed + Auth wired |
| 2 | Academics APIs + Students CRUD API |
| 3 | Staff admin UI shell + Students list/profile UI |
| 4 | Fees APIs + Fee Collect UI |
| 5 | Attendance API + UI |
| 6 | Exams API + mark entry UI |
| 7 | Polish, PDF receipts/marksheets, acceptance tests |
| 8 | Student portal (profile, timetable, notices) |
