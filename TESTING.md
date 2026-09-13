# College ERP — testing guide (non-technical)

This is a **click-through test**, not a programming task. You only need a computer, a browser, and about 60–90 minutes.

Use a **Pass / Fail / Skip** mark on every step. If something fails, write:

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
3. You should see **Sign in** with Campus, Portal, Username, Password.

| Check | Pass | Fail |
|---|---|---|
| Login page loads | ☐ | ☐ |
| Campus dropdown shows at least Main Campus (MAIN) and East Campus (EAST) | ☐ | ☐ |
| You can type in username and password | ☐ | ☐ |

If the page does not load: wait 30 seconds and refresh. If it still fails, note the error and stop this round.
report -- student login does not have logout button add one and the ui screen is not looking good 

---

## 2. Demo logins (use these only)

Password for **all** demo users: `Admin@12345`

On the login screen, first choose **Campus**, then **Portal**, then username.

| Who | Campus | Portal dropdown | Username | Password | Should land on |
|---|---|---|---|---|---|
| Main campus admin | MAIN | Staff | `admin` | `Admin@12345` | Staff dashboard |
| Main campus teacher | MAIN | Staff | `teacher` | `Admin@12345` | Staff dashboard (fewer menus) |
| Main campus student | MAIN | Student | `student1` | `Admin@12345` | Student dashboard |
| Main campus parent | MAIN | Parent | `parent1` | `Admin@12345` | Parent dashboard |
| East campus admin | EAST | Staff | `admin` | `Admin@12345` | Staff dashboard for East only |

Wrong campus + right username usually **fails** (except the Main campus admin, who can also open **Multi Branch** and switch). That is correct.

Wrong portal + right username usually **fails**. That is correct.

**Always log out** (or close the tab) before switching user.

---

## 3. What to test vs what to ignore

**Test these** (they are built): students, fees, attendance, exams, admission apply, hostel, transport, library, front office, certificates/ID cards, SMS templates, NAAC, CO-PO, feedback, payroll, seating, Google Meet / Zoom **links**.

**Also built now** (same campus rules): Canteen, LMS / online course, railway concession, online exam / CBT, recruitment, inventory, chat (`/staff/chat`), alumni, mentoring, CMS, income/expense, placements, activities, lesson plan, assignments, downloads, room booking.

**Skip only:** System Update (`/staff/updater`) stays off on purpose.

---

## A. Staff admin — first login

1. Campus = **MAIN** (Main Campus)  
2. Portal = **Staff**  
3. Username `admin` / password `Admin@12345`  
4. Click **Enter desk**

| Check | Pass | Fail |
|---|---|---|
| You reach a staff home / dashboard | ☐ | ☐ |
| Left menu shows groups (Students, Fees, Exams, etc.) | ☐ | ☐ |
| Your name or campus feels like a college desk, not a crash | ☐ | ☐ |

---

## A2. Two campuses (multi-tenant)

**Goal:** prove Main and East do not share student lists.

1. Still on Main campus admin, open **Multi Branch** → **Overview** (`/staff/multibranch/branch/overview`).  
2. You should see **Main Campus** and **East Campus**.  
3. Sign out. Login as Campus **EAST**, Portal **Staff**, username `admin`.  
4. Open **Student Details**. You should **not** see a student you created on Main (for example `TEST-101`).  
5. Sign out. Login Main admin again. Use the campus switcher in the left sidebar (if shown) or Multi Branch → **Work in this campus** on East, then check students, then switch back.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Multi Branch page lists MAIN and EAST | ☐ | ☐ | ☐ |
| East admin login works | ☐ | ☐ | ☐ |
| East student list is not the same as Main | ☐ | ☐ | ☐ |
| Online admission `/apply` has a campus dropdown | ☐ | ☐ | ☐ |

---

## B. Students (admit and search)

**Goal:** create a student and find them again.

1. Menu **Student Information** → **Student Admission** (`/staff/student/create`).  
2. Fill at least:
   - First name: `Test`  
   - Admission no: `TEST-101` (must be unique — if it says already exists, use `TEST-102`)  
   - Class **FY BA**, section **A** if asked  
3. Save.  
4. Open **Student Details** / search (`/staff/student/search`).  
5. Search `TEST-101`.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Create page opens | ☐ | ☐ | ☐ |
| Save succeeds (success message or student appears) | ☐ | ☐ | ☐ |
| Search finds the student | ☐ | ☐ | ☐ |
| Opening the student shows name + admission no | ☐ | ☐ | ☐ |

---

## C. Fees (assign, collect, receipt)

**Goal:** a due amount can be collected and a receipt shown.

Use student `STU-001` (Demo Student) or your `TEST-101`.

1. Open **Collect Fees** / student fee (`/staff/studentfee`).  
2. Find the student.  
3. If there is no bill yet, use **Fee Master** / assign if those screens are in the menu (`/staff/feemaster`, `/staff/feemastercoursewise`).  
4. Collect a **small cash** amount (example ₹100).  
5. Confirm a **receipt number** appears.  
6. Open receipt / PDF if there is a Print or PDF button.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| You can open collect fees | ☐ | ☐ | ☐ |
| A due or invoice is visible (or you could assign one) | ☐ | ☐ | ☐ |
| Payment saves | ☐ | ☐ | ☐ |
| Receipt / PDF opens | ☐ | ☐ | ☐ |

**Do not** try to cancel a receipt unless the screen clearly says cancel creates a reverse entry (not delete).

---

## D. Teacher must **not** collect fees

1. Log out.  
2. Portal **Staff**, username `teacher`, same password.  
3. Look at the left menu.

| Check | Pass | Fail |
|---|---|---|
| Teacher logs in | ☐ | ☐ |
| **Collect Fees** is missing or they cannot complete a payment | ☐ | ☐ |
| Teacher can still open attendance or exams if those menus show | ☐ | ☐ |

If the teacher can collect cash, that is a **Fail** (security).

---

## E. Attendance

Log in as **admin** again.

1. Open student attendance (`/staff/stuattendence`).  
2. Pick today’s date, class **FY BA**, section **A**.  
3. Mark Demo Student present (or leave).  
4. Save.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Attendance grid loads | ☐ | ☐ | ☐ |
| Save works | ☐ | ☐ | ☐ |
| Saving again the same day does not duplicate wildly | ☐ | ☐ | ☐ |

---

## F. Exams (marks)

1. Open **Exam Group** (`/staff/examgroup`).  
2. If a group exists, open mark entry.  
3. If empty: create a simple group (name `Test exam`, type college grade, session **2025-26**).  
4. Add one exam, one subject if the form allows.  
5. Enter a mark (example 70 out of 100). Save draft.  
6. If there is **Finalize**, try it once.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Exam group page opens | ☐ | ☐ | ☐ |
| Marks can be saved | ☐ | ☐ | ☐ |
| Finalize locks or shows a clear message | ☐ | ☐ | ☐ |

---

## G. Public admission (no login)

1. Open a **private / incognito** window.  
2. Go to: https://web-production-99e97.up.railway.app/apply  
3. Fill first name `Ravi`, mobile a fake 10-digit number.  
4. Submit.

| Check | Pass | Fail |
|---|---|---|
| Apply page loads without login | ☐ | ☐ |
| Submit gives an application number (like APP-…) | ☐ | ☐ |

Then as **admin**: **Online admission / student inbox** (`/staff/onlinestudent`) — the new name should appear.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Application shows in staff inbox | ☐ | ☐ | ☐ |

---

## H. Hostel and transport

As **admin**:

1. **Hostel** (`/staff/hostel`) — add a hostel name `Boys 1` if empty.  
2. **Hostel room** — add a room with capacity 1.  
3. **Assign room** — allot Demo Student.  
4. Try allotting the **same room again** to another student if you have one — it should **refuse** (full).

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Hostel + room can be saved | ☐ | ☐ | ☐ |
| Allotment works | ☐ | ☐ | ☐ |
| Full room is rejected | ☐ | ☐ | ☐ |

**Transport:** **Route** (`/staff/route`) — add a route and a pickup point. Assign student. First assignment may add a transport fee.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Route can be saved | ☐ | ☐ | ☐ |
| Student can be assigned | ☐ | ☐ | ☐ |

---

## I. Library

1. **Books** (`/staff/book/getall`) — add title `Physics`, quantity **1**.  
2. **Student member** — add Demo Student as member.  
3. **Issue** (`/staff/member`) — issue the book.  
4. Issue the **same book again** — should fail (no copy left).  
5. **Return** the book.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Book saved | ☐ | ☐ | ☐ |
| Member created | ☐ | ☐ | ☐ |
| First issue works | ☐ | ☐ | ☐ |
| Second issue is blocked | ☐ | ☐ | ☐ |
| Return works | ☐ | ☐ | ☐ |

---

## J. Front office (enquiry)

1. **Enquiry** (`/staff/enquiry`) — name `Walk-in Parent`, phone `9000000099`. Save.  
2. If there is convert / won — try convert to application.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Enquiry saves | ☐ | ☐ | ☐ |
| Convert creates an application **or** a clear “already converted” message | ☐ | ☐ | ☐ |

---

## K. Certificates / ID card

1. **Generate ID card** search (`/staff/generateidcard/search`) — pick Demo Student, generate / PDF.  
2. **Certificate** (`/staff/generatecertificate`) — Bonafide if listed.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| ID card / PDF downloads or opens | ☐ | ☐ | ☐ |
| Certificate generates | ☐ | ☐ | ☐ |

---

## L. Messages (SMS/email templates)

1. **SMS template** (`/staff/mailsms/sms-template`).  
2. You should see a `fee_due` style template with `{{name}}` placeholders.  
3. **Do not** expect a real SMS on the phone unless someone set a paid SMS gateway.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Template list/edit opens | ☐ | ☐ | ☐ |
| Saving a small text change works | ☐ | ☐ | ☐ |

---

## M. NAAC

1. **NAAC Dashboard** (`/staff/naac/dashboard`) — seven criteria (C1–C7) with % .  
2. **Task Master** (`/staff/naac`) — add a task on criterion 1.  
3. **Task Allocation** — assign to Demo Teacher, try **Complete** with no evidence (should refuse), then add a file path like `uploads/naac/proof.pdf` and complete.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Dashboard shows 7 criteria | ☐ | ☐ | ☐ |
| Task can be created | ☐ | ☐ | ☐ |
| Complete without evidence fails | ☐ | ☐ | ☐ |
| Complete with evidence works | ☐ | ☐ | ☐ |

---

## N. CO-PO (outcomes)

1. **Program outcomes** (`/staff/copo/program-outcomes`) — add `PO1` / short title.  
2. **Course outcomes** — add `CO1` on any subject.  
3. **CO-PO mapping** — weight **3**. Try weight **4** — should refuse.  
4. **OBE / outcome** report (`/staff/outcome-basis-education`) — pick program BA and Compute.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| PO and CO save | ☐ | ☐ | ☐ |
| Weight 3 saves, weight 4 rejected | ☐ | ☐ | ☐ |
| Attainment page runs without crashing | ☐ | ☐ | ☐ |

---

## O. Feedback

1. **Add form** (`/staff/feedback/feedback-formname-master`) — name `Teacher rating`.  
2. **Fields** (`/staff/feedback`) — add a **Rating 1–5** question.  
3. **Assign** — open window from yesterday to tomorrow.  
4. **Fill** — submit as Demo Student with rating 4.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Form + field save | ☐ | ☐ | ☐ |
| Window can be opened | ☐ | ☐ | ☐ |
| Fill submits | ☐ | ☐ | ☐ |
| Report shows an average (or at least 1 response) | ☐ | ☐ | ☐ |

---

## P. Payroll (admin / accountant style)

1. **Pay elements** (`/staff/staffpayroll/add-element`) — list should include BASIC, PF, ESI, PT, TDS.  
2. **Select pay element** — attach **BASIC** ₹12000 and **DA** ₹8000 to Demo Teacher.  
3. **Generate payroll** (`/staff/staffpayroll/staff-payroll`) — year this year, month this month. Run.  
4. You should see PF (about ₹1800 if basic+DA is ₹20,000) and a **net** pay.  
5. Run the **same month again** — should say already generated.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Elements list loads | ☐ | ☐ | ☐ |
| Structure save works | ☐ | ☐ | ☐ |
| First monthly run works | ☐ | ☐ | ☐ |
| Duplicate month is blocked | ☐ | ☐ | ☐ |

---

## Q. Seating

1. **Seating blocks** (`/staff/seating-arrangement`) — block `Hall A`, capacity **2**.  
2. **Assign block** — pick an exam paper if listed, class FY BA, select Hall A, auto-allocate.  
3. If the class has more than 2 students, it should **refuse**. Raise capacity to 20 and retry.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Block saves | ☐ | ☐ | ☐ |
| Over-capacity is rejected **or** seats appear when capacity is enough | ☐ | ☐ | ☐ |
| Report lists seat numbers like Hall A-01 | ☐ | ☐ | ☐ |

---

## R. Google Meet / Zoom (links only)

1. **Gmeet Live Classes** → Live Classes (`/staff/gmeet/timetable`).  
2. Title `Demo lecture`.  
3. Meeting URL **must** be like `https://meet.google.com/aaa-bbbb-ccc` (https).  
4. Save. Click **Join**.  
5. Try a fake URL `https://google.com` — should **refuse**.

| Check | Pass | Fail | Skip |
|---|---|---|---|
| Valid Meet link saves | ☐ | ☐ | ☐ |
| Join opens a new tab | ☐ | ☐ | ☐ |
| Wrong website URL is rejected | ☐ | ☐ | ☐ |

This does **not** create a real Google meeting by itself. It only stores the link.

---

## S. Student portal

1. Log out. Portal **Student**, user `student1`, password `Admin@12345`.  
2. Open Dashboard, Fees, Attendance, Exams, Profile, Notices.

| Check | Pass | Fail |
|---|---|---|
| Student dashboard loads | ☐ | ☐ |
| Fees / attendance / exams open without error | ☐ | ☐ |
| Student **cannot** open staff URL `/staff/studentfee` (should kick to login or forbid) | ☐ | ☐ |

---

## T. Parent portal

1. Portal **Parent**, user `parent1`, same password.  
2. Dashboard should mention Demo Student.

| Check | Pass | Fail |
|---|---|---|
| Parent dashboard loads | ☐ | ☐ |
| Child fees or attendance is visible | ☐ | ☐ |
| Parent cannot use staff collect-fees URL | ☐ | ☐ |

---

## U. Wrong password and lockout

1. Portal Staff, username `admin`, password `wrong`. Submit 2–3 times.

| Check | Pass | Fail |
|---|---|---|
| Error message is shown (not a white crash) | ☐ | ☐ |
| After many tries, “too many attempts” **may** appear | ☐ | ☐ |

Then log in correctly with `Admin@12345`.

---

## 4. End-of-day score

Count **Fail** items only on scripts A–U (ignore Skip).

| Fails | Meaning |
|---|---|
| 0 | Good enough for a demo walkthrough |
| 1–3 | Usable; list the fails for the developer |
| 4+ | Do not show to a college yet |

---

## 5. How to send a bug (copy this)

```
Date:
Browser (Chrome / Edge / phone):
Login used (admin / teacher / student1 / parent1):
Page URL:
What I clicked:
What I expected:
What happened:
Screenshot attached: yes / no
```

---

## 6. If you test on a phone

Repeat **A, S, T, G** only (login, student, parent, public apply). Staff grids are built for a **computer**.

---

## 7. Reminder

- Demo data is **fake** (Indore College, FY BA, STU-001).  
- Do not enter real Aadhaar or bank numbers.  
- Do not change the admin password unless you were asked to.  
- Online payment (Razorpay) will not complete without real gateway keys — skip card/UPI live pay unless someone confirmed keys are set.
