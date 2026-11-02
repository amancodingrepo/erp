# ERP build checklist

Use this as the implementation backlog. Rebuild independently. Do not wrap the live vendor app or copy assets.

Safety used while mapping: GET/view only. Never clicked Save, Submit, Post, Delete, Send reminder, Deactivate, Reset password, or Create on a filled form.

## Must-have (parity with Branch Admin daily use)

- [ ] Multi-role login (phone/email + password) and membership switch
- [ ] Academic year context on every list
- [ ] Classes (name + section + subjects + class teachers)
- [ ] Students + primary parent login + mother/father/guardian names
- [ ] Student IDs: enrollment, roll, scholar, PEN, APAAR, Aadhaar, SSSM, GRN, Saral
- [ ] Notice channels (school, class, route) + News/Alert + read receipts
- [ ] Private parent messages (inbox/sent)
- [ ] Events calendar
- [ ] Contacts directory + broadcast lists
- [ ] Fee types, templates (installment × head × amount × due date), apply to class
- [ ] Student fee ledger + collect payment + reminder + reverse
- [ ] Late fee rules
- [ ] Attendance mark grid + statuses including Not Taken
- [ ] Attendance dashboard KPIs
- [ ] Search users (name, phone, email, enrollment) → jump to fees
- [ ] Admission / enquiry form builder
- [ ] Reports: strength, fee due, daily attendance, notice views

## Should-have

- [ ] Houses + change house
- [ ] Promote / change class / alumni
- [ ] Staff + driver HR fields + role category permissions
- [ ] Staff ID cards
- [ ] Transport vehicles (compliance dates) + routes + stops + map
- [ ] Assign student in/out route
- [ ] Daycare flag + check-in/out + CCTV consent
- [ ] Immunization records
- [ ] Store products / kits / orders
- [ ] Questionnaires / quizzes
- [ ] Performance report templates + marks
- [ ] RFID map on student
- [ ] Defaulter flag
- [ ] Siblings
- [ ] Bulk fee upload + bulk photo upload

## Later

- [ ] GPS live tracking + trip playback
- [ ] Library
- [ ] Payroll (TDS, PF, ESI, payslip)
- [ ] Timetable
- [ ] Visitor register
- [ ] Org Admin multi-campus rollup
- [ ] Corporates / sponsored students
- [ ] Approval workflow on notices

## Pages explicitly not mutated

Admit/Edit student, Add Staff, Add Driver, Create Class, Create Subject, Create Academic Year, Add House, Add Fee Type/Discount/Installment/Template, Late fee page, Add Bus, Create Route, Admission Information, Questionnaires, Store, Profile.

## Honest gap

Individual `/Reports/*` pages were catalogued from the hub (filters + export), not opened one-by-one. They share one pattern: year/class/date filters → HTML table → Excel. Implement a report runner on top of the same tables instead of 80 unique apps.
