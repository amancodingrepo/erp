# Attendance and leave

## Student attendance

| Screen | Route |
|---|---|
| Student Attendance | `/admin/stuattendence` |
| Attendance By Date | `/admin/stuattendence/attendencereport` |
| Approve Leave | `/admin/approve_leave` |
| Subject attendance (if enabled) | `/admin/subjectattendence` |

### Marking flow

1. Pick class, section, date (and subject if period-wise)
2. Roster loads with yesterday’s default
3. Mark P / A / L (late) / F (half day) / H (holiday)
4. Save. Optional SMS to absentees.

Working days calendar drives which dates are markable (`/admin/holiday/set_working_days`).

### Reports

Entry: `/attendencereports/attendance` — student monthly register, class percent, absentee list.

## Staff attendance

`/admin/staffattendance`

Daily present/absent/late/half + in/out time. Biometric import exists in upstream product (addon); treat as CSV/device webhook.

## Student leave

Student/parent applies → teacher/admin approves (`/admin/approve_leave`). Approved leave should auto-code attendance as L or not-absent depending on policy.

## Staff leave

| Screen | Route |
|---|---|
| Leave Type | `/admin/leavetypes` |
| Apply Leave | `/admin/staff/leaverequest` |
| Approve Leave Request | `/admin/leaverequest/leaverequest` |
| Leave Approval Setup | `/admin/staff_leave_assign` |
| Staff Leave Batches | `/admin/leave_batch_years` |

Leave types: CL, EL, ML, LWP — each with yearly entitlement, stackable or not, requires document or not.

Approval setup maps role/department → approver. Multi-level: HOD then Principal.

## Rebuild rules

- One row per student per date per scope (daily **or** subject-period, not both mixed without a setting).
- Lock attendance after N days except privileged role.
- Holiday rows should not count in “present %” denominator — or should, based on a setting. Expose the setting.
- Percent = present / (working days − exempt).
