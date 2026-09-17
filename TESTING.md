# School / college ERP — testing guide (non-technical)

This is a **click-through test**, not a programming task. You only need a computer, a browser, and about 60–90 minutes.

Mark **Pass / Fail / Skip**. Leave **Outcome** blank until you test; then write what you actually saw (short).

If something fails, also note:

1. What you clicked  
2. What you expected  
3. What actually happened  
4. The address bar URL  
5. A screenshot if you can  

---

## 1. Open the system

**Live test site**

https://web-production-99e97.up.railway.app/login

1. Open **Chrome** or **Edge** (preferred).  
2. Paste the link above.  
3. You should see **Sign in** with **Campus**, **Portal**, **Username**, **Password**.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Login page loads | Sign-in form, no crash | | ☐ | ☐ |
| Campus list | At least Main Campus (MAIN) and East Campus (EAST) | | ☐ | ☐ |
| You can type username and password | Fields accept text | | ☐ | ☐ |

If the page does not load: wait 30 seconds and refresh. If it still fails, note the error and stop this round.

---

## 2. Demo logins (use these only)

Password for **all** seeded demo users: `Admin@12345`

On the login screen, first choose **Campus**, then **Portal**, then username.

| Who | Campus | Portal | Username | Password | Should land on |
|---|---|---|---|---|---|
| Main campus admin (also Platform Admin) | MAIN | Staff | `admin` | `Admin@12345` | Full staff desk |
| Main campus teacher | MAIN | Staff | `teacher` | `Admin@12345` | **Teacher desk** (short menu) |
| Main campus student | MAIN | Student | `student1` | `Admin@12345` | Student portal |
| Main campus parent | MAIN | Parent | `parent1` | `Admin@12345` | Parent portal |
| East campus admin | EAST | Staff | `admin` | `Admin@12345` | East staff desk only |

Wrong campus + right username usually **fails** (except MAIN `admin`, who can open **Multi Branch** and switch). That is correct.

Wrong portal + right username usually **fails**. That is correct.

**Always Sign out** (or close the tab) before switching user. Student and parent portals have a **Sign out** button.

A spreadsheet of the same logins plus **direct links** is in **`TESTING-logins.csv`** (open in Excel / Google Sheets). Click the login link, then the “open after login” link.

---

## 3. What to test vs what to skip

**Test:** students, fees, attendance, exams, **public apply** (new form), enroll + auto logins, teacher desk, hostel, transport, library, front office, certificates, templates, NAAC, CO-PO, feedback, payroll, seating, Meet/Zoom **links**, two campuses.

**Also in the menu (campus-scoped, thinner):** canteen, LMS, railway concession, online exam, recruitment, inventory, chat, alumni, mentoring, CMS, income/expense, placements, activities, lesson plan, homework, downloads, room booking.

**Skip only:** System Update (`/staff/updater`) — off on purpose.

---

## A. Staff admin — first login

1. Campus = **MAIN**  
2. Portal = **Staff**  
3. Username `admin` / password `Admin@12345`  
4. Click **Enter desk**

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Staff home | Dashboard titled like Campus ledger; left menu has many groups (Students, Fees, Exams, …) | | ☐ | ☐ |
| Sign out | Clear **Sign out** in the header (and sidebar) | | ☐ | ☐ |

---

## A2. Two campuses

**Goal:** Main and East do not share students.

1. As MAIN admin, open **Multi Branch** → **Overview**.  
2. You should see **Main Campus** and **East Campus**.  
3. Sign out. Login Campus **EAST**, Portal **Staff**, username `admin`.  
4. Open student search. You should **not** see a Main-only student (for example `TEST-101`).  
5. Sign out. MAIN admin again. Campus switcher in the left sidebar (if shown) or Multi Branch → **Work in this campus**.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Multi Branch list | MAIN and EAST both listed | | ☐ | ☐ | ☐ |
| East admin login | East dashboard, not Main’s student list | | ☐ | ☐ | ☐ |
| Isolation | East list ≠ Main list | | ☐ | ☐ | ☐ |

---

## A3. Teacher desk (short menu)

1. Sign out. Campus **MAIN**, Portal **Staff**, username `teacher`.  
2. Look at the left menu and home page.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Login | Home titled like **Teacher home** (not the full office ledger) | | ☐ | ☐ |
| Menus present | Attendance, marks, timetable, homework, find a student | | ☐ | ☐ |
| Menus **missing** | Collect fees, student admission/create, online applications, Multi Branch, users, backup | | ☐ | ☐ |
| Blocked URL | Opening `/staff/student/create` shows “Not on the teacher desk” (or similar) | | ☐ | ☐ |
| Fees | Teacher **cannot** collect cash | | ☐ | ☐ |

If the teacher sees the full office menu or can collect fees, that is a **Fail**.

---

## B. Students (walk-in admit and search)

**Goal:** create a student at the desk and find them.

1. Login as **admin**.  
2. **Student Information** → **Student Admission**.  
3. Fill at least first name `Test`, admission no `TEST-101` (or `TEST-102` if taken), class **FY BA** / **Class 10** / section **A**.  
4. Save. Search `TEST-101`.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Create page | Form opens | | ☐ | ☐ | ☐ |
| Save | Success message or student appears | | ☐ | ☐ | ☐ |
| Search | Finds the student with that admission no | | ☐ | ☐ | ☐ |

---

## C. Fees

Use `STU-001` (Demo Student) or `TEST-101`.

1. **Collect Fees**.  
2. If no bill, assign from Fee Master.  
3. Collect a **small cash** amount (example ₹100).  
4. Confirm a receipt number / PDF.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Collect fees opens | Student/due visible or you can assign a bill | | ☐ | ☐ | ☐ |
| Payment | Saves; receipt number appears | | ☐ | ☐ | ☐ |
| PDF | Receipt opens or downloads | | ☐ | ☐ | ☐ |

Do **not** delete a receipt. Cancel should reverse, not erase.

---

## D. Attendance

As **admin** (or teacher).

1. Student attendance. Today’s date, class **FY BA** or **Class 10**, section **A**.  
2. Mark Demo Student present. Save.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Grid loads | Names for that class/section | | ☐ | ☐ | ☐ |
| Save | Works; saving again the same day does not duplicate wildly | | ☐ | ☐ | ☐ |

---

## E. Exams (marks)

1. **Exam Group**. Create a simple group if empty.  
2. Enter a mark (example 70 / 100). Save draft. Finalize if shown.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Page opens | Group / mark entry usable | | ☐ | ☐ | ☐ |
| Save | Mark stored | | ☐ | ☐ | ☐ |
| Finalize | Locks or a clear message | | ☐ | ☐ | ☐ |

---

## F. Public application (new form — no login)

**Goal:** a parent or student applies online with the **new required form**. Use a **private / incognito** window so you are not logged in as staff.

**Open:** https://web-production-99e97.up.railway.app/apply

### F1. Page load

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Page loads without login | Title **Online admission**; campus / branch dropdown | | ☐ | ☐ |
| Required marks | Fields marked **\*** for first name, last name, parent/guardian, mobile, student email, date of birth, gender, class/course, previous qualification, percentage | | ☐ | ☐ |
| School + college | Wording like class/course, parent/guardian (not college-only) | | ☐ | ☐ |
| Class list | Dropdown includes programmes such as Class 1, Class 10, and/or BA | | ☐ | ☐ |

### F2. Validation (do **not** submit a complete form yet)

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Submit empty | Stays on the page; red messages on required fields; **no** application number | | ☐ | ☐ |
| Mobile extra digits | Typing an 11th digit is **blocked**; field stays 10 digits | | ☐ | ☐ |
| Mobile letters | Letters are **not** kept; only digits | | ☐ | ☐ |
| Percentage 101 | Error: percentage must be 0–100; no application number | | ☐ | ☐ |
| Bad student email | Error on student email; no application number | | ☐ | ☐ |

### F3. Successful application

Fill **all required** fields, for example:

| Field | Example value |
|---|---|
| Campus / branch | MAIN (Main Campus) |
| First name | Ravi |
| Last name | Sharma |
| Parent / guardian name | Suresh Sharma |
| Mobile | `9876543210` (exactly 10 digits) |
| Student / pupil email | `ravi.test@example.com` |
| Parent email (optional) | `suresh.test@example.com` |
| Date of birth | any past school-age date |
| Gender | Male |
| Class / course applying for | Class 10 **or** BA / Class 11–12 Arts |
| Previous class / qualification | Class 8 **or** Class 10 (SSC / Matric) |
| Percentage in last exam | `82.5` |

Click **Submit application**.

**Payment is not required to submit.** You should get an APP number with fee still unpaid. Live Razorpay/UPI is optional and can be skipped for testing.

**Payment is required only to enroll** (create the student and portal passwords). For testing, do **not** need a real card: staff **Mark fee paid** (cash) is enough. Walk-in **Student Admission** on the staff desk never uses this application fee.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Submit success | Message with an application number like **APP-…**; keep this number. Fee can still be **unpaid** | | ☐ | ☐ |
| No live pay needed | You can close the page without paying online | | ☐ | ☐ |
| Optional pay link | “Pay application fee online” may appear (Skip if it errors — keys often not set) | | ☐ | ☐ |

### F4. Status lookup

On the same page, **Check status** — paste the APP number.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Look up | Shows that application number, status (e.g. applied), fee unpaid or paid | | ☐ | ☐ |

### F5. Staff inbox → pay fee → enroll → portal passwords

1. Close incognito (or keep it). Login as MAIN **admin**.  
2. Open **Online applications** / online student inbox (`/staff/onlinestudent`).  
3. Find **Ravi** / your APP number.  
4. **Mark fee paid** (cash is fine). This is how testers skip live payment.  
5. **Enroll**: class + section (e.g. Class 10 / A or FY BA / A). Save.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Inbox | New application appears for this campus, fee unpaid until you mark it | | ☐ | ☐ | ☐ |
| Enroll before fee | Should **refuse** (“unpaid” / similar) until fee is marked paid | | ☐ | ☐ | ☐ |
| Enroll after fee | Student created; gold box shows **portal logins once** | | ☐ | ☐ | ☐ |
| Student login shown | Username (from admission no) and password starting like `Portal@…` | | ☐ | ☐ | ☐ |
| Parent login shown | Parent username/password **if** you entered parent/guardian name | | ☐ | ☐ | ☐ |
| Email line | Shows student email status `sent` or `logged` (logged = SMTP not set; still OK if passwords are on screen) | | ☐ | ☐ | ☐ |

**Copy the passwords now.** They are not shown again.

### F6. New applicant logs in (not `student1`)

1. Sign out.  
2. Campus **MAIN**, Portal **Student**, username and password from the gold box.  
3. Then Sign out; Portal **Parent** with the parent pair.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| New student login | Student portal opens (dashboard / fees / profile) | | ☐ | ☐ | ☐ |
| Sign out | Visible **Sign out**; returns toward login | | ☐ | ☐ | ☐ |
| New parent login | Parent portal; child name visible | | ☐ | ☐ | ☐ |

---

## G. Hostel and transport

As **admin**:

1. **Hostel** — add `Boys 1` if empty. Room capacity **1**. Assign Demo Student.  
2. Same room again to another student — should **refuse** (full).  
3. **Route** — add route + pickup; assign student.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Hostel + room save | Names stored | | ☐ | ☐ | ☐ |
| Allotment | First assign works; full room rejected | | ☐ | ☐ | ☐ |
| Transport | Route save; student can be assigned | | ☐ | ☐ | ☐ |

---

## H. Library

1. Book title `Physics`, quantity **1**. Member = Demo Student. Issue.  
2. Issue again — fail. Return — works.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Book / member | Save | | ☐ | ☐ | ☐ |
| First issue | Works | | ☐ | ☐ | ☐ |
| Second issue | Blocked | | ☐ | ☐ | ☐ |
| Return | Works | | ☐ | ☐ | ☐ |

---

## I. Front office

**Enquiry** — name `Walk-in Parent`, phone `9000000099`. Convert if shown.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Enquiry saves | Row appears | | ☐ | ☐ | ☐ |
| Convert | Creates an application **or** “already converted” | | ☐ | ☐ | ☐ |

---

## J. Certificates / ID

Generate ID / Bonafide for Demo Student.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| ID / PDF | Downloads or opens | | ☐ | ☐ | ☐ |
| Certificate | Generates | | ☐ | ☐ | ☐ |

---

## K. Messages and SMTP

1. **SMS / email templates** — `fee_due` / `portal_login` with `{{name}}`.  
2. **Email (SMTP)** (`/staff/emailconfig`) — host/user/from. Do not expect a real SMS/email on a phone unless SMTP was saved.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Templates | List/edit opens; small save works | | ☐ | ☐ | ☐ |
| SMTP page | Form to save host (optional for this round) | | ☐ | ☐ | ☐ |

---

## L. NAAC

Dashboard C1–C7. Task on criterion 1. Complete without evidence **refused**; with a file path, completes.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Dashboard | 7 criteria | | ☐ | ☐ | ☐ |
| Task | Create works | | ☐ | ☐ | ☐ |
| Evidence | Empty complete fails; with path succeeds | | ☐ | ☐ | ☐ |

---

## M. CO-PO

PO1, CO1, mapping weight **3** saves, **4** refused. Compute attainment.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| PO / CO | Save | | ☐ | ☐ | ☐ |
| Weight | 3 OK, 4 rejected | | ☐ | ☐ | ☐ |
| Report | Runs without crash | | ☐ | ☐ | ☐ |

---

## N. Feedback

Form `Teacher rating`, rating 1–5, window open, Demo Student submits 4.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Form + field | Save | | ☐ | ☐ | ☐ |
| Fill | Submits | | ☐ | ☐ | ☐ |
| Report | Average or at least 1 response | | ☐ | ☐ | ☐ |

---

## O. Payroll

BASIC + DA on Demo Teacher. Generate this month. Run again — already generated.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Elements | BASIC, PF, ESI, PT, TDS listed | | ☐ | ☐ | ☐ |
| First run | Net pay shown | | ☐ | ☐ | ☐ |
| Second run | Blocked | | ☐ | ☐ | ☐ |

---

## P. Seating

Hall A capacity **2**. Allocate. Too many students → refuse. Raise capacity and retry.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Block | Saves | | ☐ | ☐ | ☐ |
| Overflow | Rejected **or** seats when capacity is enough | | ☐ | ☐ | ☐ |

---

## Q. Google Meet / Zoom (links only)

Valid `https://meet.google.com/…` saves. `https://google.com` refused. Does **not** create a real Google meeting.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Valid link | Saves; Join opens a tab | | ☐ | ☐ | ☐ |
| Wrong URL | Rejected | | ☐ | ☐ | ☐ |

---

## R. Seeded student portal

Portal **Student**, `student1` / `Admin@12345`.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Dashboard | Loads; Sign out visible | | ☐ | ☐ |
| Fees / attendance / exams | Open without crash | | ☐ | ☐ |
| Staff URL | `/staff/studentfee` kicks to login or forbid | | ☐ | ☐ |

---

## S. Seeded parent portal

Portal **Parent**, `parent1` / `Admin@12345`.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Dashboard | Mentions Demo Student; Sign out visible | | ☐ | ☐ |
| Child data | Fees or attendance visible | | ☐ | ☐ |
| Staff URL | Cannot collect fees | | ☐ | ☐ |

---

## T. Wrong password

Staff `admin`, password `wrong`, 2–3 times.

| Check | Expected result | Outcome | Pass | Fail |
|---|---|---|---|---|
| Error | Message, not a white crash | | ☐ | ☐ |
| Lockout | After many tries, “too many attempts” **may** appear | | ☐ | ☐ |

Then log in with `Admin@12345`.

---

## U. Backup (admin only — do **not** restore live data)

**Backup** screen. Snapshot download. Optional **Run database dump**.

**Do not** type `RESTORE ALL CAMPUSES` on the live test site unless you were told to wipe the database.

| Check | Expected result | Outcome | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Backup page | Opens for admin | | ☐ | ☐ | ☐ |
| Snapshot | JSON file downloads | | ☐ | ☐ | ☐ |
| Restore button | Disabled until you type **RESTORE ALL CAMPUSES** | | ☐ | ☐ | ☐ |

---

## 4. End-of-day score

Count **Fail** only (ignore Skip). Section **F** (new application) is the most important new path.

| Fails | Meaning |
|---|---|
| 0 | Good enough for a demo walkthrough |
| 1–3 | Usable; list the fails for the developer |
| 4+ | Do not show to a school/college yet |

---

## 5. How to send a bug (copy this)

```
Date:
Browser (Chrome / Edge / phone):
Login used (admin / teacher / student1 / parent1 / new APP student):
Page URL:
What I clicked:
What I expected:
What happened:
Screenshot attached: yes / no
```

---

## 6. If you test on a phone

Repeat **A, A3, F, R, S** only (login, teacher, public apply, student, parent). Staff grids are for a **computer**.

---

## 7. Reminder

- Demo data is **fake** (campuses MAIN/EAST, Class 1 / Class 10 / BA, STU-001).  
- Do not enter real Aadhaar or bank numbers.  
- Do not change the admin password unless asked.  
- Do not run **Restore** on the shared live site.  
- Online payment (Razorpay) will not complete without real gateway keys — skip live UPI/card unless keys are confirmed.  
- Portal **emails** send only if SMTP was saved; otherwise status is `logged` and passwords are still on the enroll screen.
