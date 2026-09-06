# Human Resource and Payroll

## HR screens

| Screen | Route |
|---|---|
| Staff Directory | `/admin/staff` |
| Disabled Staff | `/admin/staff/disablestafflist` |
| Bulk Update | `/admin/staff/staff_bulk_update` |
| Department | `/admin/department/department` |
| Designation | `/admin/designation/designation` |
| Teachers Rating | `/admin/staff/rating` |
| Teachers Research | `/admin/teachers_research/` |
| Staff Certificate design | `/admin/staff_certificate` |
| Generate Staff Certificate | `/admin/staff_certificate/staff_generate_certificate` |
| Staff ID card | `/admin/staffidcard`, `/admin/generatestaffidcard` |
| Recruitment | `/admin/hr_recruitment` |
| Assign Mentor | `/admin/assign_mentor` |
| Project Approval List | `/admin/assign_mentor/project_approval_list` |
| Project Chapter List | `/admin/assign_mentor/project_chapter_list` |
| OJT / SIP Approval | `/admin/assign_mentor/ojt_approval_list` |
| OJT Details | `/admin/assign_mentor/ojt_details` |

Attendance and leave are in `08-attendance-leave.md`.

## Staff profile (typical + this college)

Employee ID, role, department, designation, joining date, qualification, specialist subjects, email, phone, gender, DOB, address, bank, PAN, Aadhaar, photo, documents, login enabled.

Teachers Rating: students rate teachers (ties to feedback module).

Teachers Research: publications/awards — also has reports under Reports menu.

## Mentoring / OJT (college custom)

Staff assigned as mentor to students.
Students submit project chapters / OJT records → mentor approves.
Keep as a simple approval inbox: entity, submitter, approver, status, file, comment.

## Recruitment

Job posting → applications → shortlist. Can stay MVP as “applicants table” unless HR is the buyer.

## Payroll screens

| Screen | Route |
|---|---|
| Add Pay Element | `/admin/staffpayroll/add_element` |
| Select Pay Element | `/admin/staffpayroll/select_pay_element` |
| Manage Staff Payroll | `/admin/staffpayroll/manage_staff_payroll` |
| Generate Staff Payroll | `/admin/staffpayroll/staff_payroll` |
| Visiting Staff Payroll | `/admin/staffpayroll/visiting_staff_payroll` |
| Add Income Tax Element | `/admin/staffpayroll/add_income_tax_element` |
| Generate Income Tax | `/admin/staffpayroll/generate_income_tax` |
| Setup Tax Slab | `/admin/staffpayroll/setup_tax_slab` |
| Staff Payroll report | `/staffpayrollreports/staff_payroll` |

## Payroll workflow

```
PayElement (Basic, DA, HRA, PF, PT, TDS)
  → attach elements to staff (structure)
      → monthly run (attendance/LWP can reduce)
          → payslip (draft → approved → paid)
              → tax computation against slabs + declarations
```

Visiting staff: hourly/session rates, separate run.

## Rebuild note

Indian payroll (PF, ESI, PT, TDS) is a product by itself. For v1: earnings/deductions + monthly net + PDF payslip. Add statutory only if an accountant client demands it.
