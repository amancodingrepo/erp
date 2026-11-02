# Full application spec — rebuild independently

This is a product reconstruction of **School Diary** (`https://in.schooldiary.me`) as observed on Branch Admin (Annie Besant School) after `/login/Variant` switch from Org Admin.

Rebuild your own ERP. Do **not** wrap this tenant, copy logos, CSS, or source. Live student/parent values were not exported.

Observed stack: ASP.NET MVC pages + Angular (`/ng/...`) + React (`/React/Dashboard`). IDs are snowflake integers.

---

## 1. Product

Multi-tenant K–12 ops + parent communication.

```
Organization
  └── Branch (campus)
        └── AcademicYear (current / next)
              ├── Class = Name + Section
              ├── Student ↔ Guardian(s)
              ├── Staff / Driver
              ├── Channel (school | teachers | daycare | class | route)
              ├── Fee account per student+year
              ├── Attendance per person+date
              └── Transport assignment, store orders, exams, library, …
```

Web = staff console. Parents use apps. SMS is an optional parallel channel (TRAI: informational only).

---

## 2. Auth and tenancy

| Route | Function |
| --- | --- |
| `GET /Login` | Country + Email-or-Phone + Password. Forgot Password, FAQ |
| `GET /login/RequestOtp` | OTP login |
| `GET /login/Variant?id={membershipId}` | Switch org/branch/role without retyping password |
| `GET /login/LogOff/English` | Logout |
| `GET /user/Profile` | Staff self profile |
| `GET /user/Password` | Change password |

Memberships seen on this login:

- OrgAdmin ANNIE BESANT SCHOOL
- BranchAdmin ANNIE BESANT SCHOOL
- BranchAdmin Lord Krishna Public school

A user has many `memberships(user_id, org_id, branch_id, role)`. Variant id selects one. Almost every query is `branch_id + academic_year_id`.

### Roles to support

OrgAdmin, BranchAdmin, Principal, HOAdmin, Teacher, Coordinator, SubAdmin, FeesSubAdmin, AdmissionSubAdmin, ExaminationSubAdmin, TransportSubAdmin, LibrarySubAdmin, HRMSubAdmin, OrgFinanceAdmin, Driver, CareTaker, Staff, StoreVendor, BusVendor, AuthorizedPerson, ReadOnlyUser, TechSupport, User (parent).

One-way comm: parent cannot message selected roles (`/Admin/BranchMessages/DisableRoleCommunication`).

Staff also have **module checkboxes**: Fees, Transport, Uniforms, Library, Academics, Others.

---

## 3. Global chrome

- Top: product, branch title, avatar menu (Profile, Password, Change Role/School, Logout)
- Left sidebar (role-based)
- Logo
- Year dropdown on operational lists
- Filter typeahead + Export + calendar Prev/Today/Next

### Branch Admin sidebar

Notice Board · Events · Messages · My Branch · Contacts · Fees · Attendance · Attendance Dashboard · Day Care · Search Users · Performance Report · Reports · Admission/Enquiry Form · Transport · Questionnaires · Manage Store · Store Vendor

### Org Admin extras

Dashboard (`/React/Dashboard`) · School Branches · Process Order · School Branch Reports · Manage Corporates · Notice board with branch picker

---

## 4. Route inventory (complete observed set)

Base `https://in.schooldiary.me`

### 4.1 Auth / public

`/Login` `/login/RequestOtp` `/login/Variant?id=` `/login/LogOff/English` `/user/Profile` `/user/Password` `/Info/Terms` `/Info/Faq` `/ContactUs`

### 4.2 Notice Board

```
GET  /NoticeBoard
GET  /NoticeBoard?schoolBranchId=&channelId=&academicYearId=
GET  /NoticeBoard?schoolBranchId=&channelId=&type=News|Alert|Homework&academicYearId=
GET  /NoticeBoard/ExportViewsToExcel?channelMessageId=
GET  /NoticeBoard/ExportNotViewedToExcel?channelMessageId=
```

Composer POSTs to the selected channel (not invoked). Types: News, Alert; class adds Homework-Worksheet, Homework-Assignment. Tabs: News, Alert, Home Connect (`type=Homework`). Enable Reply. Attachments. Read receipts.

### 4.3 Messages / events

```
GET /messages                          # title: Requests
GET /Admin/BranchMessages
GET /Admin/BranchMessages/DisableRoleCommunication
GET /OrgAdmin/BranchMessages
GET /events/Monthly
GET /events                            # implied
```

Inbox/Sent/Unseen/Scheduled. Filter modal: RecipientFirstName, RecipientLastName, TextMessage, HashTag, GradeId, Category (Fees|Transport|Academics|Uniforms|Library|Others), Status (Open|Closed), FromDate, ToDate. Composer: attach, schedule Deliver By, recipients, optional SMS. Do not treat as fire-and-forget chat — it is ticketed.

### 4.4 My Branch hub

`GET /Admin/ManageBranch`

Users: `/Admin/ManageBranch/Users` `/Admin/Admission` `/Admin/Admission/Edit/{studentId}` `/AdmissionForm/Create/{studentId}` `/Admin/Birthday` `/Admin/Staff` `/Admin/Staff/Add` `/Admin/Staff/Edit/{id}` `/Admin/Driver` `/Admin/Driver/Add` `/Admin/StaffCategory`

Academics: `/Admin/Grade` `/Admin/Grade/Create` `/Admin/Grade/Edit/{id}` `/Admin/Grade/Order` `/Admin/Grade/AddResultDate` `/Admin/Grade/GradeTeachers/{id}` `/Admin/Grade/Map/{id}` `/Admin/Grade/ApplyReportTemplate/{id}` `/Admin/Grade/ResultDates/{id}` `/Admin/Grade/SchoolOpeningDates/{id}` `/Admin/Grade/StudentProfiles/{id}` `/Admin/Subject` `/Admin/Subject/Create` `/Admin/SubjectCategory` `/Admin/SubjectType` `/Admin/LeavesMarksPercent` `/Admin/AcademicYear` `/Admin/AcademicYear/Create` `/Admin/GradePromotion?procedure=Change|Promote|Alumni` `/Admin/GradePromotion/ChangeGrade/{gradeId}` `/PerformanceReports/Template` `/Admin/House` `/Admin/House/Add` `/Admin/HouseChange` `/Admin/GradeEligibility` `/RollNumber`

Admin: `/Admin/FeeType` `/Admin/FeeType/Create` `/Admin/DiscountType` `/Admin/DiscountType/Create` `/Admin/FeeTemplate` `/Admin/FeeTemplate/Create?schoolBranchId=` `/Admin/FeeTemplate/View/{id}` `/Admin/FeeTemplate/Apply/{id}` `/Admin/FeeTemplate/Export/{id}` `/Admin/ManageLinks` `/Admin/FeesUpload` `/Admin/BulkStudentAndParentPhotoUpload` `/Admin/AttendanceModeType` `/Admin/ManagePrincipals` `/Admin/FeeInstallment` `/Admin/FeeInstallment/Create` `/Library/LibraryCenter` `/Library/Library` `/Library/Library/ManageLibraryMaster` `/LateFeeConfiguration`

### 4.5 People

`/Contacts` `/SearchUsers` `/OrgAdmin/BranchContacts`

### 4.6 Fees

```
GET /Fees
GET /Fees/BulkFeePayment
GET /LateFeeConfiguration
GET /ReversePayment
GET /Admin/DepositSlips
GET /ChequeSubmitted
GET /FeesDueReport
GET /Fees/FeesConcessionReport
```

Student ledger lives on `/Admin/Admission/Edit/{id}` tabs `#tab-fees` and `#tab-fees-summary`.

### 4.7 Attendance

```
GET /attendance
GET /attendance/AttendanceReport
GET /ng/orgadmin-dash/organization
GET /ng/orgadmin-dash/schoolbranch/{branchId}/{name}/{yyyy-MM-dd}
GET /daycare
```

Tabs on `/attendance`: Class | Teacher | Staff. Month/Day calendar.

### 4.8 Academics / admission forms

`/StudentPerformance` `/PerformanceReports/Template` `/AdmissionForm` `/AdmissionForm?Enquiry=True` `/AdmissionForm/Create` `/AdmissionForm/Builder` `/AdmissionForm/DownloadEmptyEnquiryForm` `/AdmissionForm/DownloadEmptyAdmissionForm` `/AdmissionForm/OrgPage` `/Admin/AdmissionFormTermConditions`

### 4.9 Transport

```
/Transport/Dashboard
/Transport/Buses  /Transport/buses/add
/Transport/Staff
/Transport/Routes  /Transport/Routes/Create
/Transport/Slabs/Overview  /Transport/Slabs/Summary
/Transport/Reports/RouteSafety
/Transport/Reports/TripPlayback
/Transport/Reports/Speed
/Transport/Reports/OverallDistance
/Transport/Reports/Distance
/Transport/Reports/RoutesTiming
/Transport/Reports/TransportReport
/Transport/Reports/OverSpeedReport
/Transport/Reports/ChildRouteHistoryReport
/Transport/Reports/SummaryReport
/Transport/Reports/RescheduledRoutesReport
/Transport/Reports/DateWiseFuelReport
/Transport/Reports/VehicleDetailsReport
```

### 4.10 Store

`/Store/Dashboard` `/Store/BuyKits` `/Store/ProcessOrder` `/Store/ProcessOrder/DeliverProducts` `/Store/ManageProducts` `/Store/ManageStoreProductVendor` `/StoreVendor` `/ng/ecommerce/child-order-creation` `/ng/ecommerce/list-orders`

### 4.11 Other

`/Questionnaires` `/React/Dashboard` `/SchoolDailyReport/Report` `/ManageCorporates` `/Reports/Reports` + every path in `06-reports-catalog.md`

---

## 5. Feature specs (behavior to clone)

### 5.1 Students

Create `/Admin/Admission`, edit `/Admin/Admission/Edit/{id}`.

Header fields: name*, dob*, gender*, year*, class*, enrollment date/no, roll, house, lunch_from_school, photo, aadhaar, jan_aadhaar, scholar_no, sssm_id, religion, category, caste, blood_group, disability[], is_rte, nationality, admitted_class, annual_income, is_only_child, pen, apaar_id, grn, saral_id.

Tabs: Parent · Fees · Installmentwise Fee Summary · Day Care · Transport · Immunization.

List `/Admin/ManageBranch/Users`: active/inactive, siblings, RFID, defaulter, remark, deactivate child/parent login, reset parent password, download docs, fee details.

Admission Information wizard `/AdmissionForm/Create/{id}`: form number, enquiry, addresses, previous school/UDISE, documents.

### 5.2 Fees pipeline

1. FeeType (refundable, CGST/SGST/IGST)
2. DiscountType, FeeInstallment name
3. FeeTemplate (year, student type, optional fees, monthly flag) + lines: installment × heads × amount × discount × tax × due date
4. Apply template to class
5. Student ledger: totals + installment rows
6. Collect: Pay Now / Partial / Amount, include late fee
7. Refund, reverse, cheque bounce, deposit slip, bulk upload, bulk pay
8. Reminder per class or all classes
9. Late fee rules: type, period, amount or %, date range

Math: `total = sub_amount - discount + late_fee`; unpaid = total - paid.

Payment methods: Cash, Cheque, Online, Direct to Bank, Card, Debit/Credit, NEFT, Loan Grayquest, Credit Note, Bank Transfer, UPI, QR Scan, Wallet, ECS.

Cheque status: Paid, Bounce, ChequeSubmitted.

### 5.3 Notice Board

Channel membership → post → receipts. School types News/Alert. Class adds homework types. Export readers / non-readers. Year scoped.

### 5.4 Messages

Private tickets Open/Closed, categories aligned to staff modules, schedule + SMS.

### 5.5 Attendance

Person × date × status (present/absent/leave/holiday/not-taken). Separate books for students, teachers, staff. RFID modes. Dashboard is charts on the same facts.

### 5.6 Year-end

Change class (mid-year move). Promote (next year). Alumni (exit). Change house. Roll number sort+assign. Eligibility = DOB window per class+year.

### 5.7 Transport

Vehicle (reg, capacity, tracker, CCTV, compliance date pairs, driver, caretaker, fuel log, docs). Route (times, speed, bus, ordered stops + map). Student in/out route+stop. GPS reports: playback, speed, distance, fuel.

### 5.8 Exams

Template (HTML, cover page, terms, co-scholastic) assigned to class. Marks entry on `/StudentPerformance`. Leave-type mark percentage.

### 5.9 Store / library / payroll / questionnaires

Present in routes and report hub even if sidebar is thin. Model products/orders, book accession+issue, payslip/TDS/PF/ESI, quizzes with assign-class + submissions.

---

## 6. Suggested API surface (your ERP)

REST under `/api/v1`. All authenticated; scope by membership.

```
POST /auth/login
POST /auth/otp
GET  /auth/memberships
POST /auth/switch

GET/POST /orgs /branches /academic-years
GET/POST /classes /subjects /houses /staff /drivers /students
GET/POST /students/{id}/guardians
GET/POST /students/{id}/fees /payments
GET/POST /channels /channels/{id}/notices
GET/POST /messages
GET/POST /attendance?date=&class=
GET/POST /events
GET/POST /transport/vehicles /routes
GET  /reports/{key}?filters
```

Use your own IDs (UUID). Do not reuse vendor snowflakes.

---

## 7. Build order

1. Auth + membership + year + class
2. Student + guardian
3. Notice channels + messages
4. Fee types → template → ledger → pay
5. Attendance
6. Reports runner
7. Transport, admissions, exams
8. Store, library, payroll

---

## 8. Known gaps (not fully exercised)

- Attendance day-grid save UI
- Attendance dashboard (Angular spinner)
- Live GPS map internals
- Every `/Reports/*` Show/Excel (same engine; live files not downloaded)
- Store checkout / vendor portal depth
- Library issue desk
- Org Admin corporates + multi-branch dashboard
- Birthday page 500 on this tenant
- Approval queue for notices (Org Admin)

---

## 9. File index

| File | Use |
| --- | --- |
| 01 overview | tenancy / IA |
| 02 auth | login / variants |
| 03–04 modules | branch vs org |
| 05 routes | URL list |
| 06 reports catalog | hub links |
| 07 domain model | entities |
| 08 + 12 student/fees fields | student schema |
| 09 masters | staff/class/fee/bus fields |
| 10 checklist | backlog |
| 11 My Branch | every hub link |
| 13 messages | inbox filters |
| 14 ops pages | contacts/fees/attendance |
| 15 reports analysis | fee report builder |
| 16 notice board | channels + types |
