# Campus database backup

Operators run `pg_dump` on the host or in the database provider console. The ERP process never shells out `pg_dump` from a Next.js route.

`/staff/updater` (System Update) stays disabled. Do not enable `module.updater.enabled`.

## Dump

Replace the connection string with the campus `DATABASE_URL` (never commit it).

```
pg_dump --format=custom --file=erp-$(date +%Y%m%d).dump "$DATABASE_URL"
```

On Windows PowerShell:

```
pg_dump --format=custom --file=erp-backup.dump $env:DATABASE_URL
```

Store dumps off the app server. Encrypt at rest if the volume is not already encrypted.

## Restore (destructive)

```
pg_restore --clean --if-exists --dbname="$DATABASE_URL" erp-YYYYMMDD.dump
```

Then apply migrations if the dump is older than the running schema:

```
cd apps/erp
npx prisma migrate deploy
```

## What this does not cover

- Object storage / upload files (copy the uploads directory or bucket separately)
- `.env` secrets (keep in the secret store, not in the dump)
