# Examinations

Largest academic module in this college build. Live menu has **32 exam screens** plus online exams, seating, certificates.

## Screens

### Setup
| Screen | Route |
|---|---|
| Exam Type | `/admin/examgroup/exam_type` |
| Exam Group | `/admin/examgroup` |
| Exam Schedule | `/admin/exam_schedule` |
| Exam Form | `/admin/examgroup/exam_form` |
| Marks Grade | `/admin/grade` |
| Relative Grade | `/admin/grade/relative_Grade` |
| Marks Division | `/admin/marksdivision` |
| Result Remark | `/admin/result_remark` |

### Mark entry
| Screen | Route |
|---|---|
| Mark Entry Single Subject | `/admin/examgroup/markEntrySingleSubject` |
| Mark Entry Subjectwise | `/admin/examgroup/markEntrySubjectwise` |
| Mark Entry Multi Subjectwise | `/admin/examgroup/displaymarksexamsubjwise` |

### Results & documents
| Screen | Route |
|---|---|
| Exam Result | `/admin/examresult` |
| Backlog | `/admin/examresult/backlog` |
| Result Block/Unblock | `/admin/examresult/exam_result_block_unblock` |
| Design Admit Card | `/admin/admitcard` |
| Print Admit Card | `/admin/examresult/admitcard` |
| Design Marksheet Format | `/admin/exammarksheet` |
| Print Marksheet Format | `/admin/exammarksheet/marksheet` |
| Design Marksheet | `/admin/marksheet` |
| Print Marksheet | `/admin/examresult/marksheet` |
| Assign Seat Number | `/student/assign_seat_number` |

### ATKT / revaluation (university)
| Screen | Route |
|---|---|
| ATKT Form | `/admin/atkt_form/atkt_form_student` |
| Edit ATKT Form | `/admin/atkt_form/edit_atkt_form_student` |
| ATKT settings | `/admin/atkt_form/admissionsetting` |
| ATKT report | `/admin/atkt_form/atkt_form_report` |
| Revaluation Form | `/admin/examgroup/revaluation_form` |
| Revaluation settings | `/admin/revaluation_form/revaluationformsetting` |

### Paper + remuneration
| Screen | Route |
|---|---|
| Paper Setting | `/admin/papersetting` |
| Questions Paper Creation | `/admin/paper_creation` |
| Assign Staff (paper) | `/admin/paper_creation/assign_paper_creation` |
| Paper Approve List | `/admin/paper_creation/que_paper_approval_list` |
| Remuneration Setup | `/admin/examgroup/remuneration_setup` |
| Remuneration Hour Setup | `/admin/examgroup/remuneration_hoursetup` |
| Exam Remuneration Bill | `/admin/examgroup/exam_remuneration_bill` |

### Seating
| Screen | Route |
|---|---|
| Subject Details | `/seating_arrangement/index` |
| Assign Block | `/seating_arrangement/assign_block` |
| Report | `/seating_arrangement/report` |

### Online exams
| Screen | Route |
|---|---|
| Online Exam | `/admin/onlineexam` |
| Question Bank | `/admin/question` |
| Online exam report | `/admin/onlineexam/report` |

## Core workflow

```
ExamType (Unit / Mid / End-Sem / ATKT)
  → ExamGroup (linked to session + class set)
      → Exam (Term I Internal)
          → ExamSubjects (date, max, min, credit)
              → Students assigned (class roster or exam form)
                  → Seat numbers + seating blocks
                      → Admit cards
                          → Mark entry (locked per subject)
                              → Moderation / relative grade
                                  → Publish result (or block a student)
                                      → Marksheet print
                                          → Backlog / ATKT / revaluation
```

## Exam form

Students apply to appear (regular or ATKT), pay exam fee, subjects selected. Settings page controls dates and fees.

## Mark entry UX

- Filter exam group → exam → class → subject
- Grid of students with marks / absent checkbox
- Save draft vs finalize
- After finalize, only privileged role can edit (audit)

Relative grade: compute letter from cohort distribution rather than absolute slabs.

Division: First / Second / Pass based on aggregate %.

## Result block

`exam_result_block_unblock` — hide a student’s result (dues, UFM, missing docs) without deleting marks.

## Templates

Admit card and marksheet are HTML templates with placeholders:

`{{student_name}} {{roll}} {{exam}} {{photo}} {{subjects_table}} {{qr}}`

Rebuild as a template engine (Handlebars/MJML/PDF). Do not store 20 copy-paste PHP views.

## Online exam (CBT)

Question bank: MCQ / descriptive, marks, subject, difficulty.
Exam: start-end, duration, question pick (fixed or random), negative mark.
Student attempts; auto-score MCQ; teacher scores descriptive.

## Seating

1. Define rooms/blocks with capacity
2. Attach exam-subject
3. Auto-allocate students (mix colleges/roll gaps if needed)
4. Print attendance chart + seat sticker

## Paper-setting workflow (custom)

Create paper → assign faculty → faculty uploads → HOD/COE approves.
Remuneration: rates per paper / per hour → bill.

## Rebuild priority

MVP: Exam group + subjects + mark entry + result list + PDF marksheet.
Phase 2: admit card, seating, ATKT.
Phase 3: CBT, remuneration, relative grading.
