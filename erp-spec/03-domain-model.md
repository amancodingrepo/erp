# Domain model

This is the minimum relational model to support the live product. Names are yours; fields match what the UI collects.

## Academic skeleton

```
AcademicSession     id, name, start_date, end_date, is_current
Department          id, name, code
Program             id, department_id, name, code, level (UG/PG/diploma), duration_semesters
Specialization      id, program_id, name
ProgramIntake       id, program_id, session_id, seats, reserved_seats_json
Class               id, name, program_id, year_or_semester_no   -- UI "Class"
Section             id, class_id, name                         -- A/B/C
Subject             id, name, code, type (theory/practical/optional)
SubjectGroup        id, name, session_id                       -- they labeled this "Semester" in menu
SubjectGroupItem    subject_group_id, subject_id
ClassSectionSubject id, class_id, section_id, subject_id, staff_id
ClassTeacher        class_id, section_id, staff_id
```

Cascade used everywhere: Department → Program → Class → Section → Specialization.

## People

```
Student
  admission_no (Student ID)        -- unique
  roll_no                          -- unique per class (they have a generator)
  enrollment_no (PRN / student_prn)
  abc_id                           -- India Academic Bank of Credits
  salutation, first, middle, last
  name_as_12th, name_as_aadhaar
  gender, dob, place_of_birth
  category_id, religion, caste, sub_caste, minority, nationality, domicile_state
  admission_quota, admission_date, fee_category_id
  mobile, email, phone, allotted_institute_email
  aadhaar, pan                     -- encrypt
  photo_url, signature_url
  status: active | disabled
  disable_reason_id
  current_class_id, current_section_id, specialization_id, session_id

StudentAddress     kind=permanent|local, lines, city, village, taluka, district, region, state, pincode, nation
StudentPreviousEducation  board, university, university_state, university_prn, marks, total, pct, last_class, year, roll, seat_no, result
StudentBank        account_no, holder, bank, ifsc, branch, branch_address, account_type
StudentPassportVisa
StudentDocument    title, file_url, type
StudentSibling     student_id, sibling_student_id
Guardian           relation (father/mother/other), name, phone, email, occupation, income, pan, photo
```

Category master: `/category` (student category + category ID).
House: `/admin/schoolhouse` (optional school house).
Disable reason: `/admin/disable_reason`.

## Fees

```
FeeType            name, code
FeeGroup           name
FeeGroupType       fee_group_id, fee_type_id
FeeMaster          session_id, fee_group_id, due_date, amount   -- session priced
FeeMasterCourse    fee_master_id, class/program mapping        -- "Assign Fee Master"
FeeDiscount        name, type (percent/flat), amount, code
FineRule           late-day slabs
FeeInstallment     plan per class/session
StudentFeeAssign   student_id, fee_master_id, session_id
StudentFeeInvoice  student_id, session_id, status, due_total
StudentFeePayment  invoice_id, amount, fine, discount, mode, receipt_no, paid_at, gateway_ref
Scholarship        student_id, scheme, amount, status
```

Collect UI: `/studentfee` (search student → invoice lines → pay partial/full).

## Exams

```
ExamType
ExamGroup          name, exam_type_id, session_id
Exam               exam_group_id, name
ExamSubject        exam_id, subject_id, date, time, max_marks, min_marks, credit
Mark               exam_subject_id, student_id, marks_obtained, grade_id, is_absent
GradeScale         name, min, max, point, letter
Division           name, min_pct
SeatNumber         student_id, exam_id, seat_no
AdmitCardTemplate / MarksheetTemplate  HTML
AtktApplication    student_id, exam_id, subjects[], fee_status
RevaluationApplication
SeatingBlock       room, capacity, exam_subject_id
SeatingAssignment  block_id, student_id
```

## Attendance

```
StudentAttendance  student_id, date, period_or_subject_id, status (P/A/L/H/F), marked_by
StaffAttendance    staff_id, date, status, in_time, out_time
LeaveType
LeaveBalance       staff_id, leave_type_id, year, entitled, used
LeaveRequest       applicant, type, from, to, status, approver
StudentLeave       student_id, from, to, status   -- Approve Leave
```

## HR / payroll

```
Staff              employee_id, user_id, department_id, designation_id, joining_date, contract_type
PayElement         name, kind=earning|deduction, calc=fixed|percent
StaffPayStructure  staff_id, element_id, amount
PayrollRun         month, year, status
Payslip            run_id, staff_id, gross, net, json_lines
TaxSlab            year, from, to, rate
Form16ish          generated from payslip + tax elements
```

## Campus

```
Hostel, HostelRoomType, HostelRoom, HostelAllocation, GatePass
Route, Vehicle, VehicleRoute, PickupPoint, StudentTransport
Book, LibraryMember, BookIssue
ItemCategory, Item, ItemStore, ItemSupplier, ItemStock, ItemIssue
Visitor, Enquiry, Complaint, PostalIn, PostalOut, CallLog
RoomBooking
```

## Quality

```
CourseOutcome, ProgramOutcome, CoPoMap, LessonTopic, SyllabusProgress
NaacTask, NaacAllocation, NaacEvidence
FeedbackForm, FeedbackField, FeedbackAssignment, FeedbackResponse
TnpCompany, TnpDrive, TnpApplication
```

## Soft rules

- Never delete students; set `status=disabled` + reason (they have Disabled Students + Bulk Delete; prefer disable).
- Promotion (`/admin/stdtransfer`) copies student into next class/session and optionally carries fees (`/admin/feesforward`).
- Multi-class student (`/student/multiclass`) = one person in more than one class-section (electives / dual enrollment).
