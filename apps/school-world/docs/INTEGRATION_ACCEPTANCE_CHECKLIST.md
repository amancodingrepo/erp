# Full-Stack Integration Acceptance Checklist

Run this checklist on a test installation before using real student or parent information.

## Startup and database
- [ ] `START-FULL-STACK.bat` creates `.env` if missing, starts PostgreSQL, builds the app, and starts the API.
- [ ] `http://localhost:3001/api/health` returns `ok: true` and `database: connected`.
- [ ] `docker compose logs app` has no migration or seed errors.
- [ ] Restart containers and verify data remains in the named PostgreSQL volume.

## Authentication and tenant isolation
- [ ] Sign in with a first-run account and change the temporary password.
- [ ] Create a second test school from Super Admin and sign in as its school admin.
- [ ] Verify the second school sees only its own students, routes, fees, notices, files, recipient people, and module state.
- [ ] Verify inactive users cannot sign in and cross-school entity IDs are rejected.
- [ ] Verify a parent/student account can only see recipient-eligible notices and cannot use school-admin-only endpoints.

## Manage Students
- [ ] Import a CSV with StudentID and StudentName columns; check created/updated counts.
- [ ] Open Edit Student, update student and parent fields, save, refresh the browser, and confirm values persist.
- [ ] Upload a student photo, refresh, and confirm it remains attached to that student code.
- [ ] Mark a student as a fee defaulter; verify counts/list filters update.
- [ ] Deactivate and reactivate Child-ID; verify status changes in the database and list.
- [ ] Change page size and verify pagination accurately reflects database-returned rows.

## Notice Board
- [ ] Create notices for School, Class, and Route audiences and for News, Alert, and both homework types.
- [ ] Change academic year and confirm other years are filtered out.
- [ ] Upload a permitted attachment, open/download it while authenticated, and test rejected oversized/invalid uploads.
- [ ] Sign in as an eligible linked recipient and open a notice; verify one row in `notice_views`.
- [ ] Open the same notice again as the same person; verify the unique view count does not increase.
- [ ] Export Views and Export Not Viewed; compare CSV rows to eligible recipients and actual `notice_views` rows.
- [ ] Verify ineligible users cannot record a view for that notice.

## Fees, attendance, routes, recipients
- [ ] Add/edit/delete a fee record and refresh.
- [ ] Mark attendance for a date, refresh, and ensure the same student/date is not duplicated.
- [ ] Add/rename/deactivate a route and verify notices/people use the updated route name.
- [ ] Create a recipient person and linked login account; test the account's correct role permissions.
- [ ] Reset an account password and require the user to change the temporary password.

## Backup and deployment
- [ ] Run the documented PostgreSQL backup command and restore it to a test database.
- [ ] Configure unique secrets/passwords, HTTPS, secure cookies, private backups, retention and monitoring before production.
- [ ] Conduct manual UAT with school administrators, teachers, parents and students before go-live.
