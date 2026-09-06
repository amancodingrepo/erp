# Fees Collection

Highest-complexity finance module. Get this model right before writing UI.

## Screens

| Screen | Route |
|---|---|
| Collect Fees | `/studentfee` |
| Fee Receipt List | `/studentfee/feereceipt` |
| Fee Summary Dashboard | `/studentfee/fee_summary_dashboard` |
| Search Fees Payment | `/studentfee/searchpayment` |
| Search Due Fees | `/studentfee/feesearch` |
| Fees Master | `/admin/feemaster` |
| Assign Fee Master (course-wise) | `/admin/feemastercoursewise` |
| Fees Group | `/admin/feegroup` |
| Fees Type | `/admin/feetype` |
| Fees Type Group | `/admin/fees_type_group` |
| Fees Discount | `/admin/feediscount` |
| Fees Carry Forward | `/admin/feesforward` |
| Fees Installment | `/admin/fees_installment` |
| Fees Fine Rules | `/admin/fine_rules` |
| Assign Variable Fees | `/admin/assign_variable_fees` |
| Fee Receipt Import | `/admin/fee_receipt_import` |
| Offline Bank Payments | `/admin/offlinepayment` |
| Fees Reminder | `/admin/feereminder/setting` |
| Scholarship | `/stdscholarship` |
| College Other Fees | `/admin/paymentcategory/collegeotherfees` |
| Payment category / multi-merchant | `/admin/paymentcategory`, `/assignPaymentCategory`, `/multimerchant` |
| Payment methods | `/admin/paymentsettings` |

## Configuration order (must follow)

```
FeeType          "Tuition", "Exam", "Library", "Lab", "Bus Apr"
     ↓
FeeGroup         "FY BCom Regular", "Hostel Block A"
     ↓  (Fees Type Group)
FeeMaster        session + group + due date + amount
     ↓
Assign to class/program   (feemastercoursewise)
     ↓
Student inherits invoices at admission or via assign
     ↓
Collect / gateway / offline bank / import receipt
```

**FeeType and FeeGroup are session-agnostic. FeeMaster is per session.**

## Collect Fees UX

1. Search student (admission no / name / class)
2. Show invoice lines for current session (+ carry-forward dues)
3. Each line: amount, paid, discount, fine, balance
4. Cashier enters: date, pay amount (partial allowed), discount group or manual discount, fine, mode (cash/cheque/DD/UPI/gateway), note
5. Save → receipt number → print

Modes in similar products: Cash, Cheque, DD, Bank transfer, Card, UPI, Online gateway.

## Fine rules

Slabs by days-late → fixed or percent of remaining. Computed at collect time, overridable.

## Discounts

Named groups (sibling, staff-ward, scholarship, early-bird). Attach to student or to payment line.

Scholarship module is a first-class grant that credits the invoice.

## Installments

Split a master amount into dated installments. Collect Fees then shows installment lines instead of one lump.

## Variable fees

One-off or student-specific charges not in the class master (breakage, repeat exam, form fee). `/admin/assign_variable_fees`.

## Carry forward

At session close, unpaid balance becomes an opening line in the next session (`/admin/feesforward`).

## Offline bank payments

Student pays in bank; college uploads/approves reference. Status: pending → verified → posted to invoice.

Receipt import: CSV of already-issued receipts (migration / bank MIS).

## Reminders

`/admin/feereminder/setting` — schedule SMS/email to due students using templates (`/admin/mailsms/sms_template`).

## Other fees + multi-merchant

Some heads go to different bank accounts (university share vs college share). Payment category maps fee heads → merchant/gateway credentials.

## Accounting side

Income module (`/admin/income` + heads) is **non-student income** (grant, rent, donation).
Expense module is cash-out.

Fee collection should also post a ledger entry if you want real books:

```
Dr  Cash/Bank     10000
    Cr  Tuition         8000
    Cr  Exam fee        2000
```

Live product is more of a fee tracker than a full accounting suite.

## Receipt

Must be immutable after issue. Cancellation = contra entry, never edit amount.

Print uses `/admin/print_headerfooter` letterhead.

## Reports to implement

- Daily collection
- Head-wise collection
- Class-wise outstanding
- Student ledger / fee statement
- Payment log
- Concession/discount register
- Defaulter list (Search Due Fees)

## API sketch

```
POST /api/v1/fees/invoices/{id}/payments
{ amount, discount, fine, method, reference, paid_at, note }

GET  /api/v1/students/{id}/ledger?sessionId=
POST /api/v1/fees/masters
POST /api/v1/fees/assign          { masterId, classId, sectionId }
```
