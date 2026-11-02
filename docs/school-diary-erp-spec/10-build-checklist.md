# ERP build checklist

Use this as the implementation backlog. Rebuild independently. Do not wrap the live vendor app or copy assets.

Safety used while mapping: GET/view only. Never clicked Save, Submit, Post, Delete, Send reminder, Deactivate, Reset password, or Create on a filled form.

## Must-have (parity with Branch Admin daily use)

- [x] Multi-role login (phone/email + password) and membership switch
- [x] Academic year context on every list
- [x] Classes (name + section + subjects + class teachers)
- [x] Students + primary parent login + mother/father/guardian names
- [x] Student IDs: enrollment, roll, scholar, PEN, APAAR, Aadhaar, SSSM, GRN, Saral
- [x] Notice channels (school, class, route) + News/Alert + read receipts
- [x] Private parent messages (inbox/sent)
- [x] Events calendar
- [x] Contacts directory + broadcast lists
- [x] Fee types, templates (installment × head × amount × due date), apply to class
- [x] Student fee ledger + collect payment + reminder + reverse
- [x] Late fee rules
- [x] Attendance mark grid + statuses including Not Taken
- [x] Attendance dashboard KPIs
- [x] Search users (name, phone, email, enrollment) → jump to fees
- [x] Admission / enquiry form builder
- [x] Reports: strength, fee due, daily attendance, notice views

## Should-have

- [x] Houses + change house
- [x] Promote / change class / alumni
- [x] Staff + driver HR fields + role category permissions
- [x] Staff ID cards
- [x] Transport vehicles (compliance dates) + routes + stops + map
- [x] Assign student in/out route
- [x] Daycare flag + check-in/out + CCTV consent
- [x] Immunization records
- [x] Store products / kits / orders
- [x] Questionnaires / quizzes
- [x] Performance report templates + marks
- [x] RFID map on student
- [x] Defaulter flag
- [x] Siblings
- [x] Bulk fee upload + bulk photo upload

## Later

- [x] GPS last ping + trip playback (staff-posted; no live vendor)
- [x] Library
- [x] Payroll (TDS, PF, ESI, payslip)
- [x] Timetable
- [x] Visitor register
- [x] Org Admin multi-campus rollup
- [x] Corporates / sponsored students
- [x] Approval workflow on notices
- [x] Birthdays, class eligibility, one-way comm, external links, principals, attendance modes
- [x] Student media diary (HTTPS or hosted files) + notice attachments + remote delete
- [x] Broadcast lists + cheque bounce
- [x] Subject categories + subject types + leave-type marks percent
- [x] Fee deposit slips + store vendor master
- [x] Class absent SMS + virtual classroom flags, emergency SMS, event reminders
- [x] Notice replies gated by Enable Reply + daycare diary channel
- [x] Hosted campus website + performance analytics (result summary / absents / consolidated)
- [x] EYFS areas of learning + observation notes
- [x] Co-scholastic grades on performance desk (individual + bulk)
- [x] Fee refunds (keep original receipt) + standing student concessions
- [x] Transport fuel log + named distance/area fee slabs
- [x] Library book centers (named locations, soft delete, assign titles)
- [x] Class result dates + school opening dates
- [x] Staff categories named master (staff form FK)
- [x] Admission tests (named sittings + scores on live applications)
- [x] Fee installment types named master (template rows)
- [x] Sub-subjects (live parent subject on subject master)
- [x] Academic year receipt / invoice / admission prefixes
- [x] Class reorder (live Class.sequenceNo)
- [x] Staff role modules (fees / transport / uniforms / library / academics / others)
- [x] Staff assigned classes and subjects
- [x] Fee type refundable / GST flags
- [x] House colour and description
- [x] Class report-template assign
- [x] PATCH/DELETE classes
- [x] Custom field builder
- [x] Class teachers / subjects / students nested routes
- [x] Class marks nested GET/PUT (template required)
- [x] Student document DELETE + nested siblings/guardians
- [x] User reset-password + own profile/password
- [x] Student photo upload + drivers GET/POST
- [x] Nested route stops / map + student transport PUT
- [x] Fee bulk-pay + nested pay / pay-partial
- [x] Report schema + xlsx export on the single runner
- [x] Nested notice channels (`GET /channels`, `GET/POST /channels/{id}/notices`)
- [x] Org / branch aliases wrapping tenants (`GET/POST /orgs`, `GET/PATCH /orgs/{id}`, `GET/POST /branches`, `GET/PATCH /branches/{id}`)
- [x] Academic-year aliases wrapping sessions (`GET/POST /academic-years`, `POST /academic-years/{id}/set-current`)
- [x] Notice reads alias (`GET /notices/{id}/reads`)
- [x] Year-end aliases wrapping promotions (`POST /year-end/change-class|promote|alumni`)
- [x] Auth switch alias (`POST /auth/switch` `{ membership_id }`)
- [x] Notice delete POST alias (`POST /notices/{id}/delete`)
- [x] Staff documents (HTTPS or hosted files on Setting `hr.staffDocuments`)
- [x] Attendance Idempotency-Key on student/day/staff PUT
- [x] Campus file host (`POST/GET /api/v1/files`, Setting `campus.files`)
- [x] Guardian Aadhaar / photo / dual address extras (Setting `students.guardianExtras`)
- [x] Library weedout (Setting `library.weedout`; available = qty − open issues − weeded)
- [x] HR staff loans + repay (Setting `hr.loans`)
- [x] House bulk-assign alias (`POST /houses/bulk-assign`)
- [x] Grade eligibility alias (`GET/POST /grade-eligibility`)
- [x] Roll-numbers assign alias (`POST /roll-numbers/assign`)
- [x] Fee remind alias (`POST /fees/remind`)
- [x] Fee-templates wrapping masters (`GET/POST /fee-templates`, lines, apply)
- [x] Payment reverse alias (`POST /payments/{id}/reverse`)
- [x] Student deactivate / reactivate aliases (`POST /students/{id}/deactivate|reactivate`)
- [x] People search alias (`POST /search/people`)
- [x] Late-fee-rules alias (`GET/POST/PUT /late-fee-rules`) wrapping FineRule
- [x] Discount-types alias (`GET/POST /discount-types`) wrapping FeeDiscount
- [x] Fee upload alias (`POST /fees/upload`) wrapping CSV import
- [x] Payment refund and cheque-bounce aliases (`POST /payments/{id}/refund|cheque-bounce`)
- [x] Campus concessions list (`GET /fees/concessions`)
- [x] Attendance book/day aliases (`GET /attendance?book=`, `PUT /attendance/day`)
- [x] Attendance modes alias (`GET/POST /attendance/modes`)
- [x] Daycare check-in/out aliases (`POST /daycare/check-in|check-out`)
- [x] Messages wrapping requests (`GET/POST /messages`, reply/close/reopen, policies)
- [x] Broadcast-lists wrapping contacts lists (`GET/POST /broadcast-lists`, members)
- [x] Form-templates / open-forms / convert-to-student aliases wrapping admission forms and enroll
- [x] Vehicles / transport live+trips / fuel-logs / transport-slabs aliases wrapping fleet and staff GPS pings
- [x] Performance GET and leave-mark-percents aliases wrapping student-performance and leave-marks-percent
- [x] Report-templates wrapping performance-templates + POST class report-template
- [x] Routes aliases (`GET/POST /routes`, stops/map) wrapping transport routes
- [x] Transport reports on the single runner (`GET /transport/reports/{name}`, fuel-logs grain)
- [x] GET /fees class desk wrapping due search
- [x] Vehicle extras PATCH (`capacity`, tracker, CCTV, tax/permit, driver, fuel) in Setting JSON
- [x] Store kits / deliveries aliases wrapping products and order deliver
- [x] Library titles / accessions aliases wrapping books and Setting `library.accessions`
- [x] Vehicle DELETE plus Setting extras/compliance/pings purge
- [x] Questionnaire assign alias (`POST /questionnaires/{id}/assign`) wrapping feedback assignments
- [x] Payslips list alias (`GET /payslips`) wrapping payroll slips
- [x] Student fees GET alias (`GET /students/{id}/fees`) wrapping ledger
- [x] Library due / fines / lost aliases wrapping issues and Setting `library.lost`
- [x] Questionnaire submissions alias (`GET/POST /questionnaires/{id}/submissions`) wrapping feedback responses
- [x] Fuel-logs / transport-slabs / routes item CRUD (`GET/PATCH/DELETE`) plus broadcast-list DELETE
- [x] Discount-types / fee-installments / form-templates item CRUD plus fee-type DELETE
- [x] Staff-categories / subject-categories / subject-types item CRUD plus late-fee-rules item PATCH/DELETE and fee-templates PATCH/DELETE
- [x] Deposit-slips / report-templates / store-vendors / leave-mark-percents / events item CRUD
- [x] Questionnaires / store-products / library-titles item CRUD
- [x] Library-centers item CRUD, events from/to/class_id filters, concessions POST + item DELETE
- [x] Grade-eligibility / admission-tests / attendance-modes item CRUD
- [x] Library accessions / weedout / lost item CRUD
- [x] Drivers / corporates / store-kits item CRUD
- [x] Subjects / academic-years item CRUD
- [x] Designations / departments / categories / disable-reasons item CRUD
- [x] Class-teachers / class-flags / session-prefixes item CRUD
- [x] Fee-groups / exam-groups / cctv item CRUD
- [x] Co-scholastic aspects / EYFS areas item CRUD
- [x] Grades / leave-types / periods item CRUD
- [x] Houses / hostels / visitors item CRUD
- [x] Links / front-office-types / message-templates item CRUD
- [x] Live-classes / programs / exam-forms (windows + submissions) item CRUD
- [x] Report PDF export (`GET /reports/{key}/export.pdf` and `?format=pdf`) on the same runner
- [x] Attendance source `manual|rfid|gps` on mark/roster (Setting `attendance.sources`)
- [x] `student_login_enabled` from the linked student portal user

## Pages explicitly not mutated

Admit/Edit student, Add Staff, Add Driver, Create Class, Create Subject, Create Academic Year, Add House, Add Fee Type/Discount/Installment/Template, Late fee page, Add Bus, Create Route, Admission Information, Questionnaires, Store, Profile.

## Honest gap

Individual `/Reports/*` pages were catalogued from the hub (filters + export), not opened one-by-one. They share one pattern: year/class/date filters → HTML table → Excel. Implement a report runner on top of the same tables instead of 80 unique apps.
