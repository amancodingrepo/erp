# ERP domain model and build order

Independent design notes. Rebuild these concepts; do not scrape or wrap the live vendor app.

## Suggested bounded contexts

1. Identity & access
2. Organization & academics
3. People (students, parents, staff)
4. Communication (channels, inbox, events, push/SMS)
5. Fees & payments
6. Attendance
7. Admissions
8. Transport
9. Store
10. Examinations / performance
11. Library
12. HR / payroll
13. Reporting

Start with 1–6. Add 7–10 next. Library, payroll, visitors last.

## Core entities

### Tenancy

- Organization
- Branch
- AcademicYear (current flag, next year)
- Membership (user + org/branch + role)

### Academics

- Grade / Class (name + section)
- House
- SubjectCategory, SubjectType, Subject
- ClassSubject (enrollment of subject in a class+year)
- RollNumber
- GradeEligibilityRule (DOB window)
- PromotionJob (change / promote / alumni)

### People

- User (login identity: phone/email)
- StaffProfile (designation, category, documents, last seen)
- DriverProfile
- StudentProfile (enrollment no, DOB, gender, category, religion, nationality, RTE flag, house, pickup/drop)
- Guardian (relationship, phone, email)
- StudentGuardian
- SiblingGroup
- CorporateAccount + CorporateStudent

### Communication

- Channel (type: school | class | route | daycare | staff_group)
- ChannelMessage (type: news | alert | homework, body, attachments, enable_reply)
- MessageReceipt (user, viewed_at)
- Conversation + ConversationMessage (private inbox)
- BroadcastList + BroadcastListMember
- Event
- Questionnaire + QuestionnaireResponse
- ExternalLink
- CommunicationPolicy (one-way flags by staff role)

### Fees

- FeeType
- DiscountType
- FeeInstallmentType
- FeeTemplate + FeeTemplateLine
- ClassFeePlan (template applied to class+year)
- StudentFeeAccount + StudentFeeLine
- Concession
- LateFeeRule
- Payment (mode, instrument, status)
- PaymentReversal / Refund / ChequeBounce
- DepositSlip
- FeeReminder
- Invoice

### Attendance

- AttendanceModeType
- AttendanceRecord (person, date, period optional, status, source: manual|rfid|gps)
- Status enum: present | absent | late | half_day | leave | not_taken

### Admissions

- FormTemplate (enquiry | admission)
- FormField (builder)
- OpenForm (year, visible/hidden, T&Cs)
- Application
- AdmissionTest
- Conversion to Student

### Transport

- Vehicle (capacity, GPS, CCTV, documents: RC, tax, permit, insurance, fitness)
- Route (in/out, stops, schedule)
- RouteAssignment (student or staff)
- Trip (actuals, km, on-time, geofence, overspeed)
- FuelLog
- TransportSlab (fee by distance/area)
- LiveLocation (stream)

### Store

- Vendor
- Product
- Kit
- ProductVendor
- Order + OrderLine (child-scoped)
- Delivery

### Performance

- ReportTemplate (terms / subterms / subsets)
- ClassTemplateAssignment
- Assessment
- Mark
- CoScholasticEntry

### Library (from reports)

- LibraryCenter
- Title / Author / Publisher
- Accession
- Issue / Return / Fine / Loss / Weedout

## Status machines worth implementing first

**Student**
`enquiry → applied → admitted → enrolled → promoted | class_changed | alumni | inactive`

**Fee line**
`due → partially_paid → paid → waived | overdue → reversed`

**Notice**
`draft → pending_approval → published → deleted`  
(Approval Efficiency Report proves an approval step exists.)

**Attendance day**
`not_taken → marked` (and later corrected)

**Store order**
`created → paid/confirmed → delivered`

## Navigation spec for a Branch Admin ERP

Mirror this IA; rename if you want, keep the grouping.

```
Communication
  Notice Board
  Events
  Messages

Campus
  My Branch (settings hub)
  Contacts
  Search Users

Operations
  Fees
  Attendance
  Attendance Dashboard
  Day Care
  Transport
  Store

Academics
  Performance / Report Cards
  Admission / Enquiry

Insights
  Reports
```

## Implementation priorities (90-day cut)

### Weeks 1–3

- Orgs, branches, years, classes
- Users, roles, role switch
- Students + parents + staff
- Notice channels + receipts
- Private messages

### Weeks 4–6

- Fee types, templates, student ledger, collect payment, reminders
- Daily attendance + dashboard
- Search users

### Weeks 7–10

- Admission form builder
- Promotion / alumni
- Events
- Basic reports: strength, fee due, daily attendance, notice views

### Weeks 11–13

- Transport master data (routes, vehicles) — GPS later
- Store products + orders
- Report-card templates

## What not to clone blindly

- Their exact URL scheme and snowflake IDs
- Their CSS / logo / copy
- Mixing Angular + React + MVC in one app unless you already have that stack
- Building 80 reports on day one — generate reports from the same fact tables
- Putting Org Admin features into a single-campus product

## Data rules

- Never log or ship student PII from a live third-party tenant into your repo.
- Build on your own school’s data.
- Treat enrollment number as the external business key.
- Academic year is on almost every query — make it a required context header in your API.
