# My Branch — every link

Hub: `/Admin/ManageBranch`  
Opened **read-only**. No Save / Promote / Alumni / Upload / Deactivate.

Honest status: the hub was catalogued earlier. This pass opened the remaining screens that had only been listed.

---

## Users column

| Link | Route | What it actually does |
| --- | --- | --- |
| Manage Parents and Children | `/Admin/ManageBranch/Users` | Student/parent directory by class + year. Active/Inactive. Edit profile, add sibling, reset parent password, defaulter flag, download docs, deactivate child/parent login, map RFID, map siblings, fee details, user remark. |
| Admit New Student | `/Admin/Admission` | Full create-student form (see `08-student-data-fields.md`). Tabs: Parent, Fees, Day Care, Transport, Immunization. Buttons: Save, Save & Go to Admission Form. Not submitted. |
| Birthdays | `/Admin/Birthday` | Intended: upcoming/past student and staff birthdays. **This GET returned a 500 Internal Server Error** on the live tenant when opened. |
| Manage Staff | `/Admin/Staff` | Staff list + Add `/Admin/Staff/Add`. Edit, reset password, deactivate user, assign classes, ID card PDF/JPEG. Full HR field set in `09`. |
| Manage Bus Drivers | `/Admin/Driver` | Same pattern as staff, slimmer form (`/Admin/Driver/Add`). |
| Manage Staff Category | `/Admin/StaffCategory` | Named categories used on the staff form. This branch had **no rows**. Action: Add Staff Category Details. |

---

## Academics column

| Link | Route | What it actually does |
| --- | --- | --- |
| Manage Classes | `/Admin/Grade` | Class/section master. Create Class, order classes, add result date, assign teachers, map subjects↔teachers, apply report-card template, school opening dates, student profiles for a class. Create fields: Name, Section, Display Name, Available From/To, Enable Virtual Classroom, Send Absent SMS, subject multi-select. |
| Manage Subject Categories | `/Admin/SubjectCategory` | Skill buckets used as sub-subject groups. This school: Listening / Reading / Speaking / Writing Skills. Action: Add Subject Category. |
| Manage Subject Types | `/Admin/SubjectType` | Assessment component types (Activity, Project, Practical, Behaviour traits, ASL, etc.). Add / Edit / Delete. |
| Manage Subjects | `/Admin/Subject` | Subject master + sub-subjects (`IsSubSubject`, `MainSubjectId`). Create New Subject, Add Sub-Subject, Edit. |
| Manage Marks Percentage for Leave Type | `/Admin/LeavesMarksPercent` | Table: Leave Type, Percentage. Empty here. Add Marks Percentage for Leave Type. Used so a student on leave still gets X% of exam marks. |
| Manage Academic Year | `/Admin/AcademicYear` | Label, From/To dates, fee receipt prefix, invoice prefix, admission form number prefix + first number. Create / Edit. Marks current vs next year. |
| Change Class | `/Admin/GradePromotion?procedure=Change` | Pick a class → `/Admin/GradePromotion/ChangeGrade/{gradeId}`. Fields: Academic Year, Change Class To, checkboxes All Students or named students. **Save not clicked.** Mid-year section/class move. |
| Promote Class | `/Admin/GradePromotion?procedure=Promote` | Same class list with **Promote** per row. Year-end promotion into the next grade. Promote button not clicked. |
| Promote to Alumni | `/Admin/GradePromotion?procedure=Alumni` | Same class list with **Alumni** per row. Marks students inactive / alumni. Not clicked. |
| Manage Performance Report Templates | `/PerformanceReports/Template` | Report-card templates. Columns: Name, Html View, Show Cover Page. Actions: Add template, Copy, Details, Make Default, Add Terms, Add Co-Scholastic Details, Edit, Delete. |
| Manage House | `/Admin/House` | House Name, Color, Description. Add / Edit / Delete. |
| Change House | `/Admin/HouseChange` | Class list → Change House (same UX as Change Class: pick students + target house). Not submitted. |
| Manage Class Eligibility Criteria | `/Admin/GradeEligibility` | Age gate for admission. Columns: Academic Year, Class, From Birth Date, To Birth Date. Empty here. Add Class Eligibility Criteria. |
| Update Roll Numbers | `/RollNumber` | Filters: Academic Year, Class, Sort By, Then Sort By. Regenerates / edits roll numbers for the selected class. Not saved. |

---

## Administrative column

| Link | Route | What it actually does |
| --- | --- | --- |
| Messages | `/Admin/BranchMessages` | Staff-side messaging. Branch Contacts picker + Inbox / Sent. Same engine as `/messages`, filtered to staff directory. |
| One Way Communication | `/Admin/BranchMessages/DisableRoleCommunication` | Title: “One way communication for parent”. Checkboxes: **Parent can't send messages to** these roles. Roles on this tenant: OrgAdmin, BranchAdmin, Teacher, User, Driver, CareTaker, SubAdmin, Coordinator, TechSupport, ReadOnlyUser, FeesSubAdmin, AdmissionSubAdmin, ExaminationSubAdmin, TransportSubAdmin, LibrarySubAdmin, StoreVendor, HRMSubAdmin, AuthorizedPerson, Staff, BusVendor, HOAdmin, Principal, OrgFinanceAdmin. Save not clicked. |
| Manage Routes | `/Transport/Dashboard` | Jumps into the transport app (buses, routes, live GPS, slabs). |
| Manage Fees Types | `/Admin/FeeType` | Fee heads. Create: Name, Is Refundable, CGST/SGST/IGST flags. |
| Manage Discount Types | `/Admin/DiscountType` | Named concession kinds. Create: Name. |
| Manage Fees Templates | `/Admin/FeeTemplate` | Named plan for a year + student type. Lines: Installment, Fee Type(s), Amount, Discount, Taxes, Notes, Due Date. Actions: Create, Apply to classes, Copy, Edit, Delete, Export, View. |
| Manage External Links | `/Admin/ManageLinks` | School URL list. Add / Edit / Delete. |
| Bulk Fees Upload | `/Admin/FeesUpload` | Upload Student Fees. Filters: Academic Year, Grades (multi). Spreadsheet import onto ledgers. File not uploaded. |
| Upload student and parent photos in bulk | `/Admin/BulkStudentAndParentPhotoUpload` | Modes: Table Upload / ZIP Upload. Lookup by Scholar Number, Enrollment Number, or Child ID. Rows: Scholar Number + Student / Mother / Father photo (.jpg/.jpeg/.png). Save Photos not clicked. |
| Manage Attendance Mode Types | `/Admin/AttendanceModeType` | How attendance is captured (manual, RFID, …). Add Attendance Mode Type. |
| Manage Principal Details | `/Admin/ManagePrincipals` | Assign Principal to grades + signature image. Action: Assign Principal. |
| Manage Fee Installment Types | `/Admin/FeeInstallment` | Named installment buckets (April, Term 1, …) used in templates. Create: Name. |
| Manage Book Centers | `/Library/LibraryCenter` | Library locations. Columns: Center Name, Date of Creation, Date of Deletion, Status. Empty here. Also links to `/Library/Library` and `/Library/Library/ManageLibraryMaster` (full library module exists beyond this hub). |

---

## Shared UX on these screens

- Typeahead “Start typing to filter list…”
- Add + Edit + Delete on simple masters
- Class-picker first, then a student multi-select, for Change Class / Promote / Alumni / Change House
- Academic year dropdown wherever data is year-scoped

## Roles to model (from One Way Communication)

`OrgAdmin`, `BranchAdmin`, `Teacher`, `User`, `Driver`, `CareTaker`, `SubAdmin`, `Coordinator`, `TechSupport`, `ReadOnlyUser`, `FeesSubAdmin`, `AdmissionSubAdmin`, `ExaminationSubAdmin`, `TransportSubAdmin`, `LibrarySubAdmin`, `StoreVendor`, `HRMSubAdmin`, `AuthorizedPerson`, `Staff`, `BusVendor`, `HOAdmin`, `Principal`, `OrgFinanceAdmin`.

## Not clicked (would write data)

Save on Change Class, Promote, Alumni, Change House, One Way Communication, Fees Upload, Photo Save, any Add/Create submit.
