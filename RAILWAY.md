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

6. Generate a public domain. After the service is **live**, open `/login` as `admin` / `SEED_ADMIN_PASSWORD`.

Start command (already in `apps/erp/railway.json`): `npm run start:railway`  
That runs `prisma migrate deploy`, seed, then `next start`.

Health: `GET /api/health` → `{ "ok": true, "db": "up" }`.

## CLI (only when you want a deploy)

From `apps/erp` (linked project):

```bash
railway up --detach -m "erp"
```
