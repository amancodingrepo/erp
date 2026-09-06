# Enums and masters (LIVE where noted)

## Program type LIVE
`Undergraduate` | `Postgraduate`

## Class year LIVE
`1 (First Year)` | `2` | `3` | `4`

## Exam type LIVE
- General Purpose (Pass/Fail)
- School Based Grading System
- College Based Grading System
- GPA Grading System
- Average Passing

## Exam group kind LIVE
`Regular` | `ATKT`

## Custom field belongs-to LIVE
`Student` | `Staff` | `Liberal Art` | `Admission Documents`

## Custom field types LIVE
Input, Number, Textarea, Dropdown, Multi Select, Checkbox, Date Picker, Datetime Picker, Color Picker, Hyperlink, Radio

## Discount type LIVE
Percentage | Fix Amount  
Fields: `percentage`, `amount`, `code`, `description`

## Roles seen as exam-group access LIVE
Admin, Teacher, Accountant, Librarian, Receptionist, Principal, HOD, Super_Admin, Hostel Warden, Fee Admin, Test User, Univ user, Institute User, Advisor, Guest, TC Incharge, MCNUJC COE, Moderator

Seed at least the first eight as system roles. The rest are tenant-defined.

## Fee types present on this tenant LIVE
Admission Fee, Term Fee, Tution Fee, Portal Substrucation Fee, Student Welfare Fund, Practical Fee, Project Fee, NCC Fund, Gymkhana Fee, Thesis Fee, Alumni Membership Fee, Caution Money, Examination, Registration/Enrollment, Amenities, Hostel Establishment, Hostel Seat Rent, Medical Fee, Institute Development Fund, Testfee, Optional, Tuition Fee BCA (Co Ed), Tution Fee B.Sc

Treat these as **data**, not enums. `FeeType` table.

## Attendance status STANDARD
`PRESENT` `ABSENT` `LATE` `HALFDAY` `HOLIDAY` `LEAVE`

## Payment method STANDARD
`CASH` `CHEQUE` `DD` `BANK_TRANSFER` `UPI` `CARD` `GATEWAY` `SCHOLARSHIP` `WAIVER`

## Student status STANDARD
`ACTIVE` `DISABLED` `ALUMNI` `TRANSFERRED`

## Invoice / line status STANDARD
`DUE` `PARTIAL` `PAID` `CANCELLED` `CARRIED_FORWARD`

## Settings fields LIVE (`/schsettings`)
- sch_name, sch_dise_code (Institute Code), sch_address, sch_phone, sch_email
- sch_session_id, sch_start_month, sch_date_format, sch_timezone, sch_start_week
- currency_format, currency_place (Before Number / After Number)
- base_url, folder_path (File Upload Path)

## Session fields LIVE
session, session_code, sequence_no, status
