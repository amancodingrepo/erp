# Branch Admin modules

Functionality as seen in the live UI. Actions that would mutate data were not used.

## 1. Notice Board — `/NoticeBoard`

Primary parent-communication wall.

### Left column

- Academic year dropdown
- Typeahead filter
- **School Notice Board** (collapsible)
  - All Teachers
  - Current branch (whole-school channel)
  - Day Care channel
- **Class Notice Boards** (expandable) — one channel per class/section
- **Route Notice Boards** (expandable) — one channel per bus route

### Composer (school/class channel)

- Rich text area (“Enter your text here”)
- Attachment button
- “Enable Reply” checkbox
- Type dropdown (default **News**)
- **Post**
- Hint: hashtags allowed in messages

### Feed

- Tabs: **News** | **Alert** (class boards also expose `type=Homework` in URLs)
- Filter + search
- Card per post:
  - Author + source channel
  - Timestamp
  - Body + image
  - View count
  - Export Views
  - Export Not Viewed
  - Delete

### Query pattern

```
/NoticeBoard?schoolBranchId={id}&channelId={id}&academicYearId={id}
/NoticeBoard?schoolBranchId={id}&channelId={id}&type=News|Alert|Homework&academicYearId={id}
/NoticeBoard/ExportViewsToExcel?channelMessageId={id}
/NoticeBoard/ExportNotViewedToExcel?channelMessageId={id}
```

### ERP takeaway

Build a single `Channel` + `ChannelMessage` engine. Audiences are school, class, route, staff-group, daycare. Track per-recipient read state for compliance and reminder workflows.

---

## 2. Events — `/events/Monthly`

School calendar.

- Month grid (Sun–Sat)
- `<< Prev` / Today / `Next >>`
- View toggle: **Month** | **Day**
- Also exists: `/events` style listing implied by reports (`Event Report`, `Event Count Report`)

### ERP takeaway

Events are first-class, year-scoped, optionally attached to a class or whole school, and should fan out to the parent app + notice board.

---

## 3. Messages — `/messages`

Private inbox between staff and parents.

- Composer: **Post Quick Message**
- Toolbar: attach file, calendar/event chip, recipient/people picker
- **Post**
- Tabs: **Inbox** | **Sent**
- Filter / search
- **More** menu
- Thread row: sender (parent name + student + class), snippet, relative time, Delete, “view more”

### ERP takeaway

Do not mix this with notice-board broadcasts. This is ticket-like 1:n family messaging with staff assignment, escalation (there is a Message Escalation Report), and analytics.

---

## 4. My Branch — `/Admin/ManageBranch`

Admin control panel. Three columns.

### Users

| Screen | Route | Purpose |
| --- | --- | --- |
| Manage Parents and Children | `/Admin/ManageBranch/Users` | Directory of families; reset password |
| Admit New Student | `/Admin/Admission` | On-roll a student |
| Birthdays | `/Admin/Birthday` | Upcoming / past student & staff birthdays |
| Manage Staff | `/Admin/Staff` | Staff CRUD |
| Manage Bus Drivers | `/Admin/Driver` | Driver CRUD |
| Manage Staff Category | `/Admin/StaffCategory` | Staff types (PGT, TGT, admin, …) |

### Academics

| Screen | Route | Purpose |
| --- | --- | --- |
| Manage Classes | `/Admin/Grade` | Class + section |
| Manage Subject Categories | `/Admin/SubjectCategory` | Grouping of subjects |
| Manage Subject Types | `/Admin/SubjectType` | Compulsory / optional / etc. |
| Manage Subjects | `/Admin/Subject` | Subject master |
| Manage Marks Percentage for Leave Type | `/Admin/LeavesMarksPercent` | How leave affects exam marks |
| Manage Academic Year | `/Admin/AcademicYear` | Current + next year |
| Change Class | `/Admin/GradePromotion?procedure=Change` | Mid-year section/class move |
| Promote Class | `/Admin/GradePromotion?procedure=Promote` | Year-end promotion |
| Promote to Alumni | `/Admin/GradePromotion?procedure=Alumni` | Exit / disable student |
| Manage Performance Report Templates | `/PerformanceReports/Template` | Report-card template, terms, subterms, subsets |
| Manage House | `/Admin/House` | House master |
| Change House | `/Admin/HouseChange` | Reassign student house |
| Manage Class Eligibility Criteria | `/Admin/GradeEligibility` | Age / DOB windows per grade |
| Update Roll Numbers | `/RollNumber` | Allocate or edit roll nos. |

### Administrative

| Screen | Route | Purpose |
| --- | --- | --- |
| Messages | `/Admin/BranchMessages` | Staff message admin |
| One Way Communication | `/Admin/BranchMessages/DisableRoleCommunication` | Block parent chat to selected roles |
| Manage Routes | `/Transport/Dashboard` | Jump into transport |
| Manage Fees Types | `/Admin/FeeType` | Fee heads |
| Manage Discount Types | `/Admin/DiscountType` | Concession kinds |
| Manage Fees Templates | `/Admin/FeeTemplate` | Default fee plan; apply to classes |
| Manage External Links | `/Admin/ManageLinks` | School-specific URLs |
| Bulk Fees Upload | `/Admin/FeesUpload` | Spreadsheet fee import |
| Upload student and parent photos in bulk | `/Admin/BulkStudentAndParentPhotoUpload` | Bulk photo import |
| Manage Attendance Mode Types | `/Admin/AttendanceModeType` | Manual / RFID / biometric modes |
| Manage Principal Details | `/Admin/ManagePrincipals` | Principal per grade + signature |
| Manage Fee Installment Types | `/Admin/FeeInstallment` | Installment calendar types |
| Manage Book Centers | `/Library/LibraryCenter` | Library locations |

---

## 5. Contacts — `/Contacts`

People directory for the branch.

### Left rail

- Academic year
- Broadcast List
- Admin & All Teachers (default)
- All Contacts
- All Classes + per-class list with class filter

### Main list

- Gender filter
- Multi-select checkboxes
- **Create New Broadcast List**
- **Export** dropdown
- Card per person: photo, name, designation, email, phones, last-seen
- Actions: Edit, deactivate-style control, **Fee Details**

### ERP takeaway

Contacts is not a separate database — it is a projection of Staff + Parents + Students with messaging and fee shortcuts. Broadcast lists are saved audiences.

---

## 6. Fees — `/Fees`

Student fee ledger for a class.

### Filters / actions

- Academic Year
- Class
- **Send Fee Reminder to All Classes**
- **Fee Reminder** (current class)
- Search
- **Select** menu
  - Configure Late Fee Charges → `/LateFeeConfiguration`
  - Deposit Slips → `/Admin/DepositSlips`
  - Reverse Payment → `/ReversePayment`
  - Bulk Fee Payment → `/Fees/BulkFeePayment`
  - Cheque Submitted Report → `/ChequeSubmitted`
- **Reports** menu
  - Fee Reports → `/Reports/FeeReport`
  - Fees Due Report → `/FeesDueReport`
  - Fees Concession Report → `/Fees/FeesConcessionReport`
  - Fees Payable Report → `/Reports/FeesPayableReport`
  - Paid Fee & Admission Fee Report → `/Reports/AdmissionFeeReport`

### Grid

- Student Name (class)
- Total Fees
- Paid Fees
- Next Payment Date
- Pay / Edit

Expandable installment rows include: Installment / Month, Amount, Discount/Fee Waive.

### ERP takeaway

Minimum viable fee engine:

1. FeeType (head)
2. FeeTemplate (bundle of heads + amounts) applied to a class + year
3. StudentFeeAccount generated from template + concessions
4. Installments with due dates
5. Payments (cash / online / cheque) with reverse + refund + bounce
6. Late-fee rules
7. Reminders (push / SMS / notice)

---

## 7. Attendance — `/attendance`

Calendar mark-up.

- Academic Year
- Tabs: **Class Attendance** | **Teacher Attendance** | **Staff Attendance**
- Month / Day calendar
- Multi-select class chips including “All Classes”
- Prev / Today / Next

Related reports cover period-wise attendance, RFID swipe, daily class, present-student, attendance log.

### ERP takeaway

Status set observed on the dashboard: Present, Absent, Late, Half Day, Leave, Not Taken. Store one record per person per date (and optionally per period). “Not Taken” is a first-class state, not a missing row.

---

## 8. Attendance Dashboard — `/ng/orgadmin-dash/organization`

Angular SPA. After load it rewrites to:

```
/ng/orgadmin-dash/schoolbranch/{branchId}/{branchName}/{yyyy-MM-dd}
```

Widgets:

- Present / Absent / Late / Not Taken / Total Count
- Date picker
- **Detailed View**
- Pie chart (same statuses + Leave)
- Section **Attendance - Grade** (class-wise breakdown below the fold)

### ERP takeaway

This is the exec view of the same attendance fact table. Build it as a read model, not a second writer.

---

## 9. Day Care — `/daycare`

Empty state at this branch: “You do not have any students enrolled in day care. Enroll students.”

Still a dedicated module + report (`/Reports/DayCareReport`). Treat daycare as a program overlay on students (check-in, activities, meals) rather than a separate SIS.

---

## 10. Search Users — `/SearchUsers`

Global people finder.

Fields:

- Email (full or partial)
- Phone (country code + number)
- First / Middle / Last name
- Scholar Number / Enrollment Number
- Exact Search checkbox

Buttons:

- Search
- Search and Navigate to Fees

### ERP takeaway

One search endpoint that returns user + role + branch + student fee deep-link. Enrollment number is a unique business key.

---

## 11. Performance Report — `/StudentPerformance`

Report cards / exams.

- Academic Year + Class
- **Update Co-scholastic Details** (bulk)
- Reports dropdown
- Empty state when no template assigned: “Performance report template is not assigned to selected class.”

Templates live at `/PerformanceReports/Template` (terms, subterms, subsets).

### ERP takeaway

Template-driven mark entry: Template → assigned to class+year → assessments → marks + co-scholastic → publish to parent.

---

## 12. Reports — `/Reports/Reports`

Hub of 80+ operational reports. See [06-reports-catalog.md](06-reports-catalog.md).

Filter box at top right: “Start typing to filter list…”

---

## 13. Admission / Enquiry Form — `/AdmissionForm`

Public form builder + intake manager.

- Academic Year
- Include Hidden Admission Forms
- **EDIT FORM TEMPLATE** → `/AdmissionForm/Builder`
- **ADD NEW** → `/AdmissionForm/Create`
- Related:
  - `/AdmissionForm?Enquiry=True`
  - `/AdmissionForm/DownloadEmptyEnquiryForm`
  - `/AdmissionForm/DownloadEmptyAdmissionForm`
  - `/AdmissionForm/OrgPage`
  - `/Admin/AdmissionFormTermConditions`

### ERP takeaway

Two form types (Enquiry vs Admission), versioned templates, open/close by academic year, PDF blank forms, conversion Enquiry → Admission → Enrolled Student.

---

## 14. Transport — `/Transport/Dashboard`

Almost a separate product. Chrome changes to a transport shell.

Top mode: **Transport stats** | **Live bus tracking**

KPI cards: Blackouts, Before/On Time Routes, Route Alerts, Total Kms, Kids Assigned, Spare Vehicles, Capacity Utilization.

Tables: Buses Overview, Routes Overview, compliance (RC, tax, permit, insurance, fitness), hardware (CCTV, GPS, fire extinguisher, first aid).

Sub-areas:

| Area | Route |
| --- | --- |
| Dashboard | `/Transport/Dashboard` |
| Buses | `/Transport/Buses` |
| Staff | `/Transport/Staff` |
| Routes | `/Transport/Routes` |
| Fee slabs overview | `/Transport/Slabs/Overview` |
| Slab summary | `/Transport/Slabs/Summary` |

See transport reports in the reports catalog.

---

## 15. Questionnaires — `/Questionnaires`

Survey / feedback module (forms sent to parents or staff). Keep as a lightweight form-response engine distinct from Admission forms.

---

## 16. Manage Store — `/Store/Dashboard`

School store / uniform / kit shop.

| Action | Route | Purpose |
| --- | --- | --- |
| Create Order | `/ng/ecommerce/child-order-creation` | Manual order for a child |
| All Orders | `/ng/ecommerce/list-orders` | Order list |
| Buy Student Kits | `/Store/BuyKits` | Kit bundles |
| Mark Products as Delivered | `/Store/ProcessOrder/DeliverProducts` | Fulfillment |
| Manage Product | `/Store/ManageProducts` | Product master |
| Manage Store Product Vendor | `/Store/ManageStoreProductVendor` | Product–vendor map |

---

## 17. Store Vendor — `/StoreVendor`

Vendor master used by the store (also visible to Org Admin).
