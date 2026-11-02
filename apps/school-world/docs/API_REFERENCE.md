# School Diary REST API Reference

Base path: `/api`. The frontend calls the API through `src/api.js` with same-origin requests and credentialed HTTP-only session cookies. Unless noted as public, endpoints require a logged-in account.

## Health and sessions

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Checks API/database connectivity |
| POST | `/auth/login` | Sign in with email/password; rate limited |
| POST | `/auth/logout` | Clears the session cookie |
| GET | `/auth/me` | Current account, role and school information |
| POST | `/auth/change-password` | Changes temporary/current password |
| GET | `/bootstrap` | Returns current school, academic years, active classes and user |
| PATCH | `/school/settings` | Updates school name/contact/config for current tenant; admin/principal |

## Tenant administration and accounts

| Method | Path | Description |
|---|---|---|
| GET | `/superadmin/schools` | List school tenants and counts; super admin only |
| POST | `/superadmin/schools` | Create school + first school-admin account; super admin only |
| GET | `/people` | Directory identities; admin/principal/staff |
| POST | `/people` | Create recipient identity; admin/principal/staff |
| GET | `/users` | Accounts belonging to current school; admin/principal |
| POST | `/users` | Create school-role login linked to a person; admin/principal |
| PATCH | `/users/:userId` | Activate/deactivate an account; admin/principal |
| POST | `/users/:userId/reset-password` | Create temporary password; admin/principal |

## Students, fees, attendance, routes

| Method | Path | Description |
|---|---|---|
| GET | `/students` | Search/list students; optional `q`, `status`, `year`, `className` |
| POST | `/students` | Create a student |
| PATCH | `/students/:studentCode` | Update mapped student fields |
| POST | `/students/import` | Import/upsert CSV-parsed student rows, maximum 2,000 rows per request |
| GET | `/student-details` | Additional Edit Student payload indexed by student code |
| PUT | `/students/:studentCode/details` | Save additional student form fields |
| POST | `/students/:studentCode/reset-password` | Reset linked student account if present; admin/principal |
| GET | `/fees` | Fee ledger; optionally filter to student code |
| POST | `/fees` | Add fee record |
| PATCH | `/fees/:feeId` | Update fee/payment values |
| DELETE | `/fees/:feeId` | Delete fee record; admin/principal |
| GET | `/attendance` | Attendance by date |
| POST | `/attendance/bulk` | Upsert attendance records for a date |
| GET | `/routes` | List active route names |
| POST | `/routes` | Add/re-enable a route |
| PATCH | `/routes/:name` | Rename route and update matching notice/people assignments |
| DELETE | `/routes/:name` | Deactivate a route |
| GET | `/transport/routes` | Route, stop and vehicle details |
| POST | `/transport/routes` | Add/update route details |
| DELETE | `/transport/routes/:name` | Deactivate route |

## Notices and less mature modules

| Method | Path | Description |
|---|---|---|
| GET | `/notices` | Returns notices allowed for current account/school; supports `year` |
| POST | `/notices` | Publish a school/class/route notice and attachment metadata/data |
| DELETE | `/notices/:noticeId` | Delete notice in the current school |
| GET | `/notices/:noticeId/attachments/:attachmentId` | Authenticated attachment download and eligible view recording |
| POST | `/notices/:noticeId/views` | Idempotently record a real eligible recipient view |
| GET | `/notices/:noticeId/report?status=viewed|not-viewed` | CSV of eligible recipients and their view status; admin/principal/teacher/staff |
| GET | `/module-data/:moduleKey` | Read module JSONB state for current school |
| PUT | `/module-data/:moduleKey` | Write module JSONB state for current school (max payload 2 MB) |

## Conventions and limits

- Responses are JSON except CSV-report/download endpoints; errors use an HTTP status and JSON error message.
- SQL values are passed through PostgreSQL parameters. Tenant-owned records must be queried by the authenticated `school_id`.
- Dates use ISO `YYYY-MM-DD`, with DD-MM-YYYY accepted during student CSV import.
- Newly created bootstrap accounts must change their temporary password before using protected data routes.
- This endpoint list documents the implemented starter. Generate a formal OpenAPI document and contract tests before supporting third-party clients or public API commitments.
