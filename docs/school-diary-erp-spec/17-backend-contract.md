# Backend contract (build this; ship your own UI)

This is **your** API + domain, inferred from School Diary behavior. It is not their server. Use your IDs, auth, and URLs.

Convention: REST JSON, `Authorization: Bearer`, every request scoped by `membership` → `org_id`, `branch_id`, `role`. Almost every list takes `academic_year_id`.

Mutating endpoints must be idempotent where money or attendance is involved (`Idempotency-Key`).

---

## 0. Cross-cutting

```
User
Membership   user × org × branch × role × modules[]
AcademicYear branch-scoped, is_current, next_year_id
AuditLog     actor, action, entity, before/after, at
File         id, owner_type, owner_id, mime, url
```

**Roles:** OrgAdmin, BranchAdmin, Principal, Teacher, Coordinator, FeesSubAdmin, AdmissionSubAdmin, ExaminationSubAdmin, TransportSubAdmin, LibrarySubAdmin, HRMSubAdmin, Driver, CareTaker, Staff, StoreVendor, Parent (User), ReadOnly.

**Staff modules** (who may be messaged / assigned work): Fees, Transport, Uniforms, Library, Academics, Others.

**Errors:** 401 unauthenticated, 403 wrong campus/role, 404, 409 business conflict (already paid, year locked), 422 validation.

**List pattern:** `?q=&page=&page_size=&sort=&academic_year_id=&class_id=&status=`

---

## 1. Identity

```
POST /api/v1/auth/login          { identifier, password, country }
POST /api/v1/auth/otp/request    { phone }
POST /api/v1/auth/otp/verify
GET  /api/v1/auth/me
GET  /api/v1/auth/memberships
POST /api/v1/auth/switch         { membership_id }
POST /api/v1/auth/logout
PATCH /api/v1/users/me
POST  /api/v1/users/me/password
POST  /api/v1/users/{id}/reset-password     # parent/staff reset
```

`switch` issues a new token bound to one membership. Token claims: `sub, membership_id, org_id, branch_id, role`.

Parent login can be disabled per student (`parent_login_enabled`).

---

## 2. Org / branch / year / class

```
GET/POST          /orgs
GET/PATCH         /orgs/{id}
GET/POST          /branches
GET/PATCH         /branches/{id}          # logo, name, address, principals[]
GET/POST          /academic-years
POST              /academic-years/{id}/set-current
GET/POST          /classes
PATCH/DELETE      /classes/{id}
POST              /classes/reorder
GET/PUT           /classes/{id}/teachers     # class teacher + subject teachers
GET/PUT           /classes/{id}/subjects
GET/PUT           /classes/{id}/report-template
GET/PUT           /classes/{id}/result-dates
GET/PUT           /classes/{id}/opening-dates
GET               /classes/{id}/students
GET/POST          /houses
POST              /houses/bulk-assign
GET/POST          /subjects /subject-categories /subject-types
GET/POST          /grade-eligibility          # DOB min/max per class+year
POST              /roll-numbers/assign        { class_id, strategy }
```

**Class** = display name + section letter + year. Promotion/change/alumni:

```
POST /year-end/change-class    { student_ids[], to_class_id }   # same year
POST /year-end/promote         { from_class_id, to_class_id, student_ids[] }
POST /year-end/alumni          { student_ids[], exit_date }
```

Rules: promote writes a new `enrollment` row for next year; old year stays historical. Alumni sets `status=alumni` and closes fee/attendance for future dates.

---

## 3. People

### Student

```
GET    /students
POST   /students
GET    /students/{id}
PATCH  /students/{id}
POST   /students/{id}/deactivate
POST   /students/{id}/reactivate
POST   /students/{id}/photo
GET    /students/{id}/documents
POST   /students/{id}/documents
DELETE /students/{id}/documents/{docId}
GET    /students/{id}/siblings
POST   /search/people              # email, phone, names, enrollment, exact
```

**Student columns (persist these):**  
first/middle/last, dob*, gender*, academic_year_id*, class_id*, enrollment_date, enrollment_number (unique per branch), roll_number, house_id, lunch_from_school, photo_id, aadhaar, jan_aadhaar, scholar_number, sssm_id, religion, category, caste, blood_group, disabilities[], is_rte, nationality, admitted_class, annual_income, is_only_child, pen, apaar_id, grn, saral_id, rfid, status (active|inactive|alumni), parent_login_enabled, student_login_enabled, remark, is_defaulter.

**Enrollment history:** `student_enrollments(student_id, year_id, class_id, roll, status, from, to)`.

### Guardians

```
GET/POST /students/{id}/guardians
PATCH    /guardians/{id}
```

Per guardian: relationship (father/mother/other), first/middle/last, phone, alt_phone, email, occupation, education, aadhaar, photo, address (residential + permanent), same_as_residential.

Siblings: shared `family_id` or explicit `sibling_links`.

### Staff / drivers

```
GET/POST /staff
GET/PATCH /staff/{id}
GET/POST /staff-categories
GET/POST /drivers
GET/PUT  /staff/{id}/modules          # fees, transport, …
GET/PUT  /staff/{id}/classes
GET/PUT  /staff/{id}/subjects
```

Staff: name, designation, category, phones, email, dob, gender, last_seen, documents[], can_login.

---

## 4. Fees (core money domain)

### Masters

```
CRUD /fee-types          # refundable, cgst, sgst, igst
CRUD /discount-types
CRUD /fee-installments   # First, Second, … named
CRUD /fee-templates
GET  /fee-templates/{id}
POST /fee-templates/{id}/lines
POST /fee-templates/{id}/apply        { class_ids[] | student_ids[] }
GET/PUT /late-fee-rules
POST /fees/upload                     # spreadsheet
POST /fees/bulk-pay
```

**Template line:** installment_id, fee_type_id, amount, discount, tax, due_date, is_optional.

**Apply:** for each student in class+year, upsert `fee_account` + `fee_lines` from template. Do not wipe already-paid lines.

### Ledger

```
GET  /students/{id}/fees                    # totals + lines
GET  /fees                                  # class desk: total, paid, next_due
POST /students/{id}/fees/pay
POST /students/{id}/fees/pay-partial
POST /payments/{id}/reverse
POST /payments/{id}/refund
POST /payments/{id}/cheque-bounce
POST /fees/remind                           { class_id? }  # all classes if omitted
CRUD /deposit-slips
GET  /fees/concessions
POST /students/{id}/concessions
```

**Pay body:**

```
{
  "line_ids": [],
  "amount": 0,
  "method": "upi",
  "include_late_fee": true,
  "instrument": { "cheque_no, bank, date, utn, gateway" },
  "remark": ""
}
```

**Methods:** cash, cheque, online, direct_to_bank, card, debit_card, credit_card, neft, loan_grayquest, credit_note, bank_transfer, upi, qr, wallet, ecs.

**Cheque:** submitted → paid | bounce.

**Invariants (do not break):**

```
line.total     = sub_amount - discount + late_fee
account.total  = sum(line.total)
account.paid   = sum(payments.amount where status=captured)
account.unpaid = total - paid
line.status    = unpaid | partial | paid | waived | reversed
```

Late fee computed from rules at pay time unless `include_late_fee=false`.  
Never delete a payment; reverse creates a compensating row.  
Receipt number unique per branch.  
Next payment date = min(due_date of unpaid lines).

---

## 5. Attendance

```
GET  /attendance?book=class|teacher|staff&date=&class_id=
PUT  /attendance/day                     # replace marks for that book+date+class
GET  /attendance/modes
GET  /attendance/dashboard               # aggregates
GET  /daycare
POST /daycare/check-in
POST /daycare/check-out
```

**Row:** `person_type, person_id, date, period_id?, status, source (manual|rfid|gps), marked_by, marked_at`.

Status: present, absent, late, half_day, leave, holiday, not_taken.

Rule: one row per person per date per period. Year-end students only in their enrollment class. RFID swipe writes source=rfid.

Daycare: only students with `is_daycare=true`. Check-in/out timestamps + optional CCTV flag.

---

## 6. Communication

### Channels / notices

```
GET  /channels?year_id=
GET  /channels/{id}/notices?type=news|alert|homework
POST /channels/{id}/notices
POST /notices/{id}/attachments
POST /notices/{id}/delete
GET  /notices/{id}/reads
GET  /notices/{id}/not-viewed
```

Channel kinds: school, teachers, daycare, class, route.  
Class channels auto-created with the class; members = parents (and teachers) of students in that class+year.

Notice: body, hashtags[], type, allow_reply, attachments[].  
On publish, fan-out receipts to members (`read_at` null). Parent app marks read.

Types: news, alert, homework_worksheet, homework_assignment. Homework only valid on class channels.

### Inbox (tickets)

```
GET  /messages?box=inbox|sent|unseen|scheduled
POST /messages
POST /messages/{id}/reply
POST /messages/{id}/close
POST /messages/{id}/reopen
GET  /messages/policies                  # one-way roles
PUT  /messages/policies
```

Fields: recipients[], body, attachments, category (fees|transport|academics|uniforms|library|others), deliver_at, send_sms, status (open|closed).

If `deliver_at` future → scheduled. SMS is informational only (no reply on SMS).  
Parent cannot message a role if policy says one-way.

### Events

```
GET/POST /events?from=&to=&class_id=
```

### Broadcast lists (Contacts)

```
CRUD /broadcast-lists
POST /broadcast-lists/{id}/members
```

---

## 7. Admissions / enquiry

```
CRUD /form-templates                    # enquiry | admission
GET  /form-templates/{id}/builder
POST /open-forms                        # year + visible/hidden + T&Cs
GET  /applications
POST /applications/{id}/convert-to-student
GET  /admission-tests
```

Public apply URL is a published `open_form` token, not the admin console.

---

## 8. Transport

```
CRUD /vehicles
CRUD /routes
PUT  /routes/{id}/stops                 # ordered lat/lng + name + time
GET  /routes/{id}/map
PUT  /students/{id}/transport           # in_route, in_stop, out_route, out_stop
GET  /transport/live
GET  /transport/trips
GET  /transport/reports/{name}
CRUD /fuel-logs
CRUD /transport-slabs
```

Vehicle: registration, capacity, tracker_id, cctv, compliance date-pairs (insurance, tax, permit, fitness, puc), driver_id, caretaker_id, fuel_type.

Trip: route_id, vehicle_id, started_at, ended_at, km, max_speed, geofence events.

---

## 9. Exams

```
CRUD /report-templates
POST /classes/{id}/report-template
GET/PUT /classes/{id}/marks             # student × subject × term
PUT     /students/{id}/co-scholastic
GET     /performance?class_id=&year_id=
```

Template must be assigned before marks UI opens (“template is not assigned to selected class”).

Leave types have a percent-of-max mapping (`/leave-mark-percents`).

---

## 10. Store / library / HR (interfaces)

Store: vendors, products, kits, orders(child_id, lines, status: placed|paid|processing|delivered|cancelled), deliveries.

Library: centers, titles, accessions, issues, due, fines, lost, weedout.

HR: payslips, loans, TDS, PF, ESI — report facts even if UI comes later.

Questionnaires: bank, assign to class, submissions.

---

## 11. Reports runner

Do not implement 80 controllers.

```
GET  /reports
GET  /reports/{key}/schema              # filters + default columns
POST /reports/{key}/run                 # { filters, columns } → rows
GET  /reports/{key}/export.xlsx
GET  /reports/{key}/export.pdf
```

First keys: `paid_fee`, `fee_type_wise_paid`, `datewise_paid_fee`, `fee_summary`, `fee_accounting`, `fees_due`, `daily_attendance`, `attendance_summary`, `student_strength`.

Fee report filters: year, class[], method, fee_type[], from/to, settlement from/to, utr, collector, sort, route, installment, hostel, student_type, gateways[], cheque_status, include_header.

---

## 12. Permissions matrix (minimum)

| Action | Who |
| --- | --- |
| Switch campus | any membership holder |
| CRUD students | BranchAdmin, AdmissionSubAdmin |
| Collect fees / reverse | BranchAdmin, FeesSubAdmin |
| Post school notice | BranchAdmin, Principal |
| Post class notice / homework | Class teacher, Coordinator, BranchAdmin |
| Message parents | staff with matching module |
| Mark class attendance | Class teacher, BranchAdmin |
| Mark staff attendance | BranchAdmin |
| Promote / alumni | BranchAdmin |
| Transport live / routes | TransportSubAdmin, BranchAdmin |
| Org rollup reports | OrgAdmin |

Parents: read own child, notices of child’s channels, own fee ledger, own attendance, reply if `allow_reply`.

---

## 13. What this backend must never do

- Mutate another tenant’s rows
- Delete payment history
- Allow Post on notices/messages from a cloned script against the vendor site
- Expose other students to a parent token

---

## 14. Suggested first slice (actually shippable)

1. Auth + membership switch  
2. Years, classes, students, guardians  
3. Channels + notices + reads  
4. Fee types, one template, apply, ledger, pay cash/upi  
5. Class attendance PUT for one date  
6. Report: fees due + paid fee  

That is a working product. Everything else plugs into the same tables.
