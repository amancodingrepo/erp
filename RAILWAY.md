# Railway deploy (college ERP)

Do **not** set the service root to the git repo root. The Next.js app is **`apps/erp`**.

## Dashboard (recommended)

1. New project → **Empty project** (or use existing `college-erp`).
2. **Add Postgres**.
3. **Add service** from this GitHub repo.
4. Service settings:
   - **Root Directory:** `apps/erp`
   - Builder: **Dockerfile** (`Dockerfile` in that folder)
5. Variables on the **web** service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `AUTH_SECRET` | 32+ random characters |
| `NEXTAUTH_SECRET` | same as `AUTH_SECRET` |
| `FIELD_ENCRYPTION_KEY` | 32+ random characters |
| `SEED_ADMIN_PASSWORD` | login password for `admin` |
| `AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `NEXTAUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `SMTP_HOST` | SMTP server (optional; needed to email portal passwords) |
| `SMTP_PORT` | `587` (or `465` with `SMTP_SECURE=true`) |
| `SMTP_USER` / `SMTP_PASS` | SMTP login |
| `SMTP_FROM` | From address, e.g. `noreply@college.edu` |
| `EMAIL_WEBHOOK_URL` | Alternative to SMTP: POST `{channel,to,subject,body}` |

6. Generate a public domain. After the service is **live**, open `/login` as `admin` / `SEED_ADMIN_PASSWORD`.

Start command (already in `apps/erp/railway.json`): `npm run start:railway`  
That runs `prisma migrate deploy`, seed (skipped if campuses already exist unless `FORCE_SEED=true`), then `next start`.

SMTP can also be set in staff **Email (SMTP)** (`/staff/emailconfig`). Env `SMTP_*` overrides campus settings.

Health: `GET /api/health` → `{ "ok": true, "db": "up" }`.

Uploads: volume at `/app/uploads`, `UPLOAD_DIR=/app/uploads`.

Uploads: volume at `/app/uploads`, `UPLOAD_DIR=/app/uploads`.

**CI** (`.github/workflows/ci.yml`): on push/PR to `apps/erp` — unit tests + `tsc`, then integration tests against Postgres 16. Push to GitHub to start it.

**Backup job**
- In-app: SuperAdmin `/staff/admin/backup` (snapshot JSON + `pg_dump` onto the uploads volume, last 7 files). Production also dumps ~1 minute after boot, then daily.
- Scheduled: `.github/workflows/backup.yml` at 02:15 UTC POSTs to `/api/v1/backup/job` with `BACKUP_JOB_TOKEN`.
- GitHub secrets: `ERP_BACKUP_URL` = `https://<domain>/api/v1/backup/job`, `ERP_BACKUP_TOKEN` = same value as Railway `BACKUP_JOB_TOKEN`.
- Restore: SuperAdmin Backup screen — type `RESTORE`, then Restore on a dump. This replaces the live database.

## CLI (only when you want a deploy)

From `apps/erp` (linked project):

```bash
railway up --detach -m "erp"
```
