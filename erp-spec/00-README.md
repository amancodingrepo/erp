# College ERP — Reverse-Engineered Product Spec

Source system: **MPOnline Demo ERP** (`https://demoerp.mponline.gov.in`)
Stack observed: **PHP CodeIgniter 3 + jQuery + AdminLTE + DataTables + session cookie `erp_session_`**
Product family: customized **QDocs Smart School** plus MP/university modules (admission merit, ATKT, NAAC, CO-PO, payroll, seating, railway concession).

This folder is a **rebuild spec**, not a clone of their PHP. Use it to design your own ERP.

## How to use these files

| File | Use for |
|---|---|
| `01-architecture.md` | System shape, tenancy, request pattern |
| `02-auth-roles.md` | Login portals, roles, permission matrix |
| `03-domain-model.md` | Core entities + relationships |
| `04-academics.md` | Session, program, class, subject, timetable |
| `05-admissions.md` | Enquiry → merit → enrollment |
| `06-students.md` | Student 360, documents, siblings |
| `07-fees.md` | Fee structure, collect, discounts, carry-forward |
| `08-attendance-leave.md` | Student/staff attendance + leaves |
| `09-examinations.md` | Exam group, marks, ATKT, marksheet, seating |
| `10-hr-payroll.md` | Staff, departments, payroll, tax |
| `11-campus-ops.md` | Front office, library, hostel, transport, inventory, canteen |
| `12-lms-comms-cms.md` | Online course, live class, notice, SMS/email, front website |
| `13-quality-naac.md` | NAAC, CO-PO, feedback, TNP |
| `14-reports-settings.md` | Report catalog + system settings |
| `15-sidebar-inventory.md` | Live menu dump (323 pages) |
| `16-rebuild-blueprint.md` | Suggested modern build order + module MVP cuts |
| `production/` | Implementation contract: Prisma, APIs, permissions, live field catalog, tests |

## What this ERP actually is

A **college/university SIS + finance + exam + HR** suite with a public CMS and student/parent portals.

42 top-level staff modules, 323 sidebar pages, ~148 reports (marketing claim; live Reports menu has ~29 report entry points that explode into many filters).

There is **no public REST API**. Every action is:

```
GET/POST https://demoerp.mponline.gov.in/{controller}/{method}/{id?}
Cookie: erp_session_=...
Body: application/x-www-form-urlencoded + ci_csrf_token
Response: HTML page or DataTables JSON
```

When you rebuild, expose a real JSON API and keep the UI thin.

## Portals (3 + public site)

1. **Public site** `/frontend` — news, events, online admission, staff login link
2. **Staff admin** `/site/login` → `/admin/admin/dashboard`
3. **Student / parent** `/site/userlogin` → `/user/user/dashboard` or parent dashboard
4. **Application login** `/welcome/loginAplication` — applicant-facing admission

## Design principles visible in the live app

- Academic year is a first-class **Session**. Almost every list is filtered by current session.
- **Class + Section** is the work unit (they also added Department, Program, Specialization, Semester).
- Fees are configured as Type → Group → Master (session-priced), then collected per student invoice.
- Exams are Group → Exam → Subjects → mark entry → result publish → marksheet/admit card templates.
- Permissions are **role × module × action** (view/add/edit/delete), plus a global module on/off switch.
- Heavy use of CSV import/export and printable HTML/PDF templates (admit card, marksheet, fee receipt, ID card).

## Legal / rebuild note

Documented here: information architecture, workflows, field names observed in the UI, route map.
Do **not** copy their PHP, JS, CSS, logos, or wording into a commercial product. Rebuild screens and schema yourself.

- production/collect-fees-live.md, mark-entry-live.md, portals-live.md — LIVE payment, marks, portals
