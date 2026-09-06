# Quality: NAAC, CO-PO, feedback, placements

College-accreditation layer sitting on top of SIS.

## NAAC

| Screen | Route |
|---|---|
| Dashboard | `/admin/naac/naac_dashboard` |
| Report master | `/admin/naac/naac_report_master` |
| Task master | `/admin/naac/index` |
| Task allocation | `/admin/naac/task_allocation` |
| Student feedback list | `/admin/naac/student_feedback_list` |
| Student rating form | `/admin/naac/student_rating_form` |
| NAAC report (Reports menu) | `/admin/naac/naac_report` |
| NAAC events (calendar) | `/admin/naac/events` |

Model:

- NaacCriterion (1–7 + key indicators)
- NaacTask (title, criterion, due, evidence required)
- NaacAssignment (task, staff, status)
- NaacEvidence (file, note)

Dashboard = completion percent by criterion.

## CO-PO (outcome-based education)

| Screen | Route |
|---|---|
| Course Outcomes | `/admin/copo/course_outcomes` |
| Program Outcomes | `/admin/copo/program_outcomes` |
| Create Lesson | `/admin/copo/lesson` |
| Plan | `/admin/copo/plan` |
| CO-PO Mapping | `/admin/copo/co_po_mapping` |
| TLP Approve List | `/admin/copo/tlp_approve_list` |
| Indirect PO Mapping | `/admin/copo/indirect_po_mapping` |
| OBE report | `/outcome_basis_education/index` |

Program Outcomes (PO/PSO) × Course Outcomes (per subject) mapped with weights 0/1/2/3.
Lessons map to COs. Assessments (questions/exams) map to COs. Attainment = direct (marks) + indirect (feedback).
TLP = teaching-learning plan waiting HOD approval.

## Feedback management

| Screen | Route |
|---|---|
| Add Form | `/feedback/feedback_formname_master` |
| Field Master | `/feedback/index` |
| Assign Form | `/feedback/assign_feedback_form` |
| View Form | `/feedback/showview_feedback_form` |
| Submitted | `/feedback/submitted_forms` |
| Fill | `/feedback/fill_feedback_form` |
| Report | `/feedbackreport/index` |

Form builder: fields (rating / text / MCQ) → assign to class/role/date window → collect → aggregate.
Used for student-on-teacher, curriculum, NAAC SSS.

## Training and placements

`/admin/tnp` drives, `/admin/tnp/tnp_company_list` companies.

Company → drive (date, eligibility, package) → applications → applied / shortlisted / offered.

## Task management

`/teacherlog` — staff todos. Ship only if a client asks.
