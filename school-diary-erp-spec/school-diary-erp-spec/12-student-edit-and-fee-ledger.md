# Student edit page + fee ledger schema

Source (read-only): `/Admin/Admission/Edit/{studentId}`  
Title: **Edit contact details**

Tabs: `#tab-parent` | `#tab-fees` | `#tab-fees-summary` | `#tab-daycare` | `#tab-transport` | `#tab-immunization`

**Save was not clicked.** No Pay / Refund / Reminder / Apply Template / Export.

Do not copy a live student’s amounts into your database. Use the **shape** below.

---

## Header (student row)

These sit above the tabs on every view.

| UI | Suggested column | Type |
| --- | --- | --- |
| First / Middle / Last Name * | `first_name`, `middle_name`, `last_name` | text |
| Date of Birth * | `dob` | date |
| Gender * | `gender` | enum: not_specified, male, female |
| Academic Year * | `academic_year_id` | FK |
| Class * | `class_id` | FK |
| Enrollment Date | `enrollment_date` | date |
| Enrollment No. | `enrollment_no` | text unique per branch |
| Roll Number | `roll_number` | text |
| Houses | `house_id` | FK nullable |
| Lunch From School | `lunch_from_school` | bool |
| Photo | `photo_id` | file |
| Aadhar Number | `aadhaar` | text encrypted |
| Jan Aadhar Number | `jan_aadhaar` | text |
| Scholar Number | `scholar_no` | text |
| SSSM Id Number | `sssm_id` | text |
| Religion | `religion` | enum/text |
| Category | `category` | enum |
| Caste | `caste` | text |
| Blood Group | `blood_group` | text |
| Disability | `disability_ids[]` | multi |
| RTE Student | `is_rte` | bool |
| Nationality | `nationality` | text |
| Admitted Class | `admitted_class` | text |
| Annual Income | `annual_income` | numeric/text |
| Is Only Child | `is_only_child` | bool |
| PEN | `pen` | text |
| APAAR Id Number | `apaar_id` | text |
| GRN | `grn` | text |
| Saral Id | `saral_id` | text |

Side actions (not fields): **Admission Information**, **Download Docs**.

---

## Tab: Parent (`#tab-parent`)

| UI | Column |
| --- | --- |
| Login Method | `guardians.login_method` phone \| email |
| Email | `guardians.email` |
| Primary Parent * | `student_guardians.is_primary` + `relation` mother\|father\|guardian |
| Mother / Father / Guardian Name | three name triples |
| Phone * | `guardians.phone_e164` |
| Alternate Phone + Relation | `alt_phone_e164`, `alt_phone_relation` |
| Parent Date of Birth | `guardians.dob` |
| Address Street/City/State/Zip/Country | address columns |

---

## Tab: Fees (`#tab-fees`) — working ledger

Header totals (year-scoped, computed or cached):

| UI | Column | Rule |
| --- | --- | --- |
| Academic Year | `fee_account.academic_year_id` | filter |
| Total Fees | `total_fees` | sum of billed installment totals |
| Total Paid Fees | `total_paid` | sum of payments |
| Total Unpaid Fees | `total_unpaid` | `total_fees - total_paid` (+ outstanding late fee) |
| Amount (pay box) | transient | amount about to collect |
| Include Late Fees | flag on payment | if checked, late fee is added into Amount |

### Actions (do not click on a live school)

- Fee Reminder
- Export Paid Fee Report / Due Fee Report / Fee Details
- Apply Fee Template
- Refund
- Add Fees Notes
- Pay Now / Pay Partial / Pay Amount
- `+` add installment row
- Per unpaid row: Pay Partial, edit, delete
- Per paid row: download receipt, view receipt

### Installment grid

| UI column | Suggested column | Notes |
| --- | --- | --- |
| (checkbox) | selected for bulk pay | UI only |
| Installment | `installment_id` / name | April, July, August… |
| Fee Type | `fee_type_ids[]` or joined names | many heads on one installment |
| Sub Amount | `sub_amount` | gross before discount |
| Discount | `discount_amount` | |
| Late Fee Charges | `late_fee` | |
| Total Amount | `total_amount` | ≈ sub_amount − discount + late_fee |
| Total Payment Amount | `paid_amount` | |
| Notes | `notes` | |
| Due Date | `due_date` | |
| Status | `status` | **Paid** \| **Unpaid** (more may exist: partial, waived) |
| Paid Date | `paid_date` | empty if unpaid |

Hidden/edit modal fields seen in DOM: Discount Type, Modification Reason.

Fee heads seen as **types** (master data, not a child record): Tuition, Transport, Admission, Caution Money, School App Fees.

---

## Tab: Installmentwise Fee Summary (`#tab-fees-summary`)

Read-model of the same ledger. Totals repeat. Grid:

| UI | Column |
| --- | --- |
| Installment | name |
| Fee Types | concatenated heads |
| Amount | billed |
| Discount | |
| Applied Taxes | GST if fee type has CGST/SGST/IGST |
| Paid Amount | |
| Late Fee Charges | |
| UnPaid Amount | amount − paid (+ late if unpaid) |

This tab is for review. The Fees tab is where collect / refund / template apply happen.

---

## Tab: Day Care (`#tab-daycare`)

| UI | Column |
| --- | --- |
| Day Care Yes/No | `is_daycare` |
| Check In Time | `daycare_check_in` |
| Check Out Time | `daycare_check_out` |
| Allow CCTV Yes/No | `allow_cctv` |

---

## Tab: Transport (`#tab-transport`)

| UI | Column |
| --- | --- |
| In Route | `in_route_id` |
| In Route Stop | `in_stop_id` |
| Out Route | `out_route_id` |
| Out Route Stop | `out_stop_id` |

Route dropdown is populated from vehicles/routes (labels may show registration nos.).

---

## Tab: Immunization Schedule (`#tab-immunization`)

Empty state: “Immunization details are not available.”  
Add / Update Immunization Schedule.

| UI | Column |
| --- | --- |
| Vaccination Name | `vaccine_name` |
| Schedule Date | `scheduled_on` |
| Administered Date | `administered_on` |
| Remarks | `remarks` |
| Status | `status` |
| Supportive Image | `image_id` |

---

## Suggested tables

```
students                  -- header fields above
guardians
student_guardians
student_fee_accounts      -- per student + academic year
  total_fees, total_paid, total_unpaid
student_fee_installments  -- one row per installment in Fees tab
  installment_name, due_date, sub_amount, discount_amount,
  late_fee, total_amount, paid_amount, notes, status, paid_date
student_fee_installment_heads  -- Tuition, Transport, … on a row
fee_payments              -- Pay Now / Partial / Refund
  amount, include_late_fee, paid_at, method, receipt_no, notes
student_daycare
student_transport
student_immunizations
```

## Status math to implement

```
unpaid_amount = total_amount - paid_amount
account.total_fees   = sum(installment.total_amount)
account.total_paid   = sum(installment.paid_amount)
account.total_unpaid = sum(unpaid_amount)
status = paid_amount <= 0 ? unpaid
       : paid_amount < total_amount ? partial
       : paid
```
