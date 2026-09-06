# Architecture

## Observed runtime

- Apache + PHP (CodeIgniter 3)
- Server session cookie `erp_session_` (HttpOnly, Secure, SameSite=Lax, ~30 min)
- CSRF hidden field `ci_csrf_token` (often empty on GET pages; refreshed via AJAX on login captcha reload)
- Uploads under `/uploads/` (logos, captcha images, student docs, content)
- Static under `/backend/` (AdminLTE theme `mponline`, DataTables, FullCalendar, Select2)
- Multi-branch addon present (`/admin/multibranch/...`) — one DB, branch switcher
- Print templates stored as HTML fragments (header/footer settings)

## Logical layers you should build

```
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│ Public web  │   │ Staff app    │   │ Student/Parent  │
│ CMS+apply   │   │ admin SPA    │   │ portal + app    │
└──────┬──────┘   └──────┬───────┘   └────────┬────────┘
       └──────────────┬──┴────────────────────┘
                      │  JSON API + RBAC
              ┌───────▼────────┐
              │ Domain services │  admissions, students, fees,
              │                 │  exams, attendance, hr, ...
              └───────┬────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    Postgres     Object store    Jobs/queue
    (source of   (docs, photos,  (SMS, email,
     truth)       receipts)       merit gen)
```

## Tenancy

Live demo behaves as **one college per install**, with optional multi-branch.

Recommended for your product:

- `Organization` (university / college group)
- `Campus` / `Branch`
- `AcademicSession` (e.g. 2025-26) — global current session per campus
- All transactional rows carry `org_id`, `campus_id`, `session_id`

## Identity model

Four actor types:

| Actor | Login URL (live) | Home |
|---|---|---|
| Staff (admin/teacher/accountant/librarian/receptionist/custom) | `/site/login` | `/admin/admin/dashboard` |
| Student | `/site/userlogin` | `/user/user/dashboard` |
| Parent/Guardian | `/site/userlogin` | `/parent/parents/dashboard` |
| Applicant (pre-enrollment) | `/welcome/loginAplication` + online admission | application wizard |

Staff login fields: `username`, `password`, `captcha`.
Success: HTTP 303 → dashboard.

Captcha images: `/uploads/captcha_images/{unix}.{rand}.jpg`

## Request conventions (live)

| Action | Pattern |
|---|---|
| Page | `GET /admin/{module}` or `/admin/{module}/{action}` |
| Create save | `POST /admin/{module}/add` or `/create` |
| Edit page | `GET /admin/{module}/edit/{id}` |
| Update | `POST /admin/{module}/edit/{id}` |
| Delete | `GET/POST /admin/{module}/delete/{id}` |
| Dependent dropdown | `POST .../getByClass` body `class_id` → sections JSON |
| Datatable | `POST` same list URL with DataTables params |

Rebuild as REST:

```
GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/students/:id
PATCH  /api/v1/students/:id
POST   /api/v1/students/:id/disable
GET    /api/v1/classes/:id/sections
```

## Cross-cutting features on almost every list page

- Session filter (defaults to current)
- Class / Section / Department / Program / Specialization cascade
- Keyword search
- DataTables: sort, page, export CSV/Excel/PDF/print
- Row actions: view / edit / delete (permission-gated)
- Bulk actions on students and staff

## Dashboard widgets (staff)

Typical Smart School + this customisation:

- Student count, staff count, teachers, present today
- Fees collection vs pending (session)
- Expense vs income
- Notice board
- Calendar / events (FullCalendar) + NAAC events
- Quick links

Route: `/admin/admin/dashboard` and `/admin/dashboard`

## File handling

Student create accepts:

- student photo, student signature
- father/mother photo
- arbitrary titled documents (`first_doc` … `fifth_doc`)

Settings: `/admin/admin/filetype` (allowed extensions), `/student/profilesetting` (which profile fields students may self-update).

## Integrations already wired as settings

- SMS gateway (`/smsconfig`)
- Email SMTP (`/emailconfig`)
- Payment gateways (`/admin/paymentsettings`) + multi-merchant (`/admin/paymentcategory/multimerchant`)
- Google Meet (`/admin/gmeet/index`)
- Zoom (`/admin/conference`)
- Front CMS (`/admin/frontcms`)

## Performance notes if you rebuild

Their pages are 450–600 KB HTML each (full layout + sidebar + widgets every time). Do not repeat that. SPA shell + API. List endpoints must paginate; student search is the hottest query.
