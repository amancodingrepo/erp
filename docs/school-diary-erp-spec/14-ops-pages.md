# Operational sidebar pages

Read-only pass. No Save, Post, Pay, Reminder, Enroll, Add New, or attendance mark.

---

## Contacts — `/Contacts`

Directory + broadcast audiences.

Left: Academic year, **Broadcast List** (Admin & All Teachers, All Contacts, All Classes), class list with class filter.

Top: Filter typeahead, gender select, **Create New Broadcast List**, **Export**.

Row: photo, name, designation, email, phone, last seen, **Edit**, deactivate, **Fee Details**.

Function: pick an audience, multi-select people, export or jump to fees. Broadcast lists are reusable recipient sets for notices/messages.

---

## Manage Fees — `/Fees`

Class-level fee desk (not the student-edit ledger).

Filters: Academic Year, Class.

Columns: Student Name, Total Fees, Paid Fees, Next Payment Date, **Pay / Edit**.

Not clicked:

- Send Fee Reminder to All Classes
- Fee Reminder (current class)
- Pay / Edit

**Select menu:** Configure Late Fee Charges, Deposit Slips, Reverse Payment, Bulk Fee Payment.

**Reports menu:** Cheque Submitted, Fee Reports, Fees Due, Fees Concession, Fees Payable, Paid Fee & Admission Fee, Routewise Fees Payable, Fee Ledger, Download Fee Receipts.

---

## Attendance — `/attendance`

Tabs: **Class Attendance** | **Teacher Attendance** | **Staff Attendance**.

Month calendar + class multi-select chips (All Classes or specific sections). Nav: Prev / Today / Next. View: Month | Day.

Marking a day was not opened (would write data). Build: one attendance row per person per date with status present/absent/leave/holiday/not-taken; separate books for student vs teacher vs staff.

---

## Attendance Dashboard — `/ng/orgadmin-dash/organization`

Angular KPI app. This session stayed on a spinner (title: Orgadmin Dashboard). Treat as charts over the attendance table: % present, not-taken classes, trends. Do not depend on this URL staying Branch-Admin friendly.

---

## Day Care — `/daycare`

Empty: “You do not have any students enrolled in day care. Enroll students.”

Enrollment itself is the Day Care tab on student edit (`is_daycare`, check-in/out, CCTV). This page is the daily check-in roster once anyone is enrolled. Enroll link not clicked.

---

## Search Users — `/SearchUsers`

Lookup form (Search not submitted):

| Field |
| --- |
| Email (full or partial) |
| Phone |
| First / Middle / Last Name |
| Scholar Number / Enrollment Number |
| Exact Search checkbox |

Buttons: **Search**, **Search and Navigate to Fees**.

---

## Performance Report — `/StudentPerformance`

Filters: Academic Year, Class.  
“Performance report template is not assigned to selected class.”

Actions present: **Update Co-scholastic Details** (individual + BULK), Reports dropdown.

Depends on `/PerformanceReports/Template` assigned to the class via Manage Classes.

---

## Admission / Enquiry Form — `/AdmissionForm`

Title: Manage Open Admission/Enquiry Forms.

- Academic Year
- Include Hidden Admission Forms
- ADD NEW (creates a live form window — not clicked)
- EDIT FORM TEMPLATE
- SELECT menu: Update Terms & Conditions, Download Empty Enquiry Form, Download Empty Admission Form, Download Admission Form Documents, Get Organization Branches Enquiry Form, Go to Enquiry Form

This year had no open forms listed.

---

## Events — `/events/Monthly`

Month grid, Prev / Today / Next, Month | Day. Class chips exist for scoping. No event was created.
