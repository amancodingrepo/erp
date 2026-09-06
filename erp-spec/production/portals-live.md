# Portals — LIVE + student 360

## Staff login (already documented)

`POST /site/login` → 303 `/admin/admin/dashboard`  
Fields: username, password, captcha. Error HTML: `Incorrect Captcha`.

## Student / parent login LIVE

`GET/POST /site/userlogin`  
Title: `Login : Govt College junnardeo,Chhindwara`  
Fields: `username`, `password`, `captcha`, `ci_csrf_token`  
Forgot-password link present.  
Unauthenticated `/user/user/dashboard` redirects here.

No student password was extracted (and should not be). Create students with a known invite/reset in your rebuild.

`/admin/users` tabs LIVE: **Staff | Parent | Student**

Student user columns LIVE: Student ID, Student Name, Username, Class, Father's Name/Spouse Name, Student Mobile Number, Action  
Parent columns: Guardian Name, Guardian Phone, Username, Action  
Staff columns: Staff ID, Name, Email, Role, Designation, Department, Phone, Action  

Actions include enable/disable (`/admin/users/changeStatus`) and “Send Student Password” / “Send Parent Password” from the student 360 page.

## Student 360 (staff view) LIVE

`GET /student/view/{studentId}` example `/student/view/213`

Tabs:

- Profile
- Subject
- Documents
- Fees
- Other Fees
- Exam
- Admit Card
- Attendance
- Course Certificate
- Timeline
- Scholarship Details

Header actions: Disable Student, View Admit Card, Send Student Password, Send Parent Password.

This is the staff-side 360. Student self-service should expose a subset: Profile (policy-limited), Fees, Exam, Admit Card, Attendance, Documents, Notices.

## ID map LIVE (do not collapse these)

| Concept | Example | URL |
|---|---|---|
| Student primary id | 213 | `/student/view/213` |
| Student session / enrollment id | 215 | `/studentfee/addfee/215` |
| Admission number | 1422165 | shown as Student ID in lists |
| Exam roster id | 183 | `exam_group_class_batch_exam_student_id` |
| Exam subject id | 227 | General Medicine |
| Exam group id | 3 | REGULAR (OBE - 2025) |
| Exam id | 10 | child of group 3 |
| Session id | 21 | current exam session |
| Class id | 1 | FY BPT |
| Class id | 28 | FY BCA (Co Ed) B |
| Section id | 34 | A of class 28 |

Your schema already separates `Student.id` and `StudentEnrollment.id`. Keep it that way.
