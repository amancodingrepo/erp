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
| `npm test` | Vitest: unit tests in `src/lib` plus API/acceptance suites in `src/test` |
| `npm run build` | Next.js production build |
| `npm run db:generate` | Prisma client |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:seed` | Org, campus, 2025-26 session, roles, admin |
| `npm run lint` | ESLint |

## CI / production gate

Postgres must be up, `.env` must have a working `DATABASE_URL`, and migrations applied (`npx prisma migrate deploy`). Then:

```bash
npm test && npm run build
```

That is the Task 13 gate. `src/lib` tests (permissions, password, headers) run without Postgres. `src/test` and `src/test/acceptance` need the seeded campus (`admin` / `SEED_ADMIN_PASSWORD`).

The acceptance matrix in `src/test/acceptance/` is one Vitest `it()` per bullet in `erp-spec/production/acceptance-tests.md`.
