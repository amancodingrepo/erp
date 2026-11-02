# Operations, Backup, Security and Production Readiness

## Local backup

Run from the project directory where `.env` and `docker-compose.yml` live:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > school-diary-backup.dump
```

The dump contains personal data and is not encrypted by the command. Store it in an access-controlled, encrypted location outside the project folder.

## Restore to a fresh target database

**This destroys existing data in the target database.** Ensure it is the intended database and make a backup first.

```bash
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < school-diary-backup.dump
```

When restoring to a different environment, use `pg_restore --no-owner --no-privileges` if role/ownership metadata isn't portable. Test restores regularly.

## Security checklist before storing real student records

- [ ] Deploy behind HTTPS and set `COOKIE_SECURE=true`.
- [ ] Generate a unique `JWT_SECRET` of at least 32 random characters; protect `.env` and never commit it.
- [ ] Change all bootstrap passwords and disable/remove demo accounts that aren't needed.
- [ ] Set `SEED_DEMO_DATA=false` only after verifying the intended tenant and administrator exist.
- [ ] Keep PostgreSQL off the public network. The provided Compose file doesn't publish the database port to the host.
- [ ] Configure encrypted backups, retention, restore drills, uptime monitoring, and log review.
- [ ] Review role permissions, tenant isolation and cross-school attempts using separate test accounts.
- [ ] Review obligations around children's names, contact details, addresses, photographs, notice communications, consent and retention.
- [ ] Before public production use, add CSRF protection/origin validation, stricter Content Security Policy, request schema validation, and a security review.
- [ ] For larger datasets, move images/attachments to private object storage, add file allow-lists and malware scanning, and store only object keys in PostgreSQL.
- [ ] Add automated integration/E2E tests, performance tests, and an incident/recovery process.

## Known starter boundaries

- This has school-level tenant checks in API queries, but it has not been professionally security-audited or penetration-tested.
- Students/details, routes, fees, attendance, notices, notice attachments/views and recipient/login directory flows have database-backed APIs. Less mature module screens use a school-scoped JSONB payload in `module_records`; this is durable persistence, but not a normalized per-record workflow for every feature.
- Student photos and notice attachment bytes currently live in PostgreSQL; object storage is recommended for scale.
- No email/SMS delivery, automated password-reset emails, external SSO, payment gateway, file malware scanning, automated cloud CI/CD, or formal OpenAPI contract is bundled.
- Use `COOKIE_SECURE=false` only for local HTTP development on localhost. Public HTTPS deployments should use `COOKIE_SECURE=true` behind TLS.

## Release verification checklist

- [ ] `npm run build` succeeds.
- [ ] `/api/health` returns `database: connected`.
- [ ] Initial admin login requires password change.
- [ ] School A cannot read or mutate School B records.
- [ ] CSV import, student edit/photo, fees, attendance, and route changes persist after restart.
- [ ] Real users linked to student/parent/teacher/staff person profiles see only eligible notices.
- [ ] Reopening the same notice does not duplicate the unique view; viewed/not-viewed CSV reports are accurate.
- [ ] Notice attachments download only for eligible recipients or authorized staff.
- [ ] Recipient profile/account creation, reset password and deactivation work as expected.
- [ ] English/Hindi, Manage Students, Edit Student, My Branch, module navigation, exports and Notice Board workflows pass manual UAT.
- [ ] Backup restore is tested on a non-production instance.
