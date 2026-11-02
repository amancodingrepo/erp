# Student data fields

Captured read-only from:

- Admit New Student — `/Admin/Admission`
- Edit contact details (student profile) — `/Admin/Admission/Edit/{childId}`
- Manage Students list — `/Admin/ManageBranch/Users`
- Admission Information form — `/AdmissionForm/Create/{childId}`

No records were saved. Values below are **field labels / option lists only**, not a real student’s data.

Required fields in the live form are marked `*`.

---

## 1. Student identity (profile header)

| UI label | Form name | Type | Notes |
| --- | --- | --- | --- |
| *Name — First Name | `Child.FirstName` | text | required |
| Name — Middle Name | `Child.MiddleName` | text | |
| Name — Last Name | `Child.LastName` | text | |
| *Date of Birth | `Child.DateOfBirth` | date `dd-MMM-yyyy` | required |
| *Gender | `Child.Gender` | select | Not Specified, Male, Female |
| *Academic Year | `Child.AcademicYearId` | select | required |
| *Class | `Child.GradeId` | select | class + section |
| Enrollment Date | `Child.EnrollmentDate` | date | |
| Enrollment No. | `Child.EnrollmentNumber` | text + generate (`+`) | also `InitialEnrollmentNumber` |
| Roll Number | `Child.RollNumber` | text | also `InitialRollNumber` |
| Houses | `Child.HouseId` | select | |
| Lunch From School | `Child.LunchFromSchool` | Yes/No | |
| Photo | `Child.Photo.*` | image | plus **Download Docs** |
| Student photo (admission form) | `Files[0].Media.*` | jpg/jpeg/png | 100×100 placeholder |

---

## 2. Government / school IDs

| UI label | Form name | Type |
| --- | --- | --- |
| Aadhar Number | `Child.AadharNumber` | text |
| Jan Aadhar Number | `Child.JanAadharNumber` | text |
| Scholar Number | `Child.ScholarNumber` | text (`IsScholarNoMandatory` flag) |
| SSSM Id Number | `Child.SSSMIdNumber` | text |
| P E N | `Child.PENNumber` | text (Permanent Education Number) |
| APAAR Id Number | `Child.APAARIdNumber` | text |
| G R N | `Child.GRN` | text |
| Saral Id | `Child.SaralId` | text |

---

## 3. Demographics and statutory

| UI label | Form name | Type / options |
| --- | --- | --- |
| Religion | `Child.Religion` | SINDHI, HINDU, CHRISTIAN, MUSLIM, JAIN, SIKH, BUDDHISM, OTHER, BOHRA, CHRISTIAN (RC) |
| Category | `Child.Category` | SC, ST, OBC, GENERAL, BOHRA, CATHOLIC, OTHER, SBC, NT B, NT C, NT D, VJA, NT, OPEN, VJNT, NT(A), MINORITY, VJ, VJ(B), VJ(C), VJ(D), ESBC, SEBC |
| Caste | `Child.Caste` | text |
| Blood Group | `Child.BloodGroup` | text |
| Disability | `Child.DisablityId` | multi-select (typo in vendor field) |
| RTE Student | `Child.IsRTEStudent` | Yes/No |
| Nationality | `Child.Nationality` | text |
| Admitted Class | `Child.AdmittedClass` | text (class at first admission) |
| Annual Income | `Child.AnnualIncome` | text/number |
| Is Only Child | `Child.IsOnlyChild` | Yes/No |

### Disability options

- Deaf
- Blind
- Deaf Blind
- Physically Disabled
- Cognitively Disabled
- Albinism
- Autistic
- Dumb
- Others

---

## 4. Parent / guardian (profile tab: Parent)

The login account is the **primary parent**. Mother, Father, and Guardian names are stored separately.

| UI label | Form name | Type / options |
| --- | --- | --- |
| Login Method | `Parent.LoginMethod` | Phone (default) or Email |
| Email | `Parent.Email` | text (`InitialEmail`) |
| *Password | `Parent.Password` | password (create only) |
| *Relation / *Primary Parent | `Parent.Relation` | Not Specified, Mother, Father, Guardian |
| Mother Name | `Child.MotherProfile.FirstName/MiddleName/LastName` | text × 3 |
| Father Name | `Child.FatherProfile.FirstName/MiddleName/LastName` | text × 3 |
| Guardian Name | `Child.GuardianProfile.FirstName/MiddleName/LastName` | text × 3 |
| *Phone / *Mother Phone | `Parent.Phone.E164` + CountryCode + NationalNumber | required |
| Alternate Phone | `Parent.AlternatePhone.*` | E.164 split fields |
| Alternate Phone Relation | `Parent.AlternatePhoneRelation` | Mother, Father, Guardian |
| Date of Birth / Mother Date of Birth | `Parent.DateOfBirth` | date |
| Address — Street | `Parent.Address.Street` | text |
| Address — City | `Parent.Address.City` | text |
| Address — State | `Parent.Address.State` | text |
| Address — Zip | `Parent.Address.Zip` | text |
| Address — Country | `Parent.Address.Country` | text |

Hidden policy flags: `Parent.IsEmailMandatory`, `Parent.IsPhoneMandatory`, `Parent.Role`.

---

## 5. Fees (profile tabs: Fees, Installmentwise Fee Summary)

Present on **edit** more completely than on create.

| UI label | Form name |
| --- | --- |
| Academic Year | `Child.FeesDetails.AcademicYearId` |
| Total Fees | `Child.FeesDetails.TotalFees` |
| Total Paid Fees | `Child.FeesDetails.TotalPaidFees` |
| Total Unpaid Fees | `Child.FeesDetails.TotalUnpaidFees` |
| Amount | `Child.FeesDetails.AmountToPay` |
| Include Late Fees | `Child.FeesDetails.IncludeLateFees` |
| Enrollment Subcategory | (edit) |
| Enrollment Type | (edit) |
| From Month / To Month | (edit) |
| Fee Templates | (edit) |
| Apply fee template partially? | (edit) |
| Apply Fees From | (edit) |
| Date To Clear Dues | (edit) |
| Installment | (edit) |
| Fee Type | (edit) |

### Payment instrument fields (on fee pay/edit)

Payment Method, Account Head, Paid Status, Commission Charges, Late Fee Charges, Bounce Charges, Total Amount, Bank Name, From Account, Transaction Number, Cash Deposite Number, Cheque Number, Last 4 Digits Of Card, Cheque Date, Paid Date, Notes / Note.

---

## 6. Day Care tab

| UI label | Form name | Type |
| --- | --- | --- |
| Day Care | `Child.IsInDayCare` | Yes/No |
| Check In Time | `Child.CheckInTime` | time |
| Check Out Time | `Child.CheckOutTime` | time |
| Allow CCTV | `Child.AllowCctv` | Yes/No |

---

## 7. Transport tab

| UI label | Form name |
| --- | --- |
| In Route | `Child.InRouteId` |
| In Route Stop | `Child.InRouteStopId` |
| Out Route | `Child.OutRouteId` |
| Out Route Stop | `Child.OutRouteStopId` |

---

## 8. Immunization Schedule tab

| UI label | Form name |
| --- | --- |
| Immunization Status | `ImmunizationStatus` |
| Administered Date | `AdministeredDate` |
| Supportive Image | `SupportiveMedia.*` / `fileUpload` |
| Remarks | `Remarks` |
| ImmunizationId / ChildId | hidden ids |

---

## 9. Manage Students list fields and actions

Route: `/Admin/ManageBranch/Users`

**Filters:** Class, Academic Year Id, Active | Inactive, typeahead.

**Row display:** photo, student name, class, father name, enrollment date, linked parent name, email icon, phone, last seen, Active badge.

**Per-student actions (do not use these if you are only mapping):**

- Edit → `/Admin/Admission/Edit/{id}`
- Add Sibling
- Reset Password
- Set as defaulter / Remove Defaulter Status
- Download Docs
- Deactivate Child-Id
- Map RFID Card
- Map Siblings
- Fee Details
- Deactivate Parent-Id
- User Remark

Extra status flags implied: `active | inactive`, `defaulter`, RFID mapping, sibling group.

---

## 10. Admission Information form (extended application)

Route: `/AdmissionForm/Create/{childId}`  
Header: Academic Year, Form Number, Enquiry Date, Enquiry Status (`Cold Enquiry`, `Active`, …).

This form is template-driven (`Fields[n].Value`). Sections observed at this school:

### Student photo
- Passport photo (jpg/jpeg/png)

### Name + Gender
- Full name of the ward *
- Gender *

### Date of birth
- Date of birth (DD/MMM/YYYY) *
- Date of birth (in words)

### Primary contact info
- Mobile Contact No *
- Email Address
- Emergency Contact No *

### Father Information
- Father Name *
- Father Contact Number *

### Mother Information
- Mother Name
- Mother Contact Number

### Class info
- Application for class *
- Previous class passed
- Previous School Name
- Previous School Address

### Previous school info
- Name of the Previous school
- Reason for Leaving School
- DISE code / UDISE no.
- Previous School City/Country
- Marksheet of Previous School (file)

### Aadhar + SSSM info
- Aadhar No. of ward
- Child SSSM ID
- Family SSSM ID
- PEN No

### Nationality and other details
- Nationality
- Mother Tongue
- Religion
- Category (SC/ST/OBC/Gen.)
- Caste
- Belongs to Minority
- Minority detail's

### Address Info
- Permanent Residential Address
- Permanent Address PinCode
- Permanent Address State *
- Current Residential Address
- Current Residential Address In Pune (with pincode)
- Current Address Pin Code
- Office Address

### Transport facility
- Transport facility required (Yes/No)
- Bus No. (For office use)

### Sports/Activity
- Sports/Activity your ward is interested in

### Achievements
- Special achievements (if any)

### Required documents
- Free-form ADD uploader (jpg, jpeg, png, pdf)

Footer actions (not clicked): **CREATE ADMISSION FORM**, **SAVE & PRINT**.

Enquiry SMS flags exist as hidden fields: `SendEnquirySms`, `NavigateToPrintPage`.

---

## 11. Recommended student schema for your ERP

Keep one `students` table plus related tables. Do not store Aadhaar/APAAR in logs.

```
students
  id, branch_id, academic_year_id, class_id, house_id
  first_name, middle_name, last_name
  dob, gender, photo_id
  enrollment_date, enrollment_no, roll_no, scholar_no
  admitted_class
  aadhaar, jan_aadhaar, sssm_id, pen, apaar_id, grn, saral_id
  religion, category, caste, nationality, mother_tongue
  blood_group, disability_ids[], is_rte, is_only_child
  annual_income, belongs_to_minority, minority_detail
  lunch_from_school
  is_daycare, check_in_time, check_out_time, allow_cctv
  in_route_id, in_stop_id, out_route_id, out_stop_id
  previous_school_name, previous_school_address, previous_class
  previous_school_udise, previous_school_city, leave_reason
  sports_interest, achievements
  status: enquiry|admitted|enrolled|inactive|alumni
  is_defaulter, rfid_uid
  created_at, updated_at

guardians
  id, login_method, email, phone_e164, alt_phone_e164
  alt_phone_relation, dob, password_hash
  address_street, city, state, zip, country

student_guardians
  student_id, guardian_id, relation (mother|father|guardian)
  is_primary

sibling_groups
  student_id, group_id

student_documents
  student_id, kind, file_id

immunizations
  student_id, status, administered_on, image_id, remarks
```

Search keys to index: enrollment_no, scholar_no, first+last name, parent phone, parent email, PEN, APAAR.
