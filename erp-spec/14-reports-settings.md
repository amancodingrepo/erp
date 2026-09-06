# Reports and system settings

## Reports menu (live entry points)

These pages are filter forms that then render HTML tables + DataTables export.

| Report hub | Route |
|---|---|
| Student Information | `/report/studentinformation` |
| Front Office | `/report/setFrontOfficeReport` |
| Activity Management | `/report/flowmaster_report` |
| Inward / Outward | `/report/inward_report`, `/report/outward_report` |
| Teacher Achievement | `/report/teacherachievement_report` |
| Teacher Research / Awards | `/report/teacheraward_report` |
| Railway Concession | `/report/railway_concession_report` |
| Staff Payroll | `/staffpayrollreports/staff_payroll` |
| Outcome Basis Education | `/outcome_basis_education/index` |
| Finance | `/financereports/finance` |
| Attendance | `/attendencereports/attendance` |
| Examinations | `/admin/examresult/examinations` |
| Online Examinations | `/admin/onlineexam/report` |
| Lesson Plan | `/report/lesson_plan` |
| Human Resource | `/report/human_resource` |
| Library | `/report/library` |
| Inventory | `/report/inventory` |
| Other Course Form | `/admin/liberal_art/liberal_art_report` |
| ATKT Form | `/admin/atkt_form/atkt_form_report` |
| Transport | `/admin/route/studenttransportdetails` |
| Hostel | `/admin/hostelroom/studenthosteldetails` |
| Alumni | `/report/alumnireport` |
| Payment Log | `/admin/userlog/paymentLog` |
| User Log | `/admin/userlog` |
| Student Log Update | `/admin/staff` wait — `/admin/student_log_update` |
| Audit Trail | `/admin/audit` |
| Feedback | `/feedbackreport/index` |
| NAAC | `/admin/naac/naac_report` |

Finance hub typically includes: collection summary, income, expense, balance fees, fee statement.

Attendance hub: monthly register, class percent.

Student hub: class list, gender/category, sibling, guardian, admission report, alumni.

### Rebuild approach

Do not create 148 hard-coded PHP views. Build:

- Saved report definitions (SQL or query builder + columns)
- Standard exports (CSV / XLSX / PDF)
- 15–20 first-class reports that match sales demos

## System settings

| Screen | Route | Why it exists |
|---|---|---|
| General Setting | `/schsettings` | Name, logo, address, phone, timezone, currency, attendance type |
| Session Setting | `/sessions` | Academic years + current flag |
| Manage Attributes | `/admin/attributes/index` | Extra dropdown masters |
| Notification Setting | `/admin/notification/setting` | Event → SMS/email on/off |
| SMS Setting | `/smsconfig` | Gateway creds |
| Email Setting | `/emailconfig` | SMTP |
| Payment Methods | `/admin/paymentsettings` | Razorpay/PayU/etc |
| Print Header Footer | `/admin/print_headerfooter` | Letterhead |
| Front CMS Setting | `/admin/frontcms` | Public theme |
| Roles Permissions | `/admin/roles` | RBAC |
| Backup Restore | `/admin/admin/backup` | SQL dump |
| Languages | `/admin/language` | i18n |
| Currency | `/admin/currency` | |
| Users | `/admin/users` | Enable logins |
| Modules | `/admin/module` | Feature flags |
| Custom Fields | `/admin/customfield` | Extra columns on student/staff |
| Captcha Setting | `/admin/captcha` | |
| System Fields | `/admin/systemfield` | Show/hide built-in fields |
| Student Profile Update | `/student/profilesetting` | Self-service field policy |
| Form settings | ATKT / revaluation / online admission / liberal art | Open-close windows, fees |
| File Types | `/admin/admin/filetype` | Upload allowlist |
| Sidebar Menu | `/admin/sidemenu` | IA editor |
| System Update | `/admin/updater` | Vendor updater — you will not copy this |
| Multi Merchant / Payment Category | `/admin/paymentcategory*` | Split settlements |
| Batch Setting | `/admin/batch_settings` | Batch/year codes |
| Staff Leave Batches | `/admin/leave_batch_years` | |

Custom fields on student create already appeared as `custom_fields[students][83]`.

System fields let a college hide “Passport” or “Hostel” without code.

## General settings you must have on day 1

- Institute name, short name, logo, favicon
- Address, phone, email
- Current session
- Attendance mode: day-wise vs period-wise
- Date format, timezone, currency
- Start of week
- Upload limits
