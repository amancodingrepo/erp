# Masters, staff, fees config, transport, store, questionnaires

Read-only crawl of remaining Branch Admin routes. **No Save / Submit / Delete / Post / Send / Deactivate was used.** Field labels only.

Student fields live in [08-student-data-fields.md](08-student-data-fields.md).

---

## Staff — `/Admin/Staff`

List: Active | Inactive, filter, **Add New**, **Download Contact Details**.

Row actions: Edit, Reset Password, Deactivate User Id, Assign Classes, ID Card, ID Card In Jpeg Format.

### Add Staff — `/Admin/Staff/Add`

Required: Name*, Designation*, Password*, Phone*.

| Field | Notes |
| --- | --- |
| First / Middle / Last Name | |
| Designation | free text |
| Login Method | Phone / Email |
| Email | |
| Password | create only |
| Phone / Alternate Phone | E.164 + country |
| Date of Birth | |
| Joining Date | |
| Anniversary Date | |
| Blood Group | |
| Address | Street, City, State, Zip, Country |
| Employee Code | |
| Gender | |
| Religion / Nationality / Caste / Category | |
| Voter Id | |
| Marital Status | default Unmarried |
| Staff Bank Name / School Bank Name | selects |
| Establishment with Employee EPF Number | |
| Bank Account Number / IFSC Code | |
| Pf Number / ESI Number | |
| Staff Category | FK to `/Admin/StaffCategory` |
| Biometric Id | + generate |
| Aadhar Number / PAN Number | |
| Father Name / Husband/Wife Name | |
| Role | select |
| Office Timings From / To | `hh:mm tt` |
| Experience | |
| Role Categories | checkboxes: Fees, Transport, Uniforms, Library, Academics, Others |
| Photo | |

Same pattern for drivers at `/Admin/Driver` + `/Admin/Driver/Add` (Add Bus Driver). Driver form is a subset: no anniversary, blood group, marital, EPF establishment, role categories, office timings. Has Husband Name instead of Husband/Wife.

Staff Category master: `/Admin/StaffCategory` (name list CRUD).

---

## Classes — `/Admin/Grade`

Actions: Create Class, Add Result Date, Edit, Assign Teachers, Assign teachers to subjects, Assign performance report template.

Per-class routes:

- `/Admin/Grade/Create`
- `/Admin/Grade/Edit/{id}`
- `/Admin/Grade/Order`
- `/Admin/Grade/AddResultDate`
- `/Admin/Grade/GradeTeachers/{id}`
- `/Admin/Grade/Map/{id}` (subject–teacher map)
- `/Admin/Grade/ApplyReportTemplate/{id}`
- `/Admin/Grade/ResultDates/{id}`
- `/Admin/Grade/SchoolOpeningDates/{id}`
- `/Admin/Grade/StudentProfiles/{id}`

### Create Class — `/Admin/Grade/Create`

| Field |
| --- |
| Name |
| Section |
| Display Name |
| Available From / Available To |
| Enable Virtual Classroom |
| Send Absent SMS |
| All Subjects | multi-select of subject master (includes sub-subjects like English - Listening Skills) |

Also: Include Hidden Grades toggle on the list.

---

## Subjects

| Screen | Route | Fields / actions |
| --- | --- | --- |
| Manage Subjects | `/Admin/Subject` | Create New Subject, Add Sub-Subject, Edit |
| Add Subject | `/Admin/Subject/Create` | Name; flags `IsSubSubject`, `MainSubjectId` |
| Subject Categories | `/Admin/SubjectCategory` | name CRUD |
| Subject Types | `/Admin/SubjectType` | name CRUD |

---

## Academic year — `/Admin/AcademicYear`

Create: `/Admin/AcademicYear/Create`

| Field | Name |
| --- | --- |
| Label | `Label` |
| From Date / To Date | `FromDate`, `ToDate` |
| Fee Receipt Prefix | `ReceiptPrefix` |
| Invoice Prefix | `InvoicePrefix` |
| Admission Form Number Prefix | `AdmissionFormNumberPrefix` |
| First Admission Form Number | `FirstAdmissionFormNumber` |

---

## Houses — `/Admin/House`

Add: `/Admin/House/Add` — House Name, House Color, House Description.

Change House (bulk reassign): `/Admin/HouseChange`.

---

## Fee configuration

### Fee type — `/Admin/FeeType/Create`

Name, Is Refundable, CGST / SGST / IGST Applicable, visibility flag.

### Discount type — `/Admin/DiscountType/Create`

Name only.

### Installment type — `/Admin/FeeInstallment/Create`

Name only (e.g. April, Term 1). Used as rows in templates.

### Fee template — `/Admin/FeeTemplate`

Filters: Academic Year, Student Type.

Actions: Create, Apply (to classes), Copy, Edit, Delete, Export, View.

Create header: Fee Template Name, Academic Year, Student Type (All Students, …), Has Optional Fees, Is Monthly Template.

Template lines (view):

| Column |
| --- |
| Installment |
| Fee Type (one or many heads) |
| Amount |
| Discount |
| Applied Taxes |
| Notes |
| Due Date |

### Late fee — `/LateFeeConfiguration`

Fee Type, Period, Charge Type, Amount, Percentage, From Date, To Date.

### Other fee ops (list screens; do not post)

- Bulk upload `/Admin/FeesUpload`
- Deposit slips `/Admin/DepositSlips`
- Reverse payment `/ReversePayment`
- Bulk payment `/Fees/BulkFeePayment`
- Photo bulk upload `/Admin/BulkStudentAndParentPhotoUpload`

---

## Other admin masters

| Screen | Route | Function |
| --- | --- | --- |
| Birthdays | `/Admin/Birthday` | upcoming/past student & staff DOB |
| Leave marks % | `/Admin/LeavesMarksPercent` | how leave cuts exam marks |
| Class eligibility | `/Admin/GradeEligibility` | DOB window per grade |
| Roll numbers | `/RollNumber` | allocate / update |
| Promote / change class / alumni | `/Admin/GradePromotion?procedure=Change\|Promote\|Alumni` | bulk student movement |
| One-way communication | `/Admin/BranchMessages/DisableRoleCommunication` | block parent→role chat |
| External links | `/Admin/ManageLinks` | Add / Edit / Delete URL |
| Attendance mode types | `/Admin/AttendanceModeType` | manual / RFID / etc. |
| Principals | `/Admin/ManagePrincipals` | Assign Principal + signature |
| Book centers | `/Library/LibraryCenter` | library locations |
| Performance templates | `/PerformanceReports/Template` | report-card structure |

---

## Questionnaires — `/Questionnaires`

List columns: Title, Type (Quiz), Valid From, Valid Till, Total Marks.

Actions: Add Questionnaires, Add Questionnaire From PDF, Edit, View, Assign Classes, Submissions.

Build as: questionnaire → questions/marks → validity window → assign classes → collect submissions.

---

## Transport

### Buses — `/Transport/Buses` + `/Transport/buses/add`

Settings: Vehicle Name, Registration Number, Vehicle Type, Seat Capacity, Speed Limit, Tracker Device Id.

Flags: School Own Vehicle, CCTV, Bus Branding.

Identity: Engine Number, Model Name And Number, Make Year, Chassis / VIN.

Compliance date pairs (start/end): Insurance, Permit, Tax, School Permit, Fitness Certificate, Emission, Fire Extinguisher, First Aid Box.

Also: Vehicle Next Inspection Date, Fuel Type (e.g. Diesel), Select Driver, Select Caretaker, Odometer Reading.

Sections: Fuel Expenses (+ Add New Entry), Documents (Upload Files). **Do not click Save.**

### Routes — `/Transport/Routes` + `/Transport/Routes/Create`

List actions: Enable Tracking for Weekly Off Days, Bulk Upload Stops, Bulk Upload Routes, Add New Route, Create Optimized Route/s.

Create Route fields: Name, Vehicle License Number, Start Time, End Time, Average Speed (km/h), School Bus, Bus Stops (Start Address + Add Stop) + map.

### Staff / slabs

- `/Transport/Staff` — transport staff assignment
- `/Transport/Slabs/Overview` + `/Summary` — distance/area fee slabs

---

## Store — `/Store/ManageProducts`

Actions: ADD BUNDLE, ADD PRODUCT.

Related: `/Store/BuyKits`, `/ng/ecommerce/child-order-creation`, `/ng/ecommerce/list-orders`, `/Store/ProcessOrder/DeliverProducts`, `/Store/ManageStoreProductVendor`, `/StoreVendor`.

Minimum product fields to implement: name, sku, price, type (product|bundle|uniform|kit), vendor, stock, class applicability.

---

## Logged-in user profile — `/user/Profile`

Not the student record. Fields: Name, Login Method, Email, DOB, Phone*, Alternate Phone, Address, Role Categories (Fees, Transport, Uniforms, Library, Academics, Others).

Password change is `/user/Password`.

---

## Class create subject checklist (this school)

The create-class page lists the live subject master. Treat these as **data**, not product code: Accountancy (+ Project), App Maths, Art & Craft, Artificial Intelligence, Banking, Biology (+ Practical), Business Studies, Chemistry, Computer, Drawing, Economics, English (+ Listening/Reading/Writing/Project), Fine Art-painting, GK, Hindi, History, Informatics Practices, IT(402), Life Skill, Mathematics, Personality Development (many traits), Physical Education, Physics, Political Science, Sanskrit, Science, Social Science, Social Studies.
