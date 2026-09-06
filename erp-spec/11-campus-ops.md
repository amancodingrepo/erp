# Campus operations

Front office, library, hostel, transport, inventory, canteen, booking, alumni, student support.

## Front office

| Screen | Route |
|---|---|
| Admission Enquiry | `/admin/enquiry` |
| Visitor Book | `/admin/visitors` |
| Phone Call Log | `/admin/generalcall` |
| Postal Dispatch | `/admin/dispatch` |
| Postal Receive | `/admin/receive` |
| Complaint | `/admin/complaint` |
| Setup (purpose/source/type) | `/admin/visitorspurpose` |
| Inward | `/admin/inward/inward_list` |
| Outward | `/admin/outward/outward_list` |

Visitor: name, whom to meet, purpose, in/out time, id proof, phone, number of persons.

Complaint: complainant, type, description, assigned to, status, date.

Inward/outward is college dak register (ref no, from/to, date, subject, file).

## Library

| Book List | `/admin/book/getall` |
| Issue-Return | `/admin/member` |
| Add student member | `/admin/member/student` |
| Add staff member | `/admin/member/teacher` |

Book: ISBN, title, author, publisher, qty, rack, price.
Issue: member, book, issue date, due, return, fine/day.

## Hostel

| Vacancy Status | `/admin/hostel/vacancy_status` |
| Assign Room | `/admin/hostel/assign_room` |
| Change Room | `/admin/hostel/change_room` |
| Hostel Rooms | `/admin/hostelroom` |
| Room Type | `/admin/roomtype` |
| Add Hostel | `/admin/hostel` |
| Gatepass List | `/admin/hostel/gatepass_list` |
| Scan QR | `/admin/hostel/scan_qrcode` |

Hostel → room type (2-share / 3-share) → room (beds) → allocate student + hostel fee head.
Gatepass: student out/in with QR.

## Transport

| Fee master | `/admin/transport/feemaster` |
| Pickup Point | `/admin/pickuppoint` |
| Routes | `/admin/route` |
| Vehicles | `/admin/vehicle` |
| Assign Vehicle | `/admin/vehroute` |
| Route Pickup Point | `/admin/pickuppoint/assign` |
| Student Transport Fees | `/admin/pickuppoint/student_fees` |

Route has ordered pickup points. Vehicle assigned to route. Student assigned pickup → inherits transport fee.

## Inventory

Issue Item, Add Item Stock, Add Item, Item Category, Item Store, Item Supplier.

Store ledger: opening + inward − issue = stock. Low-stock later.

## Canteen

Coupon, auditor, menu list, assign menu, food item master, menu type, canteen master.

Simple POS: items → day’s menu → coupon sold → redeem.

## Booking

`/roombooking/roombook` + request + request list.

Resource (hall/lab) + slot + requester + approve.

## Student support (tickets)

Topics master `/admin/requisitions`
Ticket list `/admin/requisitions/load_requisition_list`

Category, student, description, status, assignee.

## Alumni

`/admin/alumni/alumnilist`, events `/admin/alumni/events`.

Pass-out students become alumni; events + invitations.

## Certificates & ID cards (also under Certificate menu)

Student certificate design + generate.
Student ID card design + generate.
Staff variants.
Certificate report.

Template + data merge + batch PDF. QR with admission no.
