# Admissions

Two parallel pipes exist in the live ERP:

1. **Staff-driven college admission module** (merit / cutoff) — custom MP layer
2. **Online application + Student Admission form** — Smart School core + extra India fields

## A. College admission (merit)

| Screen | Route |
|---|---|
| Admission dashboard | `/admin/admission/admission_dashboard` |
| Cutoff setup | `/admin/admission/cutofflist` |
| Import applicants | `/admin/admission/importapplication` |
| Generate merit list | `/admin/admission/generatemeritlist` |
| Manage admission | `/admin/admission/manageadmission` |
| Selection status report | `/admin/admission/selection_status_report` |
| Summarized report | `/admin/admission/summary_report` |
| Admission report | `/admin/admission/report` |
| Transfer / cancellation | `/admin/admission_transfer_cancellation/transfer_cancellation_list` |
| Online admission settings | `/admin/onlineadmission/admissionsetting` |
| International application settings | `/admin/onlineinternatinaladmission/admissionsetting` |

Dashboard filters observed: **Courses**, **Round**.

Generate merit filters: Courses, Session, Cutoff Round Number.

Manage admission: Change Selection, Download Cutoff List, Select Selection.

### Admission report columns (live)

Course, Admission Year, Program Type, Cutoff Round, Application Number, Full Name, Contact Phone, Contact Email, Date Of Birth, Gender, Religion, Category, Nationality, Domicile, Father name, Mother Name, ABC ID Number, Specialization.

Other filters: Merit List, Select Year, Selection Status, Nationality, Category, Gender, Domicile, Group B.

### State machine

```
imported/applied
    → merit_generated (ranked in a list for course+round)
        → selected / waitlisted / rejected
            → fee_paid
                → enrolled (Student record created)
                    → cancelled / transferred
```

Cutoff: category-wise minimum score per course per round (General / OBC / SC / ST / EWS / etc.).

Import: CSV of applicants (`Select CSV File`).

## B. Front-office enquiry (pre-admission CRM)

`/admin/enquiry` — walk-in or phone leads before they become applicants.

Typical fields (Smart School enquiry): name, contact, email, address, reference, source, class interested, date, follow-up date, remarks, status (unassigned / assigned / won / lost).

Setup masters: `/admin/visitorspurpose` also holds source / reference / complaint types.

## C. Online application inbox

`/admin/onlinestudent`

Columns live: Reference No, Student Name, Father's Name/Spouse Name, DOB, Gender, Category, Student Mobile, Program, Payment Status, Enrolled, Created At, Action.

Action: review → collect application fee → **Enroll** (creates Student).

Public form: `/online_admission`.

## D. Direct staff admission

`/student/create` — registrar types a student in. Full field list is in `06-students.md`.

Also: Other Course / Liberal Arts form `/admin/liberal_art/liberal_art_student` (reference no, course, program, year, form status, amount).

## Rebuild MVP

1. Application entity + public form + payment status
2. Manual enroll from application
3. Enquiry CRM
4. Then merit/cutoff if the client is a public university

Merit generation is a batch job, not a page POST that blocks.
