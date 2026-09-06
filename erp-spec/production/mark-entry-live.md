# Mark entry — LIVE contract

Captured from `/admin/examgroup/markEntrySingleSubject` with:

- exam_group_id = `3` (REGULAR OBE - 2025)
- exam_id = `10`
- session_id = `21`
- class_id = `1` (FY BPT)
- section_id[] = `1`
- subject_id = `227` (General Medicine)

14 students in the grid. Max marks on this paper: **60.00**.

## Cascade AJAX LIVE

| Step | Call | Body | Result shape |
|---|---|---|---|
| Sections | `GET /sections/getByClass?class_id=28` | | `{ data: [{ id, section_id, section }] }` sample section A `section_id=34` |
| Exams in group | `POST /admin/examgroup/getExamByExamgroup` | `exam_group_id` | `{ status:"1", data:[{ id, exam_group_id, session_id, is_publish, is_rank_generated, use_exam_roll_no, is_combine_exam, passing_percentage, is_grace, ...}] }` |
| Classes in group | `POST /admin/examgroup/getClassByExamgroup` | `exam_group_id` | `{ data:[{ classid, class }] }` |
| Subjects | `POST /admin/examgroup/getExamSubject` | `class_id, section_id, exam_id, exam_group_id` | `{ data:[{ subject_id, subject_name }] }` |

## Load grid

`POST /admin/examgroup/markEntrySingleSubject`  
(`search=search_filter` + cascade ids)

Returns HTML page containing `form.addsubjectresult`.

Sister page: `POST /admin/examgroup/markentrysubjectwise` (no exam dropdown; subject from group).

Export template: `/admin/examgroup/subject_marks_exportformat`

## Grid columns LIVE

Student ID · Roll Number · Student Name · Absent · Marks Obtained · Max Marks

## Save form LIVE

`POST /admin/examgroup/saveExamSubjectResult`  
`form.addsubjectresult` JSON response `{ status: 0|1, error{}, message }`

Per student row (arrays, same index):

| name | sample | meaning |
|---|---|---|
| `ispresent[]` | checkbox value `1` | checked = **Absent** (UI inverts: `.attendance_chk` checked → marks forced 0, readonly) |
| `attendence[]` | `0` | hidden attendance flag |
| `exam_group_exam_results_id[]` | empty until saved | result row id |
| `exam_group_class_batch_exam_student_id[]` | `183`,`184`,`349`,`169` | roster id |
| `exam_group_class_batch_exam_subject_id[]` | `227` | subject |
| `get_marks[]` | number | marks obtained |
| `max_marks[]` | `60.00` | display/validate |

Hidden once: `post_exam_id=10`, `post_exam_group_id=3`

Client validation LIVE: marks must be ≤ max marks (`Marks should not be greater than Max Marks(N)`).

## Exam record flags LIVE (from getExamByExamgroup)

`is_publish`, `is_rank_generated`, `use_exam_roll_no`, `is_combine_exam`, `is_grace`, `minimum_grace`, `maximum_grace`, `passing_percentage`, `is_active`

Map into Exam model. Finalize/publish is a separate flag from saving drafts.

## Rebuild mapping

```
PUT /api/v1/exams/:examSubjectId/marks
{ entries: [{ rosterId, marks, isAbsent }] }
```

Reject `marks > maxMarks`. Absent ⇒ store marks null or 0 and `isAbsent=true` — pick one and keep it consistent (live writes 0 + checkbox).
