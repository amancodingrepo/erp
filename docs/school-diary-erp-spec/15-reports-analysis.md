# Reports analysis

**Exports were not downloaded.** This tenant holds live student, parent, and fee rows. Excel/PDF download would copy that PII off the school system. Analysis is of **report product design**: filters, variants, export columns.

Hub: `/Reports/Reports` (searchable cards). Shared pattern: filters → **Show** (HTML) → **Export** / **Export To Pdf**.

---

## Report groups on the hub

Accounts (payroll/TDS/PF/ESI/loan/payslip) · Admission/Enquiry · Attendance · Timetable · Daycare · Events · Fees · Library master + library transactions · Performance · Staff · Store · plus transport reports under `/Transport/Reports/*`.

That means an ERP needs data domains even when the sidebar hides them: payroll, library, timetable, store orders.

---

## Fee Reports — `/Reports/FeeReport` (the real builder)

This is not one report. It is a parameterized fee warehouse query.

### Variants (`FeeReport`)

- Paid Fee Report
- Fee Type wise Paid Fee Report
- Datewise Paid Fee Report
- Fee Summary Report
- Fee Accounting Report

### Filters to implement

| Filter | Values / role |
| --- | --- |
| Academic Year | all or one year |
| Grade | multi class |
| Payment Method | Cash, Cheque, Online, Direct to Bank, Card, Debit/Credit Card, NEFT, Loan Grayquest, Credit Note, Bank Transfer, UPI, QR Scan, Wallet, ECS |
| Fee Type | all heads (31 on this school) including Tuition-like installments, Admission, Caution Money, Transport-related, School App, Late Fee For Partial Payments, Daycare, Board Exam, Books, BounceCharges, … |
| From / To Date | payment window |
| Settlement From / To | gateway settlement window |
| Search By Settlement UTR | recon key |
| Updated By | collector staff |
| Sort By | Grade, Child Name, Receipt Number, Paid Date, Payment Method, Installment, Amount |
| In Route | transport route |
| Installment | First, Second, … |
| Hostel | |
| Apply By Student Type | All / template student type |
| Select Payment Gateways | multi (14) |
| Cheque Status | Paid, Bounce, ChequeSubmitted |
| Include School Name And Address | header on print |
| Columns to Export | multi (41 selected by default) |

### Export column catalog (build these fields)

Academic Year, Admission Reference No., Alternate Phone, Amount, Bank Name, Cheque Date, Cheque Number, Cheque Status, Child Name, Due Date, Enrollment Number, External Id, Father Name, Father Phone Number, Fee Template Name, FeesEntryDate, FeeTypes, Grade Name, GRN, Hostel, In Route, LateFee, LateFeeCharges — plus the remaining selected columns in the 41-pack (receipt no., paid date, payment method, installment, mother phone, scholar no., remarks, UTR, gateway, settlement date).

### How to rebuild

One `fee_payments` fact table joined to student, installment, fee heads, route, collector, gateway. Each “report type” is a GROUP BY:

- Paid Fee → one row per payment
- Fee Type wise → group by fee head
- Datewise → group by paid_date
- Summary → totals by class / installment
- Accounting → debit/credit style by head + method

---

## Daily Attendance Report — `/Reports/DailyAttendanceReport`

Filters: Class, Date.  
Actions: Show, Export, **Export Attendance Summary**.

Rebuild: filter `attendance` where date = X [and class = Y]; detail = student × status; summary = counts present/absent/leave/not-taken per class.

Show/Export not clicked.

---

## Other hub reports (same engine, different fact table)

| Domain | Typical grain |
| --- | --- |
| Attendance (class/staff/driver/RFID/period) | person × date × status |
| Present students | students with status=present on date |
| Strength / student lists | student × class × year |
| Performance | student × exam/term × subject marks |
| Library | accession / issue / overdue / fine |
| Store | order × item × status |
| Staff | employee master + missing docs |
| Admission forms | enquiry/application × status |
| Accounts | payslip / TDS / PF / ESI line |

---

## ERP takeaway

Do not clone 80 pages. Build:

1. `report_definition` (name, domain, default columns)
2. `report_filter` (year, class, date range, enums)
3. `report_column` (export checkbox list)
4. One runner: query → HTML → xlsx/pdf

Payment methods and cheque statuses above are required enums for fee reports.
