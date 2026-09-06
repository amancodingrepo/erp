# API contracts (rebuild)

Base: `/api/v1`  
Auth: Bearer session or JWT. Every request scoped by `campusId` from token.  
Idempotency: `Idempotency-Key` required on `POST /fees/payments`.

## Common errors

```
401 unauthenticated
403 forbidden
404 not_found
409 conflict          // duplicate admissionNo, double receipt
422 validation_error  // { fields: { admissionNo: "required" } }
429 rate_limited
```

## Auth

```
POST /auth/login
{ username, password, portal: "staff"|"student"|"parent" }
→ { token, user: { id, actorType, roles[] }, campus }

POST /auth/logout
GET  /auth/me
PATCH /auth/password
{ current, next }
```

## Sessions / academics

```
GET  /sessions
POST /sessions                    { name, code, sequenceNo, startDate, endDate }
POST /sessions/:id/activate

GET  /departments
POST /departments                 { name, code }

GET  /programs?departmentId=
POST /programs                    { departmentId, name, level, durationYears }

GET  /classes?programId=&sessionId=
POST /classes                     { programId, name, yearNo, sectionNames[], isOtherCourse }

GET  /classes/:id/sections
POST /sections                    { classId, name, specializationId }

GET  /subjects
POST /subjects                    { name, code, kind, isOptional }

GET  /timetable?sectionId=&sessionId=
PUT  /timetable                   { sectionId, sessionId, slots: [{ weekday, periodId, subjectId, staffId, room }] }
```

## Students

```
GET  /students?q=&classId=&sectionId=&status=&page=&pageSize=
→ { data: StudentListRow[], total }

POST /students                    // see field-catalog student/create
→ 201 Student

GET  /students/:id                // 360 payload
PATCH /students/:id
POST /students/:id/disable        { reasonId }
POST /students/:id/enable

POST /students/roll-numbers
{ classId, sectionId, startFrom, arrangement: "mix"|"boys_first"|"girls_first", sort: "last"|"first"|"id" }

POST /students/import             multipart CSV
GET  /students/:id/documents
POST /students/:id/documents      multipart
```

List row LIVE columns: Student ID, Name, Class, Roll, Enrollment No, Father/Spouse, DOB, Gender, Category, Mobile.

## Fees

```
GET  /fee-types
POST /fee-types                   { name, code }

GET  /fee-groups
POST /fee-groups                  { name }

GET  /fee-masters?sessionId=
POST /fee-masters                 { sessionId, groupId, dueDate, lines: [{ feeTypeId, amount }] }

GET  /students/:id/ledger?sessionId=
GET  /fees/due?classId=&sectionId=&feeGroupIds[]=

POST /fees/invoices               { studentId, sessionId, masterId }
POST /fees/payments
{ invoiceId, amount, discount, fine, method, reference, paidAt, note }
→ { receiptNo, invoice }

POST /fees/payments/:id/cancel    { reason }
GET  /fees/receipts/:receiptNo
```

Collect page LIVE: search by Class, Section, keyword → table Class, Section, Student ID, Name, Father, DOB, Phone, Action.

Due search LIVE: fee group multi-select + class/section.

## Attendance

```
GET  /attendance/students?classId=&sectionId=&date=&subjectId=
PUT  /attendance/students
{ date, sectionId, subjectId?, entries: [{ studentId, status }] }

GET  /attendance/students/report?sectionId=&from=&to=
```

## Exams

```
GET  /exam-groups?sessionId=
POST /exam-groups
{ name, examType, groupKind, startDate, endDate, examMonthYear, isAdditional, revaluationOn, classIds[] }

POST /exam-groups/:id/exams       { name }
POST /exams/:id/subjects
{ subjectId, dateFrom, startTime, durationMin, roomNo, maxMarks, minMarks }

GET  /exams/:id/roster?subjectId=
PUT  /exams/:examSubjectId/marks
{ entries: [{ studentId, marks, isAbsent }] }
POST /exams/:examSubjectId/finalize

POST /students/:id/result-block   { examGroupId, blocked: true, reason }
GET  /exams/:id/results
GET  /students/:id/marksheet?examId=     // PDF
GET  /students/:id/admit-card?examId=    // PDF
```

Exam type enum LIVE: GENERAL_PASS_FAIL, SCHOOL_GRADE, COLLEGE_GRADE, GPA, AVERAGE_PASSING.  
Group kind LIVE: Regular | ATKT.

## Staff

```
GET  /staff?q=&departmentId=
POST /staff
GET  /staff/:id
PATCH /staff/:id
GET  /departments  (already)
GET  /designations
POST /designations { name }
```

## Notices

```
GET  /notices
POST /notices  { title, body, audience, classId, publishAt }
```

## Settings

```
GET  /settings
PATCH /settings   { name, code, address, phone, email, sessionId, dateFormat, timezone, startWeek, currencyFormat, currencyPlace }
GET  /modules
PATCH /modules/:key { enabled }
GET  /roles
PUT  /roles/:id/permissions  { permissionIds[] }
```
