# Graph Report - erp  (2026-10-11)

## Corpus Check
- 194 files · ~139,136 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .csv 4, (none) 2, .prisma 2)

## Summary
- 1150 nodes · 2886 edges · 63 communities (52 shown, 11 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.79)
- Token cost: 372,655 input · 0 output

## Community Hubs (Navigation)
- Core API Routes (Attendance/Auth)
- Auth & Health API
- Production Pack & API Contracts
- Reports & Settings
- Route & Sidebar Inventory
- Academics UI (Classes/Depts)
- Staff Shell & Navigation
- School Diary Fee Engine Spec
- Acceptance Tests & Rules
- Fees Class Desk & Masters
- Rebuild Blueprint & MVPs
- Auth/Exams/Fees Pages
- Backend Contract & Status Machines
- Master Form Catalog
- Package Manifest
- Seed & Password Reset
- Attendance Module Spec
- TypeScript Config
- School Diary Spec Index
- Blueprint Builder Script
- App Layout & Middleware
- Dashboard/Collect/Create Pages
- NAAC & Outcome-Based Education
- Dev Dependencies
- Catalog Generator
- Catalog Workbench UI
- Messaging & Roles
- Runtime Dependencies
- Fee Collection Flow Target
- Admission Enquiry & Student Fields
- Transport, Store & Notices
- NPM Scripts
- Domain Model (Session/Class/Fee)
- Promotion, Discounts & Carry-Forward
- Admissions & Merit Process
- Org/Branch Roles & Notices
- Project Overview & Stack
- User Management Page
- Attendance, Leave & Payroll
- Report Groups
- ESLint Config
- Attendance Marking Page
- Production Plan & Year Setup
- Architecture, Tenancy & RBAC
- Exams Page
- Build Order & Modules
- Bounded Contexts & Priorities
- Roles Page
- Student Profile Page
- Exams & Seat Numbering
- Student Rules & Semester Allocation
- Crawler Script
- School Diary Vendor Inventory
- PostCSS Config
- Forgot Password Form
- Login Form
- Set Password Form
- Contacts & Broadcast
- Questionnaires
- Route Handler Stub
- Login Form Spec
- Events Module

## God Nodes (most connected - your core abstractions)
1. `fail()` - 128 edges
2. `requireApiPermission()` - 115 edges
3. `ok()` - 106 edges
4. `readJson()` - 83 edges
5. `notFound()` - 55 edges
6. `prisma` - 53 edges
7. `created()` - 45 edges
8. `zod` - 42 edges
9. `@prisma/client` - 22 edges
10. `Live Field Catalog` - 22 edges

## Surprising Connections (you probably didn't know these)
- `FeeTemplate` --semantically_similar_to--> `Fees Master`  [INFERRED] [semantically similar]
  school-diary-erp-spec/school-diary-erp-spec/00-FULL-APPLICATION-SPEC.md → erp-spec/15-sidebar-inventory.md
- `Apply Template to Class` --semantically_similar_to--> `Assign Fee Master`  [INFERRED] [semantically similar]
  school-diary-erp-spec/school-diary-erp-spec/00-FULL-APPLICATION-SPEC.md → erp-spec/15-sidebar-inventory.md
- `Channels (notice engine)` --semantically_similar_to--> `Notices API`  [INFERRED] [semantically similar]
  school-diary-erp-spec/school-diary-erp-spec/01-overview.md → erp-spec/production/api-contracts.md
- `Late Fee Configuration` --semantically_similar_to--> `Fine Rule Form`  [INFERRED] [semantically similar]
  school-diary-erp-spec/school-diary-erp-spec/00-FULL-APPLICATION-SPEC.md → erp-spec/production/field-catalog-live.md
- `Memberships/Role Variants` --semantically_similar_to--> `Permission Catalog (module.feature.action)`  [INFERRED] [semantically similar]
  school-diary-erp-spec/school-diary-erp-spec/00-FULL-APPLICATION-SPEC.md → erp-spec/production/permissions.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Admission -> enrollment -> class/section allocation -> attendance -> fee collection flow** — erp_spec_05_admissions_state_machine, erp_spec_06_students_semester_allocation, erp_spec_06_students_roll_number_generator, erp_spec_08_attendance_leave_student_attendance, erp_spec_07_fees_collect_fees [INFERRED 0.75]
- **Fee configuration chain: Type -> Group -> Master -> Assign to class -> Invoice -> Collect -> Ledger** — erp_spec_07_fees_fee_type, erp_spec_07_fees_fee_group, erp_spec_07_fees_fee_master, erp_spec_07_fees_assign_fee_master, erp_spec_07_fees_student_invoice, erp_spec_07_fees_collect_fees, erp_spec_07_fees_student_ledger [EXTRACTED 1.00]
- **Fee adjustments applied at collect time: discount, scholarship, fine, installments, carry forward** — erp_spec_07_fees_fee_discount, erp_spec_07_fees_scholarship, erp_spec_07_fees_fine_rules, erp_spec_07_fees_installments, erp_spec_07_fees_carry_forward, erp_spec_07_fees_variable_fees [INFERRED 0.85]
- **Fee setup to collection flow (type > group > master > assign > collect > receipt)** — erp_spec_15_sidebar_inventory_fees_type, erp_spec_15_sidebar_inventory_fees_group, erp_spec_15_sidebar_inventory_fees_master, erp_spec_15_sidebar_inventory_assign_fee_master, erp_spec_15_sidebar_inventory_collect_fees, erp_spec_15_sidebar_inventory_fee_receipt_list [INFERRED 0.85]
- **Registration/admission to class allocation, attendance and fees flow** — erp_spec_15_sidebar_inventory_admission_module, erp_spec_15_sidebar_inventory_student_information_module, erp_spec_15_sidebar_inventory_semester_allocation, erp_spec_15_sidebar_inventory_attendance_module, erp_spec_15_sidebar_inventory_fees_collection_module [INFERRED 0.75]
- **Production plan task sequence (academics > students > fees > attendance > exams)** — production_implementation_plan_task_2_academics_timetable_working_days_promotion, production_implementation_plan_task_3_students_sis, production_implementation_plan_task_4_fees_production, production_implementation_plan_task_5_attendance_leave, production_implementation_plan_task_6_examinations [EXTRACTED 1.00]
- **Admission to class allocation to attendance to fee ledger flow** — school_diary_erp_spec_school_diary_erp_spec_03_branch_admin_modules_admission_enquiry_form_module, school_diary_erp_spec_school_diary_erp_spec_03_branch_admin_modules_enquiry_to_admission_to_enrolled_student_conversion, school_diary_erp_spec_school_diary_erp_spec_08_student_data_fields_student_profile_fields, school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_class_master_create_class, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_update_roll_numbers, school_diary_erp_spec_school_diary_erp_spec_07_erp_domain_model_attendance_core_entities, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_fee_template_apply_to_classes, school_diary_erp_spec_school_diary_erp_spec_12_student_edit_and_fee_ledger_student_fee_account [INFERRED 0.75]
- **Fee engine pipeline from heads to payments** — school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_fee_type_master, school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_fee_installment_type_master, school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_discount_type_master, school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_fee_template, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_fee_template_apply_to_classes, school_diary_erp_spec_school_diary_erp_spec_12_student_edit_and_fee_ledger_student_fee_account, school_diary_erp_spec_school_diary_erp_spec_12_student_edit_and_fee_ledger_student_fee_installments, school_diary_erp_spec_school_diary_erp_spec_09_masters_staff_transport_fields_late_fee_configuration, school_diary_erp_spec_school_diary_erp_spec_12_student_edit_and_fee_ledger_fee_payments, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_deposit_slips [EXTRACTED 0.95]
- **Year-end change class promote alumni lifecycle** — school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_change_class, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_promote_class, school_diary_erp_spec_school_diary_erp_spec_11_my_branch_every_link_promote_to_alumni, school_diary_erp_spec_school_diary_erp_spec_17_backend_contract_student_enrollments_history, school_diary_erp_spec_school_diary_erp_spec_17_backend_contract_alumni_closes_fee_and_attendance [INFERRED 0.85]

## Communities (63 total, 11 thin omitted)

### Community 0 - "Core API Routes (Attendance/Auth)"
Cohesion: 0.05
Nodes (151): GET(), GET(), PUT(), putSchema, bodySchema, PORTAL_ACTOR, POST(), bodySchema (+143 more)

### Community 1 - "Auth & Health API"
Cohesion: 0.05
Nodes (45): nextConfig, GET(), queryRaw, POST(), bodySchema, POST(), GET(), bodySchema (+37 more)

### Community 2 - "Production Pack & API Contracts"
Cohesion: 0.06
Nodes (53): Confidence Legend (LIVE/DERIVED/STANDARD), Prisma schema.prisma, Production Pack Status, Source of Truth Order, Attendance API, Auth API, Exams API, Fee Invoice (+45 more)

### Community 3 - "Reports & Settings"
Cohesion: 0.08
Nodes (50): Attendance Report Hub, Custom Fields, Finance Report Hub, General Setting, Modules (feature flags), Notification Setting, Payment Methods Setting, Reports Menu (+42 more)

### Community 4 - "Route & Sidebar Inventory"
Cohesion: 0.11
Nodes (38): Route Inventory (322 admin routes), Academics Module, Admin Sidebar, Admission Module, Approve Leave, Assign Fee Master, Assign Seat Number, Assign Variable Fees (+30 more)

### Community 5 - "Academics UI (Classes/Depts)"
Cohesion: 0.07
Nodes (32): AcademicsPage(), AcademicsTab, ClassesPanel(), reload(), Department, DepartmentsPanel(), Klass, loadJson() (+24 more)

### Community 6 - "Staff Shell & Navigation"
Cohesion: 0.12
Nodes (23): Me, StaffShell(), allHrefs(), NAV, NAV_ITEM_COUNT, NavGroup, NavItem, filterNav() (+15 more)

### Community 7 - "School Diary Fee Engine Spec"
Cohesion: 0.14
Nodes (30): Admission Form Wizard, Apply Template to Class, Branch Admin Sidebar, DiscountType, FeeInstallment (School Diary), FeeTemplate, FeeType (School Diary), Grade Eligibility (DOB window) (+22 more)

### Community 8 - "Acceptance Tests & Rules"
Cohesion: 0.12
Nodes (29): Academics Tests, Acceptance Test Matrix, Attendance Tests, Auth Tests, Exam Tests, Fee Cancel Contra Rule, Fee Tests, Holiday Attendance Rejection Rule (+21 more)

### Community 9 - "Fees Class Desk & Masters"
Cohesion: 0.11
Nodes (30): Fees Module Class Desk, Minimum Viable Fee Engine, My Branch Hub, Search Users, Academic Year as Required Context, Academic Year Master, Discount Type Master, Fee Installment Type Master (+22 more)

### Community 10 - "Rebuild Blueprint & MVPs"
Cohesion: 0.14
Nodes (26): API Conventions (/api/v1), Data Migration from MPOnline ERP, Immutable Receipts and Published Results, MVP-1 SIS, MVP-2 Fees, MVP-3 Attendance and Timetable, MVP-4 Exams, Org + Session Scoping (+18 more)

### Community 11 - "Auth/Exams/Fees Pages"
Cohesion: 0.21
Nodes (14): Group, Invoice, StudentRow, Permission, RoleRow, Option, Row, Button() (+6 more)

### Community 12 - "Backend Contract & Status Machines"
Cohesion: 0.13
Nodes (25): Enquiry to Admission to Enrolled Student Conversion, Route Path Conventions, Fee Line Status Machine, Student Status Machine, Change Class, Promote Class, Promote to Alumni, Fee Status Math (+17 more)

### Community 13 - "Master Form Catalog"
Cohesion: 0.23
Nodes (22): Class Form (classes), Custom Field Form, Exam Group Form, Exam Schedule Form, Fee Discount Form, Fee Due Search Form (feesearch), Fee Group Form, Fee Master Form (+14 more)

### Community 14 - "Package Manifest"
Cohesion: 0.09
Nodes (21): name, prisma, seed, private, version, class-variance-authority, clsx, eslint (+13 more)

### Community 15 - "Seed & Password Reset"
Cohesion: 0.14
Nodes (15): prisma, bodySchema, POST(), consumePasswordReset(), hashResetToken(), issuePasswordReset(), newResetToken(), randomPasswordHash() (+7 more)

### Community 16 - "Attendance Module Spec"
Cohesion: 0.13
Nodes (20): Attendance Dashboard, Attendance Dashboard as Read Model, Attendance Module, Performance Report Module, Attendance Core Entities, Attendance Day Status Machine, Class Master Create Class, Subject Master (+12 more)

### Community 17 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 18 - "School Diary Spec Index"
Cohesion: 0.28
Nodes (18): Auth and Roles, Branch Admin Modules, Org Admin Modules, Routes Catalog, Reports Catalog, ERP Domain Model and Build Order, Student Data Fields, Masters Staff Transport Fields (+10 more)

### Community 19 - "Blueprint Builder Script"
Cohesion: 0.20
Nodes (16): collections, csv, humanize(), infer_kind_method(), kebab_seg(), load_labels(), load_latest_pages(), load_usage() (+8 more)

### Community 20 - "App Layout & Middleware"
Cohesion: 0.14
Nodes (8): apps_erp_src_app_globals, body, display, metadata, config, hasSession(), middleware(), next

### Community 21 - "Dashboard/Collect/Create Pages"
Cohesion: 0.16
Nodes (9): DashboardPage(), rupees(), Stats, CollectFeesPage(), CreateStudentPage(), StudentsPage(), load(), onSearch() (+1 more)

### Community 22 - "NAAC & Outcome-Based Education"
Cohesion: 0.23
Nodes (14): Attainment (direct + indirect), CO-PO Mapping, CO-PO Outcome-Based Education, Course Outcome (CO), Feedback Management, NAAC Module, NaacAssignment, NaacCriterion (+6 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, prisma, tailwindcss, @tailwindcss/postcss, tsx (+6 more)

### Community 24 - "Catalog Generator"
Cohesion: 0.16
Nodes (12): bySource, csv, fieldsFor(), kindFor(), nav, outDir, root, screens (+4 more)

### Community 25 - "Catalog Workbench UI"
Cohesion: 0.21
Nodes (9): SpecialScreen(), GenericScreen(), load(), onSubmit(), remove(), RecordRow, synthetic(), Workbench() (+1 more)

### Community 26 - "Messaging & Roles"
Cohesion: 0.15
Nodes (14): Roles Implied by UI, Messages Module, Driver Master, Staff Master, One Way Communication Policy, Tenant Role Catalog, Advanced Message Filters, Message Categories (+6 more)

### Community 27 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, class-variance-authority, clsx, jose, lucide-react, next, next-auth (+5 more)

### Community 28 - "Fee Collection Flow Target"
Cohesion: 0.20
Nodes (12): Fee flow target: Type-Group-Master-assign class-collect-immutable receipt-cancel contra, Student 360 page, Fees Collection spec, Collect Fees (payment, receipt), Fee Group, Fee Type, Fine rules (late slabs), Immutable receipt, cancellation by contra (+4 more)

### Community 29 - "Admission Enquiry & Student Fields"
Cohesion: 0.20
Nodes (12): Admission Enquiry Form Module, Day Care Module, Admission Information Form, Government and School IDs, Parent Guardian Fields, Recommended Student Schema, Student Profile Fields, House Master (+4 more)

### Community 30 - "Transport, Store & Notices"
Cohesion: 0.21
Nodes (12): Manage Store Module, Transport Module, Notice Status Machine, Bus Vehicle Master, Transport Route Master, Transport Tab, Channel Members, Channels Tree (+4 more)

### Community 31 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, catalog, db:generate, db:push, db:seed, db:setup, dev (+3 more)

### Community 32 - "Domain Model (Session/Class/Fee)"
Cohesion: 0.27
Nodes (11): Academic Session as first-class filter, Domain model spec, AcademicSession, Class and Section, Fee entities: FeeType, FeeGroup, FeeMaster, FeeDiscount, FineRule, StudentFeeInvoice, StudentFeePayment, Scholarship, ProgramIntake (seats, reserved seats), Student (admission_no, roll_no, enrollment_no, current class/section), StudentAttendance (P/A/L/H/F) (+3 more)

### Community 33 - "Promotion, Discounts & Carry-Forward"
Cohesion: 0.20
Nodes (11): Student promotion (stdtransfer) with fee carry forward, Direct staff admission (/student/create), Student create form (fee category, fees_discount, fee session groups, transport, hostel), Fees carry forward, Fee Discount / concession groups, Scholarship, Student fee invoice lines, Variable fees (+3 more)

### Community 34 - "Admissions & Merit Process"
Cohesion: 0.22
Nodes (11): Admissions spec, Enquiry CRM (pre-admission), Merit list and cutoff generation, Online application inbox / Enroll, Admission state machine (applied-merit-selected-fee_paid-enrolled-cancelled), Optional SMS to absentees, Front office (enquiry, visitors, complaints), LMS, communication, CMS spec (+3 more)

### Community 35 - "Org/Branch Roles & Notices"
Cohesion: 0.18
Nodes (11): BranchAdmin Role, Membership Auth Model, OrgAdmin Role, Role Switching via Variant, Channel and ChannelMessage Engine, Notice Board Module, Manage Corporates, Org Admin Sidebar Modules (+3 more)

### Community 36 - "Project Overview & Stack"
Cohesion: 0.22
Nodes (10): apps/erp README (run and scripts), docker-compose postgres service, MPOnline demo ERP AJAX crawl map, MPOnline demo ERP route map, ERP Spec Index (reverse-engineered MPOnline), Portals: public site, staff admin, student/parent, applicant, College ERP README, blueprint.json canonical spec (35 modules, 335 screens, 830 operations) (+2 more)

### Community 37 - "User Management Page"
Cohesion: 0.27
Nodes (8): RoleOpt, Tab, UserRow, UsersPage(), assignRoles(), load(), onSearch(), setActive()

### Community 38 - "Attendance, Leave & Payroll"
Cohesion: 0.27
Nodes (10): Attendance: working-days API not yet enforced, leave codes, lock after N days, Generic approval workflow engine (leave, OJT), Attendance and leave spec, Attendance percent = present / (working days - exempt), Staff leave types and multi-level approval, Student attendance marking flow (class, section, date), Student leave approval, HR and payroll spec (+2 more)

### Community 39 - "Report Groups"
Cohesion: 0.24
Nodes (10): Attendance Reports Group, Fee Reports Group, Hidden Modules Inferred from Reports, Reports Hub, Transport Reports, Daily Attendance Report, Fee Report Builder, Payment Method Enum (+2 more)

### Community 40 - "ESLint Config"
Cohesion: 0.25
Nodes (7): compat, __dirname, eslintConfig, __filename, @eslint/eslintrc, ref_path, ref_url

### Community 41 - "Attendance Marking Page"
Cohesion: 0.25
Nodes (4): AttendancePage(), Klass, Row, STATUSES

### Community 42 - "Production Plan & Year Setup"
Cohesion: 0.32
Nodes (8): Production-Ready ERP Implementation Plan, Cross-cutting rules (campus scope, Decimal money, immutable receipts), Schema rules (ClassSubject.staffId, enrollmentId on collect, Payment.idempotencyKey), Task sequence 0-13 (baseline, RBAC, academics, students SIS, fees...), Academics spec, Timetable and clash detection, Working days calendar, Year setup workflow (session, programs, classes, intake, subjects, teachers, timetable)

### Community 43 - "Architecture, Tenancy & RBAC"
Cohesion: 0.25
Nodes (8): Architecture spec, Actor types: staff, student, guardian, applicant, JSON API + RBAC + domain services layering, Tenancy: Organization / Campus / AcademicSession, Auth, roles, permissions spec, Audit log (marks, fees, student profile changes), Roles: SuperAdmin, Admin, Teacher, Accountant, Librarian, Receptionist, Student, Parent, Permission matrix role x module x feature x action

### Community 44 - "Exams Page"
Cohesion: 0.38
Nodes (4): ExamsPage(), addExam(), createGroup(), reload()

### Community 45 - "Build Order & Modules"
Cohesion: 0.52
Nodes (6): Build Order core/extended/optional, College ERP Blueprint (README), Core Modules, Extended Modules, Optional Modules, Route Conventions (kebab-case, no /admin)

### Community 46 - "Bounded Contexts & Priorities"
Cohesion: 0.29
Nodes (7): 90 Day Implementation Priorities, Academics Core Entities, Admissions Core Entities, Fees Core Entities, Suggested Bounded Contexts, Manage Students List Actions, Deposit Slips

### Community 47 - "Roles Page"
Cohesion: 0.60
Nodes (4): RolesPage(), load(), onCreate(), save()

### Community 48 - "Student Profile Page"
Cohesion: 0.50
Nodes (4): Student, StudentProfilePage(), load(), toggleDisabled()

### Community 49 - "Exams & Seat Numbering"
Cohesion: 0.40
Nodes (5): Emedley Student Performance Dashboard (HTML mockup), Examinations spec, ExamType-ExamGroup-Exam-mark entry-result workflow, Result block/unblock, Seat number assignment and seating arrangement

### Community 50 - "Student Rules & Semester Allocation"
Cohesion: 0.50
Nodes (5): Soft rules: disable not delete, promotion carries fees, multi-class student, Student information spec, Disable / enable student with reason, Roll number generator, Semester Allocation (dept/program/class/semester)

### Community 52 - "School Diary Vendor Inventory"
Cohesion: 0.67
Nodes (3): School Diary Product Inventory, School Diary Vendor uFony, School Diary Product Inventory

## Ambiguous Edges - Review These
- `apps/erp README (run and scripts)` → `docker-compose postgres service`  [AMBIGUOUS]
  docker-compose.yml · relation: conceptually_related_to
- `Emedley Student Performance Dashboard (HTML mockup)` → `Examinations spec`  [AMBIGUOUS]
  emedley-dashboard-1.html · relation: conceptually_related_to
- `Fee Group` → `Fine rules (late slabs)`  [AMBIGUOUS]
  erp-spec/07-fees.md · relation: semantically_similar_to
- `Collect Fees (payment, receipt)` → `Result block/unblock`  [AMBIGUOUS]
  erp-spec/09-examinations.md · relation: conceptually_related_to
- `Fee Group Form` → `Custom Field Form`  [AMBIGUOUS]
  erp-spec/production/field-catalog-live.md · relation: conceptually_related_to

## Knowledge Gaps
- **263 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `nextConfig` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 322 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `apps/erp README (run and scripts)` and `docker-compose postgres service`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Emedley Student Performance Dashboard (HTML mockup)` and `Examinations spec`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Fee Group` and `Fine rules (late slabs)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Collect Fees (payment, receipt)` and `Result block/unblock`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Fee Group Form` and `Custom Field Form`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `next` connect `App Layout & Middleware` to `Core API Routes (Attendance/Auth)`, `Auth & Health API`, `Staff Shell & Navigation`, `Auth/Exams/Fees Pages`, `Package Manifest`, `Student Profile Page`, `Dashboard/Collect/Create Pages`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `react` connect `Auth/Exams/Fees Pages` to `User Management Page`, `Staff Shell & Navigation`, `Academics UI (Classes/Depts)`, `Attendance Marking Page`, `Package Manifest`, `Student Profile Page`, `Dashboard/Collect/Create Pages`, `Catalog Workbench UI`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._