# Rebuild blueprint

Build a **college ERP**, do not fork Smart School PHP.

## Suggested stack

- API: Next.js Route Handlers or a separate Nest/Fastify service
- DB: PostgreSQL + Prisma
- Auth: Auth.js (staff/student/parent) + RBAC tables
- Files: S3-compatible
- Jobs: queue for SMS, email, merit generation, PDF
- PDF: React-PDF or Chromium print
- Payments: Stripe internationally; Razorpay/PayU/Cashfree for India fee collection
- UI: one staff app, one student/parent app, one public site

## What to ship in what order

### MVP-1 — SIS (6–8 weeks for a small team)

1. Org, campus, session, department, program, class, section, subject
2. Staff + roles + permissions
3. Student create / search / profile / documents
4. Enrollment history + promote (simple)
5. Student portal: profile, timetable placeholder, notices
6. Notice board + email

Success test: registrar can admit 200 students and search them in under a second.

### MVP-2 — Fees

Fee type / group / master / assign / collect / receipt / due list / daily collection report / Razorpay or Cashfree.

### MVP-3 — Attendance + timetable

Working calendar, day-wise attendance, class timetable, teacher timetable.

### MVP-4 — Exams

Exam group, schedule, mark entry, result list, PDF marksheet, admit card.

### Phase B (sell to Indian colleges)

- Online admission + application fee
- Merit / cutoff only if government college
- ATKT + revaluation
- Hostel + transport
- ID cards
- SMS templates

### Phase C (accreditation / university)

- NAAC tasks
- CO-PO attainment
- Feedback forms
- Payroll
- Seating arrangement
- Live class integrations

## Modules you can skip initially

Canteen, railway concession, multi-branch, Zoom/GMeet, online course LMS, inventory, alumni events, visiting-staff payroll, system updater.

## Permission seeds

Create roles: SuperAdmin, Registrar, Accountant, Teacher, HOD, Principal, Student, Parent.

Modules to seed: Academics, Students, Fees, Attendance, Exams, HR, FrontOffice, Reports, Settings.

Actions: view, create, update, delete, export, approve, collect, publish.

## API conventions

```
/api/v1/sessions
/api/v1/classes
/api/v1/students
/api/v1/students/:id/enrollments
/api/v1/fees/types
/api/v1/fees/invoices
/api/v1/fees/invoices/:id/payments
/api/v1/attendance/student
/api/v1/exams
/api/v1/exams/:id/marks
/api/v1/notices
```

Always scope by `orgId` + `sessionId` from the JWT / session.

## Data migration from this ERP later

If a client is on this MPOnline/Smart School stack:

- Students + guardians + current class
- Fee masters + paid receipts (not draft UI state)
- Exam marks published only
- Staff directory

Dump via their CSV exports / Backup Restore rather than scraping.

## UX differences you should introduce

- One student 360 page instead of 18 nested menus
- Command palette search (name / admission no / receipt no)
- Real draft + submit on mark entry
- Immutable receipts and published results
- Audit drawer on every money and marks row
- Mobile teacher attendance

## Testing matrix (minimum)

- Permission denied on collect-fees for Teacher
- Partial payment updates balance correctly
- Promotion does not erase previous session marks
- Disabled student cannot log in
- Result-blocked student sees “withheld” not empty
- Fine slab applies after due date and can be waived with reason

## File map in this folder

Start with `03-domain-model.md` + `16-rebuild-blueprint.md`, then implement module files in MVP order.
Full live menu: `15-sidebar-inventory.md` (323 routes).
