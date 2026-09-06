# Student and parent portals

Not crawled (staff session only). This is the STANDARD Smart School student/parent IA plus routes that exist on this host.

## Live login routes

- Student/parent login page: `GET /site/userlogin` (confirmed 200)
- Student home: `/user/user/dashboard`
- Parent home: `/parent/parents/dashboard`
- Application login: `/welcome/loginAplication`

## Student portal screens to build

| Area | Student capabilities |
|---|---|
| Profile | View bio, photo, guardians; edit only fields allowed in `/student/profilesetting` |
| Fees | Ledger, due, pay online, download receipt |
| Timetable | Own class-section grid |
| Attendance | Monthly view |
| Homework | List, submit file, see evaluation |
| Download center | Shared content for class |
| Examinations | Admit card, result (if not blocked), marksheet PDF |
| Online exam | Attempt windowed CBT |
| Notice board | Published notices |
| Library | Issued books / due dates |
| Hostel / transport | Allocation if any |
| Apply ATKT / revaluation / exam form | When settings window is open |

## Parent portal

Same read models, scoped to linked children. Child switcher required. Pay fees for selected child. Cannot edit academic records.

## API scoping

Student token: `actorType=STUDENT`, `studentId` claim.  
Queries forced to that id. Never accept another `studentId` from the client.

Parent token: `guardianId` + allow-list of `studentId`s from `StudentGuardian`.
