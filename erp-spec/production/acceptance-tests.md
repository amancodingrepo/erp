# Acceptance tests

## Auth
- Staff logs in with valid user → dashboard
- Bad password 5 times → rate limit
- Student cannot open `/api/v1/fees/payments`
- Disabled user cannot login

## Academics
- Create session and mark current; lists default to it
- Create program UG, class FY, two sections A/B
- Cannot create two sections named A in the same class

## Students
- Create student with unique admissionNo
- Duplicate admissionNo → 409
- Search by name fragment and by admissionNo
- Disable with reason → disappears from default search, appears on disabled list
- Generate roll numbers boys-first from 101
- CSV import: one bad row does not insert; error report lists line numbers

## Fees
- Master: group + two types (Tuition 20000, Exam 2000) for current session
- Assign to class → each student gets invoice total 22000
- Pay 10000 cash → status PARTIAL, receiptNo issued
- Same Idempotency-Key twice → one payment
- Pay remaining + fine → PAID
- Cancel receipt → contra, invoice reopens, original receipt stays in log
- Due search filtered by fee group returns only unpaid lines of that group

## Attendance
- Mark section for a working day
- Holiday date rejected unless override
- Monthly % ignores holidays
- Approved student leave codes as LEAVE not ABSENT

## Exams
- Exam group Regular + College grading
- Add exam + subject max 100 min 40
- Enter marks; one student absent
- Finalize subject → further edit by teacher is 403
- Block one student result → marksheet endpoint returns withheld
- ATKT group kind can be created independently

## Promotion
- Promote section FY-A → SY-A next session
- Old enrollment remains `isCurrent=false`
- Marks of previous session still queryable

## Settings
- Change institute name → receipts pick it up
- Turn module `hostel` off → API 404/403 and nav hidden
- Custom field belongTo=Student type=Dropdown appears on create form
