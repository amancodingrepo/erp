# Academics

Menu group: **Academics** + **Lesson Plan** + **Assignment** + **Annual Calendar**.

## Purpose

Define the teaching structure for a session, then attach people and time.

## Screens (live)

| Screen | Route | Function |
|---|---|---|
| Class | `/classes` | CRUD class (FY/SY/TY or Sem-1…) |
| Sections | `/sections` | Sections per class |
| Department | `/department` | Faculty/dept master |
| Program | `/course_master` | Degree/program master |
| Specialization | `/sectionwise_specialization` | Major/minor tracks |
| Assign Major/Minor | `/sectionwise_specialization/assign_program` | Attach track to section |
| Program Intake | `/Programintake` | Seats per program per session |
| Subjects | `/admin/subject` | Subject master |
| Semester / subject group | `/admin/subjectgroup` | Bundle subjects into a semester offering |
| Class timetable | `/admin/timetable/classreport` | Grid class×day×period |
| Teacher timetable | `/admin/timetable/mytimetable` | Per teacher |
| Assign class teacher | `/admin/teacher/assign_class_teacher` | Homeroom |
| Assign subject teacher | `/admin/teacher/assign_subject_teacher` | Who teaches what |
| Promote students | `/admin/stdtransfer` | Session-end promotion |
| Working days | `/admin/holiday/set_working_days` | Calendar |
| Staff week off | `/admin/holiday/staff_week_off` | |
| Add assignment | `/homework` | Homework with attachments, dates, evaluation |
| Lesson / topic | `/admin/lessonplan/lesson`, `/topic` | Syllabus breakdown |
| Manage lesson plan | `/admin/syllabus` | Plan vs taught |
| Syllabus status | `/admin/syllabus/status` | % complete |
| Copy old lessons | `/admin/lessonplan/copylesson` | Clone from previous session |
| Instruction plan | `/admin/lessonplan/instruction_plan` | |

## Workflows

### 1. Year setup
1. Create/activate `AcademicSession` (`/sessions`)
2. Confirm Departments → Programs → Classes → Sections
3. Set intake seats
4. Create subjects and subject-groups (semester bundles)
5. Assign subject teachers and class teachers
6. Build timetable against working days

### 2. Promote
Select from class-section → to class-section + next session.
Options usually: promote all / selected, carry roll numbers or regenerate, carry fee balances (`Fees Carry Forward`).

### 3. Homework
Teacher creates homework: class, section, subject, description, submit-by, attachment.
Student submits; teacher evaluates (marks/remark). Status: pending / submitted / evaluated.

## Fields worth copying

**Subject:** name, code, type (theory/practical), optional flag.

**Timetable cell:** class, section, weekday, period, start-end, subject, staff, room.

**Homework:** title, description, class, section, subject, assigned_date, due_date, document, created_by.

## Rebuild tips

- Period master (Period 1 = 09:00–09:50) beats free-text times.
- Clash detection: teacher cannot be in two rooms same period; room unique per period.
- Promotion should be a single transaction that writes new `StudentEnrollment` rows rather than mutating history.
