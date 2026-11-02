# Overview

## What the product is

School Diary is a multi-tenant K–12 school operations + parent communication platform. One login can attach to multiple **organizations**, **branches**, and **roles**. The web app is the admin/staff console; parents primarily use the mobile apps.

The India tenant lives at `https://in.schooldiary.me/`.

## Tenancy model (observed)

```
Organization (school group / trust)
  └── School Branch (campus)
        └── Academic Year
              ├── Classes / Sections (Grade + section letter)
              ├── Channels (notice boards: school / class / route / daycare / all-teachers)
              ├── Students + Parents
              ├── Staff + Drivers
              ├── Fees, Attendance, Transport, Store, Library, ...
```

IDs in query strings are large integers (snowflake-style), for example:

- `schoolBranchId`
- `channelId`
- `academicYearId`
- `channelMessageId`
- role-variant `id` on `/login/Variant?id=`

## Global chrome (every Branch Admin page)

- Top bar: product name, **current branch title**, user menu.
- Left sidebar: module navigation (role-dependent).
- School logo panel above the sidebar.
- User menu:
  - Profile (`/user/Profile`)
  - Change Password (`/user/Password`)
  - Change Role/School (list of OrgAdmin / BranchAdmin variants)
  - Log Out (`/login/LogOff/English`)
- Almost every operational list is **academic-year scoped**.
- Recurring UX patterns: Filter + typeahead, Export, Prev/Today/Next + Month/Day calendars.

## Information architecture — Branch Admin sidebar

1. Notice Board
2. Events
3. Messages
4. My Branch
5. Contacts
6. Fees
7. Attendance
8. Attendance Dashboard
9. Day Care
10. Search Users
11. Performance Report
12. Reports
13. Admission/Enquiry Form
14. Transport
15. Questionnaires
16. Manage Store
17. Store Vendor

## Information architecture — Org Admin sidebar (before switch)

1. Notice Board
2. Dashboard
3. Events
4. Messages
5. Attendance
6. School Branches
7. Reports
8. Process Order
9. School Branch Reports
10. Manage Corporates
11. Store Vendor

Org Admin Notice Board adds a **branch picker** and a **class list for the selected branch**. Branch Admin Notice Board is scoped to the current campus and adds composer + class/route boards.

## Cross-cutting concepts to copy in an ERP

| Concept | Why it matters |
| --- | --- |
| Role variants on one user | Principal can be Org Admin of school A and Branch Admin of school A and B |
| Academic year as a first-class filter | Fees, attendance, classes, notices all key off year |
| Channels | One posting engine, many audiences (whole school, one class, bus route, daycare, all teachers) |
| View receipts on notices | “N Views / Export Views / Export Not Viewed” |
| Broadcast lists | Saved recipient groups for contacts/messages |
| Houses | Secondary grouping besides class (sports/house system) |
| Fee template → class application → student ledger → installment → payment / reverse / reminder | Core fee pipeline |
| Promotion workflows | Change class mid-year, promote to next year, promote to alumni |
| GPS transport as a sub-app | Separate dashboard, buses, staff, routes, live map, compliance docs |
