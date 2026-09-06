# Collect Fees — LIVE contract

Captured from `GET /studentfee/addfee/215` (Ravi Shankar, admission `1422165`) while authenticated.

## List → collect

1. `GET /studentfee`
   Filters: `class_id`, `section_id`, or `search_text` (name / roll / enroll / national id / local id).
2. `POST /studentfee/search`
   Body: `search_type=keyword_search|class_search`, `search_text` and/or `class_id`,`section_id`
   Response JSON:

```json
{ "status": 1, "params": { "class_id": null, "section_id": null, "search_type": "keyword_search", "search_text": "a" }, "csrf": { "name": "ci_csrf_token", "hash": null } }
```

3. DataTables `POST /studentfee/ajaxSearch`
   Body: `draw,start,length` + params from step 2.
   Live sample: `recordsTotal: 168`.
   Row array:

| i | meaning | sample |
|---|---|---|
| 0 | Class | FY B.Sc Nursing (Ayurveda) |
| 1 | Section | A |
| 2 | Student ID | 1422165 |
| 3 | Name HTML | `<a href="/student/view/213">Ravi Shankar</a>` |
| 4 | Father | |
| 5 | DOB | 13-04-2001 |
| 6 | Phone | null |
| 7 | Action | `<a href=/studentfee/addfee/215>Collect Fees</a>` |

IDs are **not the same**:
- `/student/view/{student.id}` → 213
- `/studentfee/addfee/{student_session.id}` → 215

Use `student_session_id` on every payment.

## Collect page

`GET /studentfee/addfee/{student_session_id}`

Hidden totals on this student: `tot_amount=50000`, `paidamount=0`, `tamount=50000`, `name=Ravi Shankar`, `entry_type=Single`.

### Line table columns LIVE

Fees Code · Due Date · Assign Date · Status · Amount · Payment ID · Mode · Date · Discount · Fine · Paid · Balance · Action

Second grouped table: Fees Group + same money columns.

### Collect modal / form fields LIVE

| UI | POST name | Notes |
|---|---|---|
| Date * | `date` | default today `05-09-2026` as `admission_date` display field |
| Amount (₹) * | `amount` | |
| Discount Group | `student_fees_discount_id` / `discount_id` | |
| Discount (₹) * | `amount_discount` | |
| Fine (₹) * | `amount_fine` | |
| Payment Mode | `payment_mode` | Cash, Cheque, DD, Bank Transfer, UPI, Card |
| Note / Description | `description` | |
| Payment ID * | (shown on receipt after save) | |
| | `student_session_id` | required |
| | `student_fees_master_id` | line |
| | `fee_groups_feetype_id` | line |
| | `fee_category` | |
| | `transport_fees_id` | |
| | `coursewise_fee_master_id` | |
| | `type` / `feetype` | |
| | `action` | `collect` or `print` |
| | `entry_type` | `Single` |
| | `guardian_phone`, `guardian_email`, `parent_app_key` | notify |

### Save endpoint LIVE

`POST /studentfee/addstudentfee`  
`dataType: json`

Success: `{ "status": "success" }` then reload (collect) or `{ print: html }` (print).  
Fail: `{ "status": "fail", "error": { field: message } }`

### Other fee endpoints LIVE

| Method | Path | Use |
|---|---|---|
| POST | `/studentfee/addfeegrp` | group collect wrapper (`student_session_id`, `tamount`) |
| POST | `/studentfee/addstudentRefundfee` | refund |
| POST | `/studentfee/deleteFee` | delete a payment (prefer cancel in rebuild) |
| POST | `/studentfee/deleteStudentDiscount` | |
| GET/POST | `/studentfee/geBalanceFee` | balance helper |
| POST | `/admin/feediscount/applydiscount` | apply named discount |
| POST | `/studentfee/removeFine` | |
| GET | `/studentfee/printFeesByName` | receipt |
| GET | `/studentfee/printFeesByGroup` | |
| GET | `/studentfee/printFeesByGroupArray` | batch |
| GET | `/studentfee/printRefundFeesByGroupArray` | |

## Rebuild mapping

`POST /api/v1/fees/payments` must accept the same business fields. Generate `receiptNo` server-side. Never let the client send Payment ID as source of truth.
