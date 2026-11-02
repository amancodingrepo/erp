# Screen-to-Database Integration Map

This file identifies the persistence path used by the current full-stack edition. It is an implementation map, not a promise that every module has a separate normalized schema.

| User-facing screen/action | API path(s) | Database storage | Notes |
|---|---|---|---|
| Sign in / sign out / change password | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` | `user_accounts`, `schools`, `people` | HttpOnly session cookie; password hashes; forced change for bootstrap credentials |
| Super Admin school creation | `GET/POST /api/superadmin/schools` | `schools`, `academic_years`, `user_accounts`, `audit_logs` | Each school becomes a tenant; one initial school-admin account is created transactionally |
| School name and configuration | `GET /api/bootstrap`, `PATCH /api/school/settings` | `schools`, `school_classes`, `academic_years` | Tenant name/config hydrates the UI |
| Manage Students list/import | `GET /api/students`, `POST /api/students/import`, `POST /api/students` | `students`, `people`, `school_classes`, `student_parents` | CSV import validates required IDs/names and upserts within the active school |
| Student status/actions | `PATCH /api/students/:studentCode` | `students`, plus linked `people` where applicable | Core fields map to typed columns; flags are database-backed |
| Edit Student and photo | `GET /api/student-details`, `PUT /api/students/:studentCode/details`, `PATCH /api/students/:studentCode` | `student_details`, `students` | Extra form fields stored as JSONB per student; student photo is saved with the student record |
| Fees | `GET/POST /api/fees`, `PATCH/DELETE /api/fees/:feeId` | `fee_records` | Amounts and payment state persist server-side |
| Attendance | `GET /api/attendance`, `POST /api/attendance/bulk` | `attendance_records` | Unique student/date record |
| Transport routes | `GET /api/routes`, `GET/POST /api/transport/routes`, `PATCH/DELETE /api/routes/:name` | `school_routes` | Route rename also updates notice audience keys and recipient route assignments |
| Notice Board | `GET/POST /api/notices`, `DELETE /api/notices/:noticeId` | `notices`, `notice_attachments` | Notice audience, school, year, type and attachment metadata/data persist |
| Notice Open / Export Views / Not Viewed | `POST /api/notices/:noticeId/views`, `GET /api/notices/:noticeId/report?status=...` | `notice_views` joined to eligible recipient profiles in `people`/`students` | Unique notice/person pair ensures repeat opens do not inflate unique view counts |
| Contacts / recipient directory | `GET/POST /api/people`, `GET/POST/PATCH /api/users`, account reset route | `people`, `user_accounts` | User login may be linked to a real recipient profile |
| Events, Messages, My Branch, questionnaire/store/day-care secondary module state | `GET/PUT /api/module-data/:moduleKey` | `module_records.payload` JSONB | Persisted per tenant and module key; domain-specific normalized workflows are future work where needed |
| Security/auditing/migrations | Automatic API logging and startup migration runner | `audit_logs`, `schema_migrations` | Do not edit already-applied migrations on a live database; add a new numbered migration |

## Runtime data flow

1. The browser calls the same-origin `/api` paths with credentials.
2. The Express API validates the request and authenticates the session.
3. Role checks guard protected routes. School-scoped routes obtain `school_id` from the authenticated account rather than trusting client-supplied tenant IDs.
4. The API executes parameterized PostgreSQL queries and returns JSON or CSV.
5. The UI refreshes its state from API responses; new data survives browser refreshes and is shared with authorized accounts within the same school tenant.

## Important boundaries

- This is a full-stack starter project with a real database layer, not a certified production deployment.
- A school needs populated and linked `people`/`user_accounts` records before recipient-specific notice view reporting can be complete.
- Some secondary modules currently persist state as tenant-scoped JSONB. Promote them to typed relational tables as the workflows are finalized.
- For large deployments, store photos/attachments in private object storage and store metadata/keys in PostgreSQL instead of storing large file payloads in database rows.
- Before real student data is used, run account-role UAT, cross-tenant isolation tests, backup restoration, retention/privacy review, and an HTTPS deployment review.
