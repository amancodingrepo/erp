# School ERP Feature Map

Read-only product inventory of the School Diary web dashboard (`https://in.schooldiary.me/`), captured in **Branch Admin** context after switching role from Org Admin. No school data was created, edited, posted, deleted, or exported.

Use this pack as a **feature and information-architecture spec** for your own ERP. Do not copy proprietary UI assets, copy, logos, or source. Rebuild modules independently.

## Files

| File | Contents |
| --- | --- |
Spec pack (copied into this repo): [`docs/school-diary-erp-spec/`](docs/school-diary-erp-spec/). Gap vs this ERP: [`docs/school-diary-gap.md`](docs/school-diary-gap.md).

| [00-FULL-APPLICATION-SPEC.md](docs/school-diary-erp-spec/00-FULL-APPLICATION-SPEC.md) | Rebuild blueprint: tenancy, roles, routes, features, API, build order |
| [01-overview.md](01-overview.md) | Product shape, tenancy, tech surface, IA |
| [02-auth-roles.md](02-auth-roles.md) | Login, role switching, session variants |
| [03-branch-admin-modules.md](03-branch-admin-modules.md) | Every Branch Admin sidebar module and what it does |
| [04-org-admin-modules.md](04-org-admin-modules.md) | Org Admin-only modules seen before role switch |
| [05-routes-catalog.md](05-routes-catalog.md) | URL inventory grouped by domain |
| [06-reports-catalog.md](06-reports-catalog.md) | Full Reports hub + Transport reports |
| [07-erp-domain-model.md](07-erp-domain-model.md) | Suggested domains, entities, and build order for your ERP |
| [08-student-data-fields.md](08-student-data-fields.md) | Full student + parent + fee + daycare + transport + immunization + admission-form field catalog |
| [09-masters-staff-transport-fields.md](09-masters-staff-transport-fields.md) | Staff, driver, class, subject, year, house, fee masters, late fee, questionnaires, bus, route, store |
| [10-build-checklist.md](10-build-checklist.md) | Implementation backlog + pages opened without saving |
| [11-my-branch-every-link.md](11-my-branch-every-link.md) | Every My Branch hub link: route, fields, and what the screen does |
| [12-student-edit-and-fee-ledger.md](12-student-edit-and-fee-ledger.md) | Edit contact details page: all tabs + student/fee DB columns |
| [13-messages.md](13-messages.md) | Messages/Requests: composer, Inbox/Sent, filters, schedule, SMS |
| [14-ops-pages.md](14-ops-pages.md) | Contacts, Fees desk, Attendance, Day Care, Search, Performance, Enquiry forms, Events |
| [15-reports-analysis.md](15-reports-analysis.md) | Report engine analysis (filters/columns). Live Excel was not downloaded |
| [16-notice-board.md](16-notice-board.md) | Notice Board channels, types (incl. class homework), composer, read receipts |
| [17-backend-contract.md](17-backend-contract.md) | Backend to implement: tables, REST, invariants, permissions — your UI on top |

## Student profile fields (summary)

Visited read-only:

- `/Admin/Admission` (Admit New Student)
- `/Admin/Admission/Edit/{id}` (Edit contact details)
- `/Admin/ManageBranch/Users` (Manage Students)
- `/AdmissionForm/Create/{id}` (Admission Information)

Full tables, option lists, and a suggested SQL-style schema are in [08-student-data-fields.md](08-student-data-fields.md).

### Student

Name (First / Middle / Last)*, DOB*, Gender*, Academic Year*, Class*, Enrollment Date, Enrollment No., Roll Number, House, Lunch From School, Photo.

Aadhar, Jan Aadhar, Scholar Number, SSSM Id, PEN, APAAR Id, GRN, Saral Id.

Religion, Category, Caste, Blood Group, Disability (multi), RTE Student, Nationality, Admitted Class, Annual Income, Is Only Child.

### Parent / guardian

Login Method (Phone / Email), Email, Password*, Primary Parent relation* (Mother / Father / Guardian), Mother / Father / Guardian names, Phone*, Alternate Phone + relation, Parent DOB, Address (Street, City, State, Zip, Country).

### Nested tabs on the profile

- **Fees:** totals, amount to pay, late fee include, template apply, installment summary, payment instrument fields
- **Day Care:** enrolled Yes/No, check-in / check-out, Allow CCTV
- **Transport:** In Route + Stop, Out Route + Stop
- **Immunization Schedule:** vaccination name, schedule date, administered date, remarks, status, image

### Fees tab vs Installmentwise Fee Summary

Opened `/Admin/Admission/Edit/{id}` tabs `#tab-fees` and `#tab-fees-summary`. Save / Pay / Refund / Reminder were not used. Live amounts are not stored here.

**Account totals (per student + academic year):** `total_fees`, `total_paid`, `total_unpaid` where unpaid = fees − paid.

**Installment row (Fees tab — editable ledger):** checkbox, installment name, fee type(s), sub_amount, discount, late_fee, total_amount, paid_amount, notes, due_date, status (`Paid`/`Unpaid`), paid_date.

`total_amount ≈ sub_amount − discount + late_fee`.

**Summary tab (read model):** installment, fee types, amount, discount, applied_taxes, paid_amount, late_fee, unpaid_amount.

**Fee actions:** Apply Fee Template, Fee Reminder, Pay Now / Pay Partial / Pay Amount, Refund, Add Fees Notes, export paid/due/details, add row (`+`), receipt download/view on paid rows.

**Fee heads used as types:** Tuition, Transport, Admission, Caution Money, School App Fees.

Full column list and suggested tables: [12-student-edit-and-fee-ledger.md](12-student-edit-and-fee-ledger.md).

### Extra on Admission Information form

Form Number, Enquiry Date / Status, DOB in words, emergency contact, previous school + UDISE + marksheet, Family SSSM ID, Mother Tongue, Minority, permanent/current/office address, transport required + bus no., sports, achievements, document uploads.

### List-level student flags / actions

Active / Inactive, defaulter, RFID map, siblings, user remark, deactivate child or parent login, download docs, fee details, reset parent password.

### Messages (`/messages`, title: Requests)

Opened Inbox and Sent. **Post / Delete / Search / SMS were not used.** Message bodies are not copied here.

- Composer: body, attach file, schedule (Deliver By), pick recipients (person, student, or category). Optional SMS (informational only).
- Folders: Inbox, Sent (empty for this admin), More → Unseen, Scheduled.
- Live typeahead + **Filter** modal:

| Filter | Name |
| --- | --- |
| First / Last Name | `RecipientFirstName`, `RecipientLastName` |
| Message contains | `TextMessage` |
| Hash Tag | `HashTag` |
| Class | `GradeId` |
| Category | Fees, Transport, Academics, Uniforms, Library, Others |
| Status | Open, Closed |
| From / To Date | `dd-MMM-yyyy` |

Inbox row: parent (child – class) → staff, preview, relative time. Ticket status Open/Closed. Details in [13-messages.md](13-messages.md).

## Scope notes

- Explored as **Branch Admin → Annie Besant School**.
- Org Admin sidebar was recorded first, then role was switched via the top-right dropdown (`Change Role/School`).
- Student names, parent messages, phone numbers, emails, and fee amounts are **not** documented here.
- Some pages are empty at this school (Day Care, current-year admission forms, some performance templates). Those modules still exist in the product.
- Mixed stack: classic ASP.NET MVC views, Angular (`/ng/...`), React (`/React/Dashboard`).

## Vendor

School Diary is a product of **uFony Services Pvt. Ltd.** Footer links: Terms, FAQ, Contact Us.
