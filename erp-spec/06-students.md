# Student Information

This is the system of record for every enrolled student.

## Screens

| Screen | Route | Function |
|---|---|---|
| Student Details | `/student/search` | Search + list/detail |
| Student Dashboard | `/student/student_dashboard` | Aggregated stats |
| Student Admission | `/student/create` | Create student |
| Bulk Update | `/student/bulkupdate` | Grid edit category etc. |
| Bulk Upload | `/student/student_bulk_upload` | CSV import |
| Bulk Delete | `/student/bulkdelete` | Dangerous |
| Disabled Students | `/student/disablestudentslist` | Inactive roster |
| Disable Reason | `/admin/disable_reason` | Master |
| Student Categories | `/category` | Category master |
| Student House | `/admin/schoolhouse` | House master |
| Multi Class Student | `/student/multiclass` | Dual class membership |
| Assign Optional Subject | `/student/assign_optional_course` | |
| Approve Optional Subject | `/student/approve_optional_course` | Workflow |
| Semester Allocation | `/student/semester_allocation` | Dept/Program/Class/Semester |
| Generate Roll Number | `/student/generaterollnumber` | Batch roll assign |
| Upload Documents | `/student/upload_student_documents` | |
| Upload Photo | `/student/upload_student_photo` | |
| Railway Concession | `/railway_concession/index` | Indian Rail student pass |
| Online Application | `/admin/onlinestudent` | See admissions |
| Profile update policy | `/student/profilesetting` | Which fields students may edit |

### Search filters (live)

Department, Program, Class, Section, Specialization, Keyword, Year.

List columns: Student ID, Name, Class, Roll, Enrollment No, Father/Spouse, DOB, Gender, Category, Mobile, Action.

Tabs: List View | Details View.

## Create form — fields observed

Identity
- `admission_no` Student ID *
- `roll_no`
- `student_prn` Enrollment No
- `abc_id_number` ABC ID
- `admission_quota`
- `class_id`, `section_id`
- `salutation`, `firstname`, `middlename`, `lastname`
- `name_as_12th`, `nameasper_adharcard`
- `gender`, `dob`, `place_of_birth`
- `category_id`, `religion`, `cast`, `sub_cast`
- `nationality`, `minority`, `domicile_state`
- `fee_category`, `admission_date`, `fees_discount`

Contact
- mobile, email, phone, `allotted_email`

IDs (encrypt)
- `aadhar_number`, `pan_number`

Addresses
- Permanent: line1-3, city, at_post, village, taluka, district, region, state, pincode, nation
- Local: same shape + checkbox “Same as Permanent”

Previous education
- `qualification`, `university`, `university_state_name`, `university_prn`
- marks obtained / total / percentage
- last year class, academic year, roll, exam seat no, result
- `payment_date` (previous / application payment)

International
- passport country/number/issue/expiry
- visa type/number/issue/expiry

Transport / hostel at admission
- `vehroute_id`, `hostel_id`
- fee session group checkboxes `fee_session_group_id[]`
- coursewise fee master hidden ids

Family
- father: name, phone, occupation, photo, email, income, pan
- mother: same
- siblings: class → section → student picker

Bank
- account no, holder name, bank, IFSC, branch, branch address, account type

Media
- student photo, signature, up to 5 titled documents

## Roll number generator (live options)

Class, Section, Specialization, Starting Roll Number,
Arrangement: Mix | First Boys | First Girls,
Sort as: Last Name | First Name | ID.

## Disable / enable

Status change with reason. Disabled list can restore.
Prefer this over delete. Audit both.

## Railway concession (India-specific)

Filters/fields: Class, Section, Enrollment No, Concession No/Date/Type/Class, Station From/To, Status.

Columns also include gender, address, city, mobile.

## Student 360 page (rebuild this even if they split it)

Tabs: Profile, Guardians, Documents, Fees, Attendance, Exams, Timeline, Hostel, Transport, Discipline.

Live “Action” on search rows typically opens profile + sibling actions.

## CSV bulk upload columns (live header)

Student ID *, Salutation, Full Name (12th) *, First Name *, Middle, Last, Roll, Class, Section, Enrollment No, DOB, Birth Place, Email *, Qualification, Mobile *, Phone, Gender, Category, … (30 columns on the sample table).

Validate before insert; show row errors. Do not silently skip.

## Suggested enrollment history

Do not only store `current_class_id` on student.

```
StudentEnrollment
  student_id, session_id, class_id, section_id, specialization_id,
  roll_no, is_current, promoted_from_id
```

All attendance, fees, exams join through enrollment + session.
