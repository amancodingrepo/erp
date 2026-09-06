# MPOnline Demo ERP — route map

Generated from an authenticated admin session on `demoerp.mponline.gov.in`.
College shown after login: **Govt College junnardeo, Chhindwara**.
Stack: CodeIgniter (PHP), Apache, session cookie `erp_session_`, CSRF token name `ci_csrf_token` (hash was empty/null on this demo).

This is **not** an OpenAPI catalog. Pages and AJAX endpoints share the same `/{controller}/{method}` URL space. Extra POST methods exist per page and are not all listed unless sampled.

Counts:
- Unique sidebar page URLs: **340**
- Unique app paths (excluding `/backend` static assets): **342**
- Sidebar modules: **43**

## Auth

| Method | Path | Notes |
|---|---|---|
| GET | `/site/login` | Staff login page (captcha) |
| POST | `/site/login` | Fields: `username`, `password`, `captcha`, `ci_csrf_token`. Success → 303 `/admin/admin/dashboard` |
| POST | `/site/refreshCaptcha` | Refresh captcha HTML |
| GET | `/welcome/token` | JSON `{csrfName, csrfHash}` |
| GET | `/site/forgotpassword` | Password reset |
| GET | `/site/logout` | Logout |
| POST | `/admin/admin/getSession` | Session list (`school-custom.js`) |
| POST | `/admin/admin/updateSession` | Switch academic session |
| POST | `/common/getSudentSessions` | Student-role sessions |
| POST | `/common/getAllSession` | All sessions |
| POST | `/common/updateSession` | Student/parent session switch → `/user/user/dashboard` |

## Public / unauthenticated

| Path | HTTP | Notes |
|---|---|---|
| `/` and `/frontend` | 200 | Marketing home |
| `/page/home` | 200 | Redirects to `/frontend` |
| `/page/events` | 200 | Events |
| `/online_admission` | 200 | Online admission |
| `/read/notice-about-addmission` | 200 | Notice |
| `/site/login` | 200 | Staff login |
| `/site/forgotpassword` | 200 | Forgot password |
| `/welcome/token` | 200 | CSRF JSON |

## Global AJAX (every authenticated page)

| Method | Path |
|---|---|
| POST | `/admin/multibranch/branch/switchbranchlist` |
| POST | `/admin/multibranch/branch/switch` |
| POST | `/admin/currency/change_currency` |
| POST | `/admin/admin/search` |
| POST | `/admin/admin/activeSession` |
| POST | `/admin/calendar/saveevent` |
| POST | `/admin/calendar/updateevent` |
| POST | `/admin/calendar/markcomplete/` |

## Sampled page AJAX (not in sidebar)

### Fees `/studentfee`
- GET `/studentfee`
- POST `/studentfee/search`
- DataTables POST `/studentfee/ajaxSearch`

### Students `/student/search`
- GET `/student/search`
- POST `/student/searchvalidation`

### Enquiry `/admin/enquiry`
- POST `/admin/enquiry/add/`
- POST `/admin/enquiry/editpost/`
- POST `/admin/enquiry/delete/`
- POST `/admin/enquiry/details/`
- POST `/admin/enquiry/follow_up/`
- POST `/admin/enquiry/follow_up_list/`
- POST `/admin/enquiry/check_number`

### Chat `/admin/chat`
- POST `/admin/chat/adduser`
- POST `/admin/chat/searchuser`
- POST `/admin/chat/myuser`
- POST `/admin/chat/getChatRecord`
- POST `/admin/chat/newMessage`
- POST `/admin/chat/chatUpdate`
- POST `/admin/chat/mychatnotification`
- POST `/admin/chat/mynewuser`

### Calendar `/admin/calendar/events`
- POST `/admin/calendar/addtodo`
- GET/POST `/admin/calendar/gettaskbyid/`

### Staff `/admin/staff`
- POST `/admin/staff` (search form)
- `/admin/staff/bulk_update_leaves_export`
- `/admin/staff/bulk_update_leaves_import`

## Sidebar modules

- Dashboard
- Admission
- Student Information
- Fees Collection
- Attendance
- Examinations
- Online Examinations
- Academics
- Lesson Plan
- CO-PO
- Assignment
- Library
- Human Resource
- Payroll
- Income
- Expenses
- Inventory
- Hostel
- Transport
- Communicate
- Front Office
- Front CMS
- Download Center
- Certificate
- Alumni
- NAAC
- Feedback Management
- Online Course
- Canteen
- Booking System
- Seating Arrangement
- Activity Management
- Annual Calendar
- Gmeet Live Classes
- Zoom Live Classes
- Training & Placements
- Student CV
- Student Support
- Task Management
- Multi Branch
- Reports
- System Setting

## All authenticated page paths

Role: **admin**. Other roles (student/parent/teacher) use `/user/user/dashboard` and were not opened.

### `/admin` (264)

| Label | Path |
|---|---|
| Backup Restore | `/admin/admin/backup` |
| Password | `/admin/admin/changepass` |
|  | `/admin/admin/dashboard` |
| File Types | `/admin/admin/filetype` |
| Dashboard | `/admin/admission/admission_dashboard` |
| Cutoff Setup | `/admin/admission/cutofflist` |
| Generate Merit List | `/admin/admission/generatemeritlist` |
| Import Applicants | `/admin/admission/importapplication` |
| Manage Admission | `/admin/admission/manageadmission` |
| Admission Report | `/admin/admission/report` |
| Selection Status Report | `/admin/admission/selection_status_report` |
| Summarized Report | `/admin/admission/summary_report` |
| Transfer & Cancellation | `/admin/admission_transfer_cancellation/transfer_cancellation_list` |
| Design Admit Card | `/admin/admitcard` |
| Manage Alumni | `/admin/alumni/alumnilist` |
| Events | `/admin/alumni/events` |
| Approve Leave | `/admin/approve_leave` |
| Assign Mentor | `/admin/assign_mentor` |
| OJT / SIP Approval List | `/admin/assign_mentor/ojt_approval_list` |
| OJT Details | `/admin/assign_mentor/ojt_details` |
| Project Approval List | `/admin/assign_mentor/project_approval_list` |
| Project Chapter List | `/admin/assign_mentor/project_chapter_list` |
| Assign Variable Fees | `/admin/assign_variable_fees` |
| ATKT/Regular Exam Form | `/admin/atkt_form/admissionsetting` |
| ATKT Form | `/admin/atkt_form/atkt_form_report` |
| ATKT Form | `/admin/atkt_form/atkt_form_student` |
| Edit ATKT Form | `/admin/atkt_form/edit_atkt_form_student` |
| Manage Attributes | `/admin/attributes/index` |
| Audit Trail Report | `/admin/audit` |
| Batch Setting | `/admin/batch_settings` |
| Book List | `/admin/book/getall` |
| View All | `/admin/calendar/events` |
| Assign Menu | `/admin/canteen/assign_menu` |
| Canteen Auditor | `/admin/canteen/canteen_auditor` |
| Create Coupon | `/admin/canteen/create_coupon` |
| Menu Type Master | `/admin/canteen/getall_breaktype` |
| Canteen Master | `/admin/canteen/getall_canteen` |
| Food Item Master | `/admin/canteen/getall_foodItem` |
| Menu List | `/admin/canteen/menu_list` |
| Captcha Setting | `/admin/captcha` |
| Student Certificate | `/admin/certificate` |
| Certificate Report | `/admin/certificate_report` |
|  | `/admin/chat` |
| Classroom Allotment | `/admin/classroom/classroom_allotment` |
| Classroom Setup | `/admin/classroom/classroom_setup` |
| Complaint | `/admin/complaint` |
| Setting | `/admin/conference` |
| Live Class Report | `/admin/conference/class_report` |
| Live Meeting | `/admin/conference/meeting` |
| Live Meeting Report | `/admin/conference/meeting_report` |
| Live Classes | `/admin/conference/timetable` |
| Content Share List | `/admin/content/list` |
| Upload /Share Content | `/admin/content/upload` |
| Content Type | `/admin/contenttype` |
| CO-PO Mapping | `/admin/copo/co_po_mapping` |
| Course Outcomes | `/admin/copo/course_outcomes` |
| Indirect PO Mapping | `/admin/copo/indirect_po_mapping` |
| Create Lesson | `/admin/copo/lesson` |
| Plan | `/admin/copo/plan` |
| Program Outcomes | `/admin/copo/program_outcomes` |
| TLP Approve List | `/admin/copo/tlp_approve_list` |
| Currency | `/admin/currency` |
| Custom Fields | `/admin/customfield` |
| Dashboard | `/admin/dashboard` |
| Department | `/admin/department/department` |
| Designation | `/admin/designation/designation` |
| Disable Reason | `/admin/disable_reason` |
| Postal Dispatch | `/admin/dispatch` |
| Admission Enquiry | `/admin/enquiry` |
| Exam Schedule | `/admin/exam_schedule` |
| Exam Group | `/admin/examgroup` |
| Mark Entry Multi Subjectwise | `/admin/examgroup/displaymarksexamsubjwise` |
| Exam Form | `/admin/examgroup/exam_form` |
| Exam Remuneration Bill | `/admin/examgroup/exam_remuneration_bill` |
| Exam Type | `/admin/examgroup/exam_type` |
| Mark Entry Single Subject | `/admin/examgroup/markEntrySingleSubject` |
| Mark Entry Subjectwise | `/admin/examgroup/markEntrySubjectwise` |
| Remuneration Hour Setup | `/admin/examgroup/remuneration_hoursetup` |
| Remuneration Setup | `/admin/examgroup/remuneration_setup` |
| Revaluation Form | `/admin/examgroup/revaluation_form` |
| Design Marksheet Format | `/admin/exammarksheet` |
| Print Marksheet Format | `/admin/exammarksheet/marksheet` |
| Exam Result | `/admin/examresult` |
| Print Admit Card | `/admin/examresult/admitcard` |
| Backlog | `/admin/examresult/backlog` |
| Result Block/Unblock | `/admin/examresult/exam_result_block_unblock` |
| Examinations | `/admin/examresult/examinations` |
| Print Marksheet | `/admin/examresult/marksheet` |
| Add Expense | `/admin/expense` |
| Search Expense | `/admin/expense/expensesearch` |
| Expense Head | `/admin/expensehead` |
| Fee Receipt Import | `/admin/fee_receipt_import` |
| Fees Discount | `/admin/feediscount` |
| Fees Group | `/admin/feegroup` |
| Fees Master | `/admin/feemaster` |
| Assign Fee Master | `/admin/feemastercoursewise` |
| Fees Reminder | `/admin/feereminder/setting` |
| Fees Installment | `/admin/fees_installment` |
| Fees Type Group | `/admin/fees_type_group` |
| Fees Carry Forward | `/admin/feesforward` |
| Fees Type | `/admin/feetype` |
| Fees Fine Rules | `/admin/fine_rules` |
| Add Activity | `/admin/flowmaster/add_event` |
| Activity List | `/admin/flowmaster/event_list` |
| Banner Images | `/admin/front/banner` |
| Event | `/admin/front/events` |
| Gallery | `/admin/front/gallery` |
| Media Manager | `/admin/front/media` |
| Menus | `/admin/front/menus` |
| News | `/admin/front/notice` |
| Pages | `/admin/front/page` |
| Front CMS Setting | `/admin/frontcms` |
| Phone Call Log | `/admin/generalcall` |
| Generate Certificate | `/admin/generatecertificate` |
| Generate ID Card | `/admin/generateidcard/search` |
| Generate Staff ID Card | `/admin/generatestaffidcard` |
| Live Class Report | `/admin/gmeet/class_report` |
| Setting | `/admin/gmeet/index` |
| Live Meeting | `/admin/gmeet/meeting` |
| Live Meeting Report | `/admin/gmeet/meeting_report` |
| Live Classes | `/admin/gmeet/timetable` |
| Marks Grade | `/admin/grade` |
| Relative Grade | `/admin/grade/relative_Grade` |
| Set Working Days | `/admin/holiday/set_working_days` |
| Set Staff Week Off | `/admin/holiday/staff_week_off` |
| Add Hostel | `/admin/hostel` |
| Assign Room | `/admin/hostel/assign_room` |
| Change Room | `/admin/hostel/change_room` |
| Gatepass List | `/admin/hostel/gatepass_list` |
| Scan qrcode | `/admin/hostel/scan_qrcode` |
| Vacancy Status | `/admin/hostel/vacancy_status` |
| Hostel Rooms | `/admin/hostelroom` |
| Hostel | `/admin/hostelroom/studenthosteldetails` |
| Recruitment | `/admin/hr_recruitment` |
| Add Income | `/admin/income` |
| Search Income | `/admin/income/incomesearch` |
| Income Head | `/admin/incomehead` |
| Inward | `/admin/inward/inward_list` |
| Issue Item | `/admin/issueitem` |
| Add Item | `/admin/item` |
| Item Category | `/admin/itemcategory` |
| Add Item Stock | `/admin/itemstock` |
| Item Store | `/admin/itemstore` |
| Item Supplier | `/admin/itemsupplier` |
| Languages | `/admin/language` |
| Staff Leave Batches | `/admin/leave_batch_years` |
| Approve Leave Request 3 | `/admin/leaverequest/leaverequest` |
| Leave Type | `/admin/leavetypes` |
| Copy Old Lessons | `/admin/lessonplan/copylesson` |
| Instruction Plan | `/admin/lessonplan/instruction_plan` |
| Create Lesson | `/admin/lessonplan/lesson` |
| Topic | `/admin/lessonplan/topic` |
| Other Course Form | `/admin/liberal_art/admissionsetting` |
| Other Course Form | `/admin/liberal_art/liberal_art_report` |
| Other Course Form | `/admin/liberal_art/liberal_art_student` |
| Send Email | `/admin/mailsms/compose` |
| Send SMS | `/admin/mailsms/compose_sms` |
| Email Template | `/admin/mailsms/email_template` |
| Email / SMS Log | `/admin/mailsms/index` |
| Schedule Email SMS Log | `/admin/mailsms/schedule` |
| SMS Template | `/admin/mailsms/sms_template` |
| Marks Division | `/admin/marksdivision` |
| Design Marksheet | `/admin/marksheet` |
| Issue - Return | `/admin/member` |
| Add Student | `/admin/member/student` |
| Add Staff Member | `/admin/member/teacher` |
| Modules | `/admin/module` |
| Setting | `/admin/multibranch/branch` |
| Overview | `/admin/multibranch/branch/overview` |
| Report | `/admin/multibranch/finance/index` |
| View All | `/admin/naac/events` |
| Task Master | `/admin/naac/index` |
| NAAC Dashborad | `/admin/naac/naac_dashboard` |
| NAAC | `/admin/naac/naac_report` |
| NAAC Report | `/admin/naac/naac_report_master` |
| Student Feedback Form | `/admin/naac/student_feedback_list` |
| Student Rating Form | `/admin/naac/student_rating_form` |
| Task Allocation | `/admin/naac/task_allocation` |
| Assignment Submission | `/admin/notification` |
| Notification Setting | `/admin/notification/setting` |
| Offline Bank Payments | `/admin/offlinepayment` |
| Online Admission Setting | `/admin/onlineadmission/admissionsetting` |
| Online Exam | `/admin/onlineexam` |
| Online Examinations | `/admin/onlineexam/report` |
| International Application | `/admin/onlineinternatinaladmission/admissionsetting` |
| Online Application | `/admin/onlinestudent` |
| Verify Others Fees | `/admin/others_fees_verification` |
| Outward | `/admin/outward/outward_list` |
| Questions Paper Creation | `/admin/paper_creation` |
| Assign Staff | `/admin/paper_creation/assign_paper_creation` |
| Questions Paper Approve List | `/admin/paper_creation/que_paper_approval_list` |
| Paper Setting | `/admin/papersetting` |
| Payment Category | `/admin/paymentcategory` |
| Assign Payment Category | `/admin/paymentcategory/assignPaymentCategory` |
| College Other Fees | `/admin/paymentcategory/collegeotherfees` |
| Multi Merchant | `/admin/paymentcategory/multimerchant` |
| Payment Methods | `/admin/paymentsettings` |
| Payroll | `/admin/payroll` |
| Pickup Point | `/admin/pickuppoint` |
| Route Pickup Point | `/admin/pickuppoint/assign` |
| Student Transport Fees | `/admin/pickuppoint/student_fees` |
| Print Header Footer | `/admin/print_headerfooter` |
| Question Bank | `/admin/question` |
| Postal Receive | `/admin/receive` |
| Student Support Topics | `/admin/requisitions` |
| Student Support List | `/admin/requisitions/load_requisition_list` |
| Result Remark | `/admin/result_remark` |
| Download CV | `/admin/resume/download` |
| Build CV | `/admin/resume/index` |
| Revaluation Form | `/admin/revaluation_form/revaluationformsetting` |
| Roles Permissions | `/admin/roles` |
| Room Type | `/admin/roomtype` |
| Routes | `/admin/route` |
| Transport | `/admin/route/studenttransportdetails` |
| Student House | `/admin/schoolhouse` |
| Sidebar Menu | `/admin/sidemenu` |
| Staff Directory | `/admin/staff` |
| Disabled Staff | `/admin/staff/disablestafflist` |
| Apply Leave | `/admin/staff/leaverequest` |
| Profile | `/admin/staff/profile/395` |
| Teachers Rating | `/admin/staff/rating` |
| Bulk Update | `/admin/staff/staff_bulk_update` |
| Staff Certificate | `/admin/staff_certificate` |
| Generate Certificate | `/admin/staff_certificate/staff_generate_certificate` |
| Leave Approval Setup | `/admin/staff_leave_assign` |
| Staff Attendance | `/admin/staffattendance` |
| Staff ID Card | `/admin/staffidcard` |
| Add Pay Element | `/admin/staffpayroll/add_element` |
| Add Income Tax Element | `/admin/staffpayroll/add_income_tax_element` |
| Generate Income Tax | `/admin/staffpayroll/generate_income_tax` |
| Manage Staff Payroll | `/admin/staffpayroll/manage_staff_payroll` |
| Select Pay Element | `/admin/staffpayroll/select_pay_element` |
| Setup Tax Slab | `/admin/staffpayroll/setup_tax_slab` |
| Generate Staff Payroll | `/admin/staffpayroll/staff_payroll` |
| Visiting Staff Payroll | `/admin/staffpayroll/visiting_staff_payroll` |
| Promote Students | `/admin/stdtransfer` |
| Student Attendance | `/admin/stuattendence` |
| Attendance By Date | `/admin/stuattendence/attendencereport` |
| Student Log Update | `/admin/student_log_update` |
| Student ID Card | `/admin/studentidcard` |
| Subjects | `/admin/subject` |
| Period Attendance | `/admin/subjectattendence/index` |
| Period Attendance By Date | `/admin/subjectattendence/reportbydate` |
| Semester | `/admin/subjectgroup` |
| Manage Lesson Plan | `/admin/syllabus` |
| Manage Syllabus Status | `/admin/syllabus/status` |
| System Fields | `/admin/systemfield` |
| Assign Class Teacher | `/admin/teacher/assign_class_teacher` |
| Assign Subject Teacher | `/admin/teacher/assign_subject_teacher` |
| Teachers Research | `/admin/teachers_research/` |
| Class Timetable | `/admin/timetable/classreport` |
| Teachers Timetable | `/admin/timetable/mytimetable` |
| Training & Placements List | `/admin/tnp` |
| Placements Company List | `/admin/tnp/tnp_company_list` |
| Transpot Fee Master | `/admin/transport/feemaster` |
| System Update | `/admin/updater` |
| User Log | `/admin/userlog` |
| Payment Log | `/admin/userlog/paymentLog` |
| Users | `/admin/users` |
| Vehicles | `/admin/vehicle` |
| Assign Vehicle | `/admin/vehroute` |
| Video Tutorial | `/admin/video_tutorial` |
| Visitor Book | `/admin/visitors` |
| Setup Front Office | `/admin/visitorspurpose` |

### `/attendencereports` (1)

| Label | Path |
|---|---|
| Attendance | `/attendencereports/attendance` |

### `/category` (1)

| Label | Path |
|---|---|
| Student Categories | `/category` |

### `/classes` (1)

| Label | Path |
|---|---|
| Class | `/classes` |

### `/course_master` (1)

| Label | Path |
|---|---|
| Program | `/course_master` |

### `/department` (1)

| Label | Path |
|---|---|
| Department | `/department` |

### `/emailconfig` (1)

| Label | Path |
|---|---|
| Email Setting | `/emailconfig` |

### `/feedback` (6)

| Label | Path |
|---|---|
| Assign Form | `/feedback/assign_feedback_form` |
| Add Form | `/feedback/feedback_formname_master` |
| Fill Feedback Form | `/feedback/fill_feedback_form` |
| Field Master | `/feedback/index` |
| Feedback Form | `/feedback/showview_feedback_form` |
| Submitted Form | `/feedback/submitted_forms` |

### `/feedbackreport` (1)

| Label | Path |
|---|---|
| Feedback | `/feedbackreport/index` |

### `/financereports` (1)

| Label | Path |
|---|---|
| Finance | `/financereports/finance` |

### `/homework` (4)

| Label | Path |
|---|---|
| Add Assignment | `/homework` |
| Daily Assignment | `/homework/dailyassignment` |
| Assignment Report | `/homework/evaluation_report` |
| Assignment | `/homework/homeworkordailyassignmentreport` |

### `/onlinecourse` (6)

| Label | Path |
|---|---|
| Online Course | `/onlinecourse/course/index` |
| Setting | `/onlinecourse/course/setting` |
| Course Category | `/onlinecourse/coursecategory/categoryadd` |
| Question Bank | `/onlinecourse/courseexamquestion/index` |
| Online Course Report | `/onlinecourse/coursereport/report` |
| Offline Payment | `/onlinecourse/offlinepayment/payment` |

### `/outcome_basis_education` (1)

| Label | Path |
|---|---|
| Outcome Basis Education | `/outcome_basis_education/index` |

### `/Programintake` (1)

| Label | Path |
|---|---|
| Program Intake | `/Programintake` |

### `/railway_concession` (1)

| Label | Path |
|---|---|
| Railway Concession | `/railway_concession/index` |

### `/report` (13)

| Label | Path |
|---|---|
| Alumni | `/report/alumnireport` |
| Activity Management | `/report/flowmaster_report` |
| Human Resource | `/report/human_resource` |
| Inventory | `/report/inventory` |
| Inward | `/report/inward_report` |
| Lesson Plan | `/report/lesson_plan` |
| Library | `/report/library` |
| Outward | `/report/outward_report` |
| Railway Concession Report | `/report/railway_concession_report` |
| Front Office | `/report/setFrontOfficeReport` |
| Student Information | `/report/studentinformation` |
| Teacher Achievement | `/report/teacherachievement_report` |
| Teacher's Research Publication & Awards | `/report/teacheraward_report` |

### `/roombooking` (3)

| Label | Path |
|---|---|
| Booking System | `/roombooking/roombook` |
| Booking System Request | `/roombooking/roombook/roombookrequest` |
| Booking Request List | `/roombooking/roombook/roombookrequestlist` |

### `/schsettings` (1)

| Label | Path |
|---|---|
| General Setting | `/schsettings` |

### `/seating_arrangement` (3)

| Label | Path |
|---|---|
| Assign Block | `/seating_arrangement/assign_block` |
| Subject Details | `/seating_arrangement/index` |
| Report | `/seating_arrangement/report` |

### `/sections` (1)

| Label | Path |
|---|---|
| Sections | `/sections` |

### `/sectionwise_specialization` (2)

| Label | Path |
|---|---|
| Specialization | `/sectionwise_specialization` |
| Assign Major/Minor | `/sectionwise_specialization/assign_program` |

### `/sessions` (1)

| Label | Path |
|---|---|
| Session Setting | `/sessions` |

### `/site` (1)

| Label | Path |
|---|---|
| Logout | `/site/logout` |

### `/smsconfig` (1)

| Label | Path |
|---|---|
| SMS Setting | `/smsconfig` |

### `/staffpayrollreports` (1)

| Label | Path |
|---|---|
| Staff Payroll | `/staffpayrollreports/staff_payroll` |

### `/stdscholarship` (1)

| Label | Path |
|---|---|
| Scholarship | `/stdscholarship` |

### `/student` (17)

| Label | Path |
|---|---|
| Approve Optional Subject | `/student/approve_optional_course` |
| Assign Optional Subject | `/student/assign_optional_course` |
| Assign Seat Number | `/student/assign_seat_number` |
| Bulk Delete | `/student/bulkdelete` |
| Login Credentials Send | `/student/bulkmail` |
| Bulk Update | `/student/bulkupdate` |
| Student Admission | `/student/create` |
| Disabled Students | `/student/disablestudentslist` |
| Generate Roll Number | `/student/generaterollnumber` |
| Multi Class Student | `/student/multiclass` |
| Student Profile Update | `/student/profilesetting` |
| Student 168 | `/student/search` |
| Semester Allocation | `/student/semester_allocation` |
| Student Bulk Upload | `/student/student_bulk_upload` |
| Student Dashboard | `/student/student_dashboard` |
| Upload Student Documents | `/student/upload_student_documents` |
| Upload Student Photo | `/student/upload_student_photo` |

### `/studentfee` (5)

| Label | Path |
|---|---|
| Collect Fees | `/studentfee` |
| Fee Summary Dashboard | `/studentfee/fee_summary_dashboard` |
| Fee Receipt List | `/studentfee/feereceipt` |
| Search Due Fees | `/studentfee/feesearch` |
| Search Fees Payment | `/studentfee/searchpayment` |

### `/teacherlog` (1)

| Label | Path |
|---|---|
| Task Management | `/teacherlog` |

