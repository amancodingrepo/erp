# Auth, roles, permissions

## Live portals

### Staff
- GET `/site/login`
- POST `/site/login` → 303 `/admin/admin/dashboard`
- GET `/site/forgotpassword`
- GET `/site/logout`
- Change password `/admin/admin/changepass`
- Own profile `/admin/staff/profile/{staffId}`

### Student / parent
- GET `/site/userlogin`
- Student home `/user/user/dashboard`
- Parent home `/parent/parents/dashboard`

### Applicant
- `/online_admission`
- `/welcome/loginAplication`
- Guest course signup POST `/course/guestsignup`

## Built-in roles (product)

| Role | Typical access |
|---|---|
| SuperAdmin | Everything including modules, roles, backup, updater |
| Admin | College operations except some system switches |
| Teacher | Attendance, homework, lesson plan, mark entry, own timetable |
| Accountant | Fees, income, expense, fee reports |
| Librarian | Books, issue/return, members |
| Receptionist | Enquiry, visitors, postal, complaints |
| Student | Own profile, fees, timetable, homework, exam, library |
| Parent | Children switcher: fees, attendance, exam, notice |
| Custom roles | `/admin/roles` — clone and tick permissions |

Users list / enable-disable login: `/admin/users`

## Permission model to copy

Matrix:

```
Role
  └── Module (Students, Fees, Examinations, ...)
        └── Feature (Student Details, Collect Fees, Mark Entry, ...)
              └── Actions: can_view, can_add, can_edit, can_delete
```

Plus global **module enabled** flag (`/admin/module`). If a module is off, it disappears from all panels even if the role has ticks.

Sidebar itself is configurable: `/admin/sidemenu` (labels, order, hide).

## Suggested tables

```
users                id, email, username, password_hash, actor_type, is_active, last_login_at
staff                user_id, employee_id, department_id, designation_id, ...
students             user_id, admission_no, ...
guardians            user_id, ...
student_guardians    student_id, guardian_id, relation
roles                id, name, is_system
user_roles           user_id, role_id, campus_id
permissions          id, module, feature, action
role_permissions     role_id, permission_id
```

`actor_type`: `staff | student | guardian | applicant`

## Security requirements for your rebuild

- Argon2id / bcrypt passwords
- Captcha or better: email OTP + rate limit (their captcha is weak image text)
- CSRF on cookie session **or** bearer tokens for API
- Audit log (`/admin/audit` exists) — who changed marks, fees, student profile
- User log (`/admin/userlog`) and payment log (`/admin/userlog/paymentLog`)
- File-type allowlist
- Do not store raw Aadhaar/PAN unencrypted; live form has those fields

## Staff leave + approval is part of authz

Leave types `/admin/leavetypes`
Apply `/admin/staff/leaverequest`
Approve `/admin/leaverequest/leaverequest`
Approval routing `/admin/staff_leave_assign`
Leave batches `/admin/leave_batch_years`

Treat approval chains as a generic workflow engine; they reuse it for OJT/project mentor approvals too.
