# Permission catalog

Format: `module.feature.action`

Seed these rows. SuperAdmin gets all. Other roles get the packs below.

## Modules (align with live sidebar groups)

`dashboard` `admission` `students` `fees` `attendance` `academics` `exams` `online_exams` `lesson_plan` `homework` `hr` `payroll` `front_office` `cms` `communicate` `library` `hostel` `transport` `inventory` `canteen` `booking` `alumni` `naac` `copo` `feedback` `tnp` `reports` `settings`

## Actions

`view` `create` `edit` `delete` `export` `approve` `collect` `publish` `import`

## Critical grants

| Feature | Permission | Teacher | Accountant | Registrar | Principal |
|---|---|---|---|---|---|
| Student search | students.profile.view | Y | Y | Y | Y |
| Student create | students.profile.create | | | Y | Y |
| Student edit | students.profile.edit | | | Y | Y |
| Disable student | students.profile.delete | | | Y | Y |
| Collect fees | fees.collect.collect | | Y | | Y |
| Fee master | fees.master.edit | | Y | | Y |
| Mark attendance | attendance.student.edit | Y | | Y | Y |
| Approve student leave | attendance.leave.approve | Y | | Y | Y |
| Mark entry | exams.marks.edit | Y | | | Y |
| Finalize / publish | exams.results.publish | | | | Y |
| Block result | exams.results.approve | | | | Y |
| Roles | settings.roles.edit | | | | Super only |
| Backup | settings.backup.edit | | | | Super only |

Exam group LIVE also has a per-group access checklist (`exam_group_access[]`) for named roles. Implement as extra ACL on `ExamGroup` if a tenant needs exam-level isolation.

## Middleware

```
requirePermission("fees.collect.collect")
```

Deny with 403 and audit. UI hides the nav item when `view` is missing (`/admin/sidemenu` + `/admin/module` + role grants).
