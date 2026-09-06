# Live field catalog

Extracted from authenticated HTML on demoerp.mponline.gov.in. Search boxes (`search_text`) omitted.

## `admin/customfield`

**Labels:** Field Belongs To; Field Type; Date; Field Name; Link; Note; Grid (Bootstrap Column eg. 6) - Max is 12; Field Values (Separate By Comma); Dependent Field; Dependent Value; Field for Calculation; Validation; Required; Visibility; On Table

| name | type |
|---|---|
| `belong_to` | select |
| `type` | select |
| `document_date` | text |
| `name` | text |
| `field_link` | text |
| `field_note` | text |
| `column` | number |
| `field_values` | textarea |
| `cust_fields` | select |
| `cust_fields_values` | select |
| `student_number_fields[]` | select |
| `validation` | checkbox |
| `display_tbl` | checkbox |

- `belong_to` options: Student, Staff, Liberal Art, Admission Documents
- `type` options: Input, Number, Textarea, Dropdown, Multi Select, Checkbox, Date Picker, Datetime Picker, Color Picker, Hyperlink, Radio, Document Attachment, Email, Float

## `admin/department/department`

**Labels:** Name

| name | type |
|---|---|
| `type` | text |
| `departmenttypeid` | hidden |

**Table columns:** Name · Action

## `admin/designation/designation`

**Labels:** Name

| name | type |
|---|---|
| `type` | text |
| `designationid` | hidden |

**Table columns:** Designation · Action

## `admin/exam/schedule`

**Labels:** Exam Group; Exam; Program; Class; Department

| name | type |
|---|---|
| `exam_group_id` | select |
| `exam_id` | select |
| `cource_name[]` | select |
| `class_id` | select |
| `department_id` | select |

**Table columns:** Subject · Date From · Start Time · Duration · Room No. · Marks (Max..) · Marks (Min..)

- `exam_group_id` options: REGULAR (OBE - 2025), Regular- FY Fashion, Regular Medicial Cources, Regular 2026
- `cource_name[]` options: Select Program, B Tech. (Computer Science and Business systems), B.Com, B.Com (Co Ed) B, B.PEd B, B.Sc B, B.Sc BEd B, B.Sc Nursing (Ayurveda) B, B.sc yoga, B.Sc.(Bio. Group), B.Sc.(Mathematics Group), B.Tech (Math), B.Tech in Artificial Intelligence, BA B, BA BEd B

## `admin/examgroup`

**Labels:** Name *; Exam Type; Description; Start Date; End Date; Select Exam Group For Same; Exam Month - Year; Exam Group For Exam - Year; Is Additional; Is Active; Is Active For Revaluation; Exam Group Access; Admin; Teacher; Accountant; Librarian; Receptionist; Principal; HOD; Super_Admin; Hostel Warden; Fee Admin; Test User; Univ user; Institute User; Advisor; Guest; TC Incharge; MCNUJC COE; Moderator; Class *; Section *; Choose File to Import *

| name | type |
|---|---|
| `name` | text |
| `exam_type` | select |
| `description` | textarea |
| `exam_date` | text |
| `end_exam_date` | text |
| `copy_exam_group` | select |
| `exam_month_year` | text |
| `examgroup_for_exam_type` | select |
| `is_additional_exam` | checkbox |
| `is_active` | checkbox |
| `is_active_for_revaluation` | checkbox |
| `exam_group_access[]` | checkbox |
| `exam_id` | hidden |
| `class_id` | select |
| `section_id[]` | select |
| `file` | file |

**Table columns:** Name · No Of Exams · Exam Type · Action

- `exam_type` options: General Purpose (Pass/Fail), School Based Grading System, College Based Grading System, GPA Grading System, Average Passing
- `copy_exam_group` options: REGULAR (OBE - 2025), Regular- FY Fashion, Regular Medicial Cources, Regular 2026
- `examgroup_for_exam_type` options: Regular, ATKT
- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd

## `admin/feediscount`

**Labels:** Name; Discount Code; Discount Type; Percentage; Fix Amount; Percentage (%); Amount (₹); Description

| name | type |
|---|---|
| `name` | text |
| `code` | text |
| `account_type` | radio |
| `percentage` | text |
| `amount` | number |
| `description` | textarea |

**Table columns:** Name · Discount Code · Percentage (%) · Amount (₹) · Action

## `admin/feegroup`

**Labels:** Name; Description; Domicile; Category; Gender

| name | type |
|---|---|
| `name` | text |
| `description` | textarea |
| `domicile_state[]` | select |
| `category_id[]` | select |
| `gender` | select |

**Table columns:** Name · Gender · Description · Category · Domicile · Action

- `domicile_state[]` options: Uttar Pradesh, Other State
- `category_id[]` options: Scheduled Castes (SC), Scheduled Tribes (ST), OPEN, SBC, OBC, NT (C), NT (B), NT (D), EWS, SEBC, TFWS (Only applicable for BBA & BMS course), VJ / DT-A
- `gender` options: Male, Female, Transgender

## `admin/feemaster`

**Labels:** Fees Group; Fees Type; Variable Fee; Due Date; Amount (₹); Fine Type; None; Percentage; Fix Amount; Percentage (%); Fix Amount (₹)

| name | type |
|---|---|
| `fee_groups_id` | select |
| `feetype_id` | select |
| `variable` | select |
| `variable_data` | hidden |
| `due_date` | text |
| `amount` | text |
| `account_type` | radio |
| `fine_percentage` | text |
| `fine_amount` | text |

**Table columns:** Fees Group · Variable Fee Fees Code Amount · Action

- `fee_groups_id` options: B.com, BBA, MA- Ancient History, UG- BA All Department, Portal Substrucation Fee, ONE TIME PAYMENT, DEPOSITS PAYABLE, SEMESTER FEE, Annual Fee, BA (OPEN-Female), BCA (Co Ed), BSc, B.PEd, B.Sc BEd, BA BEd
- `feetype_id` options: Admission Fee, Term Fee, Tution Fee, Gymkhana Fee, Thesis Fee, Portal Substrucation Fee, Student Welfare Fund, Practical Fee, Project Fee, NCC Fund, Disaster Relief Fund, TESTE, Caution Money, Examination, Registration/Enrollment
- `variable` options: NO, YES

## `admin/fees/installment`

**Labels:** Name; Fees Type

| name | type |
|---|---|
| `name` | text |
| `feetype_id[]` | select |

**Table columns:** Name · Fees Type Group · Action

- `feetype_id[]` options: Admission Fee, Term Fee, Tution Fee, Gymkhana Fee, Thesis Fee, Portal Substrucation Fee, Student Welfare Fund, Practical Fee, Project Fee, NCC Fund, Disaster Relief Fund, TESTE, Caution Money, Examination, Registration/Enrollment

## `admin/feetype`

**Labels:** Fees Type Group; Name; Fees Code; Optional Fee; Variable Fee; Description; Apply Other Fees; Other Fees Name

| name | type |
|---|---|
| `fees_type_group` | select |
| `name` | text |
| `code` | text |
| `variable` | select |
| `variable_fees` | select |
| `description` | textarea |
| `apply_other_fee` | checkbox |
| `other_fee_name` | text |

**Table columns:** Fees Type Group · Name · Optional Fee · Variable Fee · Fees Code · Action

- `fees_type_group` options: Admission Fee, Term Fee, Misc fees, Gymkhana Fee, Thesis Fee, Portal Substrucation Fee, Student Welfare fund, Practical Fee, Project Fee, NCC Fund, Caution Money, Examination, Registration/Enrollment, Amenities, Hostel Establishment
- `variable` options: NO, YES
- `variable_fees` options: NO, YES

## `admin/fine/rules`

**Labels:** Fine Rule Name *; Fine By *; Apply by Assign Fees Date; Apply by Due Date; Due Date; Apply Rule After Days; Grace Period (Days); Calculation Type; Amount Per Day; Maximum Cap; From Day; To Day; Amount; Percentage (%); Fixed Amount; Status

| name | type |
|---|---|
| `rule_name` | text |
| `assign_by_days` | checkbox |
| `apply_by_due_date` | checkbox |
| `due_date` | text |
| `assign_days` | number |
| `grace_period` | number |
| `calculation_type` | select |
| `amount_per_day` | number |
| `per_day_max_cap` | number |
| `slab[from][]` | number |
| `slab[to][]` | number |
| `slab[amount][]` | number |
| `percentage` | number |
| `percentage_max_cap` | number |
| `fixed_amount` | number |
| `status` | select |

**Table columns:** Fine Rule Name · Type · Status · Action

- `calculation_type` options: Per Day, Slab, Percentage, Flat
- `status` options: Active, InActive

## `admin/grade`

**Labels:** Exam Type *; Semester; Class; Grade Name *; Percent Upto *; Percent From *; Grade Point *; Grade Point Upto *; Grade Point From *; Description

| name | type |
|---|---|
| `exam_type` | select |
| `semester_type[]` | select |
| `class_id[]` | select |
| `name` | text |
| `mark_from` | text |
| `mark_upto` | text |
| `grade_point` | text |
| `grade_point_upto` | text |
| `grade_point_from` | text |
| `description` | textarea |

**Table columns:** Exam Type · Grade Name Class Percent From / Upto Semester Grade Point Grade Point From / Upto Action · Grade Name · Class · Percent From / Upto · Semester · Grade Point · Grade Point From / Upto · Action

- `exam_type` options: General Purpose (Pass/Fail), School Based Grading System, College Based Grading System, GPA Grading System, Average Passing
- `semester_type[]` options: Semester I, Semester II, Semester III, Semester IV, Semester V, Semester VI
- `class_id[]` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd

## `admin/leavetypes`

**Labels:** Name; Half Day Allowed; Up to Leave; Combination Allowed; Comment Box; Leave Apply Date in Back Date; Disabled; Enabled

| name | type |
|---|---|
| `type` | text |
| `leavetypeid` | hidden |
| `half_day_allow` | select |
| `up_to_leave` | text |
| `combination_allowed[]` | select |
| `comment_box` | checkbox |
| `leave_apply_date_in_back_date` | radio |

**Table columns:** Name · Half Day Allowed · Up to Leave · Combination Allowed · Action

- `half_day_allow` options: Yes, No
- `combination_allowed[]` options: MEDICAL LEAVE, CASUAL LEAVE, Function Leave, Personal leave, EXAMINATION LEAVE, Compansate Leave, EARN LEAVE, COMPENSATORY OFF, MK Leave

## `admin/module`

| name | type |
|---|---|
| `someSwitchOption001` | checkbox |

**Table columns:** Name · Action

## `admin/onlineexam`

**Labels:** Select All; Quiz; Exam Title; Subject; No of Questions to be Displayed; Exam From; Exam To; Auto Result Publish Date; Time Duration; Attempt; Passing Percentage; Answer Word Limit; Publish Exam; Publish Result; Negative Marking; Display Marks In Exam; Random Question Order; Exam use for copo mapping; Description *; Search By Keyword; Question Type; Question Level; Class; Section; Search

| name | type |
|---|---|
| `checkAll` | checkbox |
| `recordid` | hidden |
| `is_quiz` | checkbox |
| `exam` | text |
| `subjectid` | select |
| `no_question_display` | text |
| `exam_from` | text |
| `exam_to` | text |
| `auto_publish_date` | text |
| `duration` | text |
| `attempt` | number |
| `passing_percentage` | number |
| `word_limit` | number |
| `is_active` | checkbox |
| `publish_result` | checkbox |
| `is_neg_marking` | checkbox |
| `is_marks_display` | checkbox |
| `is_random_question` | checkbox |
| `use_for_copo_mapping` | checkbox |
| `description` | textarea |
| `modal_exam_id` | hidden |
| `modal_is_quiz` | hidden |
| `keyword` | text |
| `question_type` | select |
| `question_level` | select |
| `search_box` | text |
| `selected_subjectid` | hidden |
| `class_id` | select |
| `section_id` | select |
| `question_id` | hidden |

**Table columns:** Exam · Quiz · Questions · Attempt · Exam From · Exam To · Duration · Exam Published · Result Published · Action · #

- `subjectid` options: Accounting and Financial Management – I (FYBCOMMI107), Business Economics – I (FYBCOMMI108), Accounting and Financial Management – II (FYBCOMMI101), Commerce – II (Organizational Behavior) (FYBCOMMJ103), Business Communication – II (FYBCOMOE104), Business Communication – I (FYBCOMMI109), Environmental Studies – I (FYBCOMMI110), Indian Economic Environment – II (FYBAMJ106), Early India: Post-Mauryan Age to Rashtrakutas (FYBAMJ108), Accounting and Financial Managemen- II (C010101T), Project Upload (AyUG‑PV), Business Economics (C010104T), Business Communication (C010103T), Bcom- Business Statistics (C010102T), Introduction to Physical Geography (FYBAMJ109)
- `question_type` options: Single Choice, Multiple Choice, True/False, Descriptive
- `question_level` options: Low, Medium, High
- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd

## `admin/roles`

**Labels:** Name

| name | type |
|---|---|
| `name` | text |

**Table columns:** Role · Type · Action

## `admin/staff`

**Labels:** Role; Search By Keyword; Year; Please Select File

| name | type |
|---|---|
| `role` | select |
| `leave_import_year` | select |
| `import_file` | file |

**Table columns:** Staff ID · Name · Role · Department · Designation · Student Mobile Number · Email · Action

- `role` options: Admin, Teacher, Accountant, Librarian, Receptionist, Principal, HOD, Super_Admin, Hostel Warden, Fee Admin, Test User, Univ user, Institute User, Advisor, Guest
- `leave_import_year` options: 2024, 2025, 2026

## `admin/staffattendance`

**Labels:** Role; Attendance Date

| name | type |
|---|---|
| `user_id` | select |
| `date` | text |

- `user_id` options: Admin, Teacher, Accountant, Librarian, Receptionist, Principal, HOD, Super_Admin, Hostel Warden, Fee Admin, Test User, Univ user, Institute User, Advisor, Guest

## `admin/stuattendence`

**Labels:** Class; Section; Attendance Date

| name | type |
|---|---|
| `class_id` | select |
| `section_id` | select |
| `date` | text |

- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd

## `admin/subject`

**Labels:** Vertex Type; Subject Name; Subject; Subject Type; Theory; Practical; Is Optional ?; Mandatory; Elective; Non-Course; Minor; Major; IKS; Subject Code; Credit Earned; Number of Lectures; Sequence No; Is Additional Subject; Yes; No; Is Clubbed Subject; Existing Subject; Attach File

| name | type |
|---|---|
| `vertix_type` | select |
| `subject` | text |
| `name` | text |
| `type` | radio |
| `is_optional` | radio |
| `code` | text |
| `credit` | text |
| `number_of_lectures` | text |
| `sequence_no` | number |
| `is_additional_subject` | radio |
| `is_clubbed_subject` | radio |
| `clubbed_subject_id[]` | select |
| `sub_file` | file |

**Table columns:** Vertex Type · Subject · Subject Code · Is Optional ? · Number of Lectures · Credit Earned · Is Additional Subject · Is Clubbed Subject · Sequence No · Action

- `vertix_type` options: Major, Minor, OE, CC, SEC, VSC
- `clubbed_subject_id[]` options: Accounting and Financial Management – I (FYBCOMMI107), Business Economics – I (FYBCOMMI108), Accounting and Financial Management – II (FYBCOMMI101), Business Economics – II (FYBCOMMJ102), Commerce – II (Organizational Behavior) (FYBCOMMJ103), Business Communication – II (FYBCOMOE104), Environmental Studies – II (FYBCOMMI105), Commerce - I (FYBCOMMI106), Business Communication – I (FYBCOMMI109), Environmental Studies – I (FYBCOMMI110), Engineering Mathematics – I (EES101), Engineering Physics / Applied Physics (EES102), Basic Electrical Engineering (EES103), Programming for Problem Solving (Python/C) (EES104), Compulsory English – II (FYBAMJ105)

## `admin/subjectgroup`

**Labels:** Name; Batch Name; Class; Semester; Sections; Specialization; No Section; Subject; Course Optional Subject; Optional Subject; Minor Subject; Major Subject; IKS Subject; Description; Attach File

| name | type |
|---|---|
| `name` | text |
| `batch_id` | select |
| `class_id` | select |
| `semester_type` | select |
| `subject[]` | select |
| `course_optional_subject[]` | select |
| `optional_subject[]` | select |
| `minor_subject[]` | select |
| `major_subject[]` | select |
| `iks_subject[]` | select |
| `description` | textarea |
| `sub_file` | file |

**Table columns:** Name · Class (Section) · Batch Name · Subject · Optional Subject · Semester · Action

- `batch_id` options: 2024-2026, 2023-2025, 2025-2027
- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd
- `semester_type` options: Semester I, Semester II, Semester III, Semester IV, Semester V, Semester VI
- `subject[]` options: Accounting and Financial Management – I (FYBCOMMI107), Business Economics – I (FYBCOMMI108), Accounting and Financial Management – II (FYBCOMMI101), Business Economics – II (FYBCOMMJ102), Commerce – II (Organizational Behavior) (FYBCOMMJ103), Environmental Studies – II (FYBCOMMI105), Commerce - I (FYBCOMMI106), Business Communication – I (FYBCOMMI109), Engineering Mathematics – I (EES101), Engineering Physics / Applied Physics (EES102), Basic Electrical Engineering (EES103), Programming for Problem Solving (Python/C) (EES104), Compulsory English – II (FYBAMJ105), Indian Economic Environment – II (FYBAMJ106), Introduction to Indian Constitution – II (FYBAMJ107)
- `course_optional_subject[]` options: Business Communication – II (FYBCOMOE104), Environmental Studies – I (FYBCOMMI110), Introduction to Physical Geography (FYBAMJ109), Padartha Vigyan and Ayurveda Itihas (Philosophy & History of Ayurveda) (AyUG‑PV-AI), Oral Pathology & Oral Microbiology (sometimes coursework) (D0226), Electrical Technology (EE11001), Oral Microbiology (D0227), Engineering Drawing and Computer Graphics (CE13001), Mathematics‑I (A10002), Computer Programming (A10501), Lifestyle Management, Public Health and Yoga (SYBAMSMI106), Pathology (SYBAMSMI107), General Medicine (FYBDS106), Customer Relationship Management (UBMSFSV.6), Sales and Distribution Management (UBMSFSV.7)
- `optional_subject[]` options: English (123), Hindi (456)

## `admin/timetable/classreport`

**Labels:** Class; Section; Semester

| name | type |
|---|---|
| `class_id` | select |
| `section_id[]` | select |
| `semester_type` | select |

- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd
- `semester_type` options: Semester I, Semester II, Semester III, Semester IV, Semester V, Semester VI

## `classes`

**Labels:** Program Type; Program; Year; Class; Sections; Specialization; Status; Active; InActive; Is Other Course Form ?; Is Other Course Form; Teacher; Fees; Is Active; Yes; No; Sequence No

| name | type |
|---|---|
| `program_type` | select |
| `cource_name[]` | select |
| `year` | select |
| `class` | text |
| `sections[]` | checkbox |
| `specialization[1][]` | select |
| `specialization[2][]` | select |
| `specialization[3][]` | select |
| `specialization[33][]` | select |
| `specialization[34][]` | select |
| `specialization[35][]` | select |
| `specialization[36][]` | select |
| `specialization[37][]` | select |
| `specialization[38][]` | select |
| `specialization[39][]` | select |
| `specialization[40][]` | select |
| `specialization[41][]` | select |
| `specialization[42][]` | select |
| `status` | radio |
| `is_liberalart` | checkbox |
| `value_added_staff_id` | select |
| `value_added_fees` | number |
| `is_active` | radio |
| `sequence_no` | number |

**Table columns:** Program · Class · Sections · Specialization · Year · Is Other Course Form · Sequence No · Status · Action

- `program_type` options: Undergraduate, Postgraduate
- `cource_name[]` options: Select Program, B Tech. (Computer Science and Business systems), B.Com, B.Com (Co Ed) B, B.PEd B, B.Sc B, B.Sc BEd B, B.Sc Nursing (Ayurveda) B, B.sc yoga, B.Sc.(Bio. Group), B.Sc.(Mathematics Group), B.Tech (Math), B.Tech in Artificial Intelligence, BA B, BA BEd B
- `year` options: Select Year, 1 (First Year), 2 (Second Year), 3 (Third Year), 4 (Fourth Year)

## `schsettings`

**Labels:** Name of the Institute *; Institute Code; Address *; Phone *; Email *; Session *; Session Start Month *; Date Format *; Timezone *; Start Day Of Week *; Currency Format *; Currency Symbol Place *; Before Number; After Number; Base Url *; File Upload Path *

| name | type |
|---|---|
| `sch_name` | text |
| `sch_id` | hidden |
| `sch_dise_code` | text |
| `sch_address` | text |
| `sch_phone` | text |
| `sch_email` | text |
| `sch_session_id` | select |
| `sch_start_month` | select |
| `sch_date_format` | select |
| `sch_timezone` | select |
| `sch_start_week` | select |
| `currency_format` | select |
| `currency_place` | hidden |
| `base_url` | text |
| `folder_path` | text |

- `sch_session_id` options: 2025-26, 2026-27
- `sch_start_month` options: January, February, March, April, May, June, July, August, September, October, November, December
- `sch_date_format` options: dd-mm-yyyy, dd-mmm-yyyy, dd/mm/yyyy, dd.mm.yyyy, mm-dd-yyyy, mm/dd/yyyy, mm.dd.yyyy, yyyy/mm/dd
- `sch_timezone` options: --Select--, (GMT-11:00) Pacific, Midway, (GMT-11:00) Pacific, Niue, (GMT-11:00) Pacific, Pago Pago, (GMT-10:00) Pacific, Honolulu, (GMT-10:00) Pacific, Rarotonga, (GMT-10:00) Pacific, Tahiti, (GMT-09:30) Pacific, Marquesas, (GMT-09:00) America, Adak, (GMT-09:00) Pacific, Gambier, (GMT-08:00) America, Anchorage, (GMT-08:00) America, Juneau, (GMT-08:00) America, Metlakatla, (GMT-08:00) America, Nome, (GMT-08:00) America, Sitka
- `sch_start_week` options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- `currency_format` options: 12345678.00, 12,345,678.00, 1,23,45,678.00, 12.345.678.00, 12.345.678,00, 12 345 678.00 (Not For RTL)

## `sections`

**Labels:** Section; Specialization

| name | type |
|---|---|
| `section` | text |
| `specialization[]` | select |

**Table columns:** Section · Specialization · Action


## `sessions`

**Labels:** Session; Session Code; Sequence No

| name | type |
|---|---|
| `session` | text |
| `session_code` | text |
| `sequence_no` | number |

**Table columns:** Sequence No · Session · Session Code · Status · Action

## `studentfee`

**Labels:** Class; Section; Search By Keyword

| name | type |
|---|---|
| `class_id` | select |
| `section_id` | select |

**Table columns:** Class · Section · Student ID · Student Name · Father's Name/Spouse Name · Date Of Birth · Phone · Action

- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd

## `studentfee/feesearch`

**Labels:** Fees Group; Select All; Admission Fee (1); Term Fee (2); Tution Fee (3); Portal Substrucation Fee (6); Student Welfare Fund (7); Practical Fee (8); Project Fee (9); NCC Fund (10); Gymkhana Fee (4); Thesis Fee (5); Alumni Membership Fee (109); Caution Money (101); Examination (102); Registration/Enrollment (103); Amenities (104); Hostel Establishment (105); Hostel Seat Rent (106); Medical Fee (107); Institute Development Fund (108); Testfee (9999); Optional (10110); Tuition Fee BCA (Co Ed) (TF-B); Tution Fee B.Sc (TF-BSc); B.Sc BEd (TF-B.Sc BEd); Tution Fee BA BEd (TF-BA BEd); B.Sc Nursing (Ayurveda) (TF-B.Sc Nursing); Tution Fee BNYS (TF- BNYS); Tution fee B.Com (Co Ed) (TF-B.Com (Co Ed)); Tution Fee BA (TF-BA); Class; Section

| name | type |
|---|---|
| `select_all` | checkbox |
| `feegroup[]` | checkbox |
| `class_id` | select |
| `section_id` | select |

- `class_id` options: FY BPT, FY MD General Medicine, FY BCA (Co Ed) B, SY BPT, SY Health Science, SY MD General Medicine, FY EE, FY B.Com (Co Ed), TY BPT, FY BA, FY B.Sc, SY IT, FY B.PEd, TY IT, FY B.Sc BEd
