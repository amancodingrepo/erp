# College ERP app

Next.js 15 staff desk at `/staff/*`. Spec: `../../erp-spec/`.

## Run

1. Use local PostgreSQL 18 (no Docker). Default URL is `postgresql://postgres:postgres@localhost:5432/erp`.
2. Copy env and seed:

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

3. Open http://localhost:3000/login  
   SuperAdmin: `admin` / `Admin@12345` (`SEED_ADMIN_PASSWORD` overrides this).

## Scripts

| Script | What it does |
|---|---|
| `npm test` | Vitest (`src/lib/permissions.test.ts`) |
| `npm run db:generate` | Prisma client |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:seed` | Org, campus, 2025-26 session, roles, admin |
| `npm run lint` | ESLint |
