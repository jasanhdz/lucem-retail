# DEV-TEST-01 Authenticated E2E

This suite is isolated from the existing Playwright suite and is intended for a disposable local PostgreSQL database. It never falls back to `DATABASE_URL` and never uses the demo seed.

## Prerequisites

- Node 20+, dependencies installed, and PostgreSQL 16 reachable on a local/loopback host.
- A dedicated database whose name clearly ends in `_e2e` or `_test`, for example `lucem_retail_e2e`, and a dedicated E2E user. Port `5432` is rejected; use a dedicated port such as `55432`.
- Docker is optional. The suite does not run Docker commands because the host may not have Docker. If PostgreSQL, readiness, migration, or the URL guard is unavailable, the result is `BLOCKED: E2E PostgreSQL unavailable`; no shared database is used.

Copy `.env.e2e.example` to `.env.e2e` and export its values without committing the file. Required password variables are `E2E_ADMIN_PASSWORD`, `E2E_SELLER_PASSWORD`, and `E2E_INVENTORY_PASSWORD`; each must be at least 12 characters. `SESSION_SECRET` is kept separate from development when the local runtime requires it.

## Commands

```bash
set -a; source .env.e2e; set +a
npm run e2e:prepare
npm run test:e2e:auth
npm run test:e2e:visual
npm run e2e:cleanup
```

The commands above are intentionally separate: preparation validates `E2E_DATABASE_URL`, runs only `prisma migrate deploy` with child-process `DATABASE_URL` set to that same validated URL, and seeds the namespace. Cleanup is explicit and only accepts that same URL guard. Do not set `DATABASE_URL` as a substitute for `E2E_DATABASE_URL`.

The guard accepts only PostgreSQL URLs with a loopback host, rejects absent or ambiguous URLs, shared/production names, and port `5432`. It does not inspect or load an existing `.env` file. `scripts/e2e/cleanup.ts` deletes only DEV-TEST-01 rows in FK-safe order and is idempotent; it does not truncate tables or manage a container/volume.

## Deterministic dataset

The private seed in `scripts/e2e/seed.ts` creates `DEV-TEST-01 Centro` and `DEV-TEST-01 Norte`, three fictitious users with `.invalid.test` emails, and real memberships: ADMIN belongs to both businesses, SELLER and INVENTORY_MANAGER belong only to Centro. Centro has deterministic catalog SKUs `DEV-TEST-01-ZERO`, `DEV-TEST-01-LOW`, and `DEV-TEST-01-NORMAL`, stock states zero/low/normal, and two confirmed sales today. Its expected dashboard is gross/net `250.00`, units `3`, COGS `100.00`, profit `150.00`, one out-of-stock variant, one low-stock variant, and two recent sales. Norte has a separate product and no sales, so its dashboard is empty and its catalog cannot be confused with Centro.

Passwords exist only in the environment and login requests. They are not printed, stored in Git, or written to screenshots. Playwright setup logs in through the legitimate `POST /api/auth/login`, validates status, user, businesses, redirect, then uses legitimate `POST /api/businesses/select` and validates the active business before writing `playwright/.auth/admin.json`, `seller.json`, and `inventory.json`. These states are regenerated each run, ignored by Git, and never contain manually inserted cookies or tokens.

## Coverage

- `api.spec.ts`: real login success/failure, business list/select/change/rejection, dashboard contract, exact Centro metrics, and Norte isolation.
- `browser.spec.ts`: authenticated dashboard, role navigation, admin-only Auditoría visibility without requesting its endpoint, seller/inventory exclusion, responsive overflow check, real logout, and protected-route redirect.
- `visual.spec.ts`: authenticated dashboard screenshots at 1440x900, 768x1024, and 390x844 under ignored `test-results/dev-test-01`. Compare these captures manually with the existing Stitch references in `docs/ui-redesign/dev-01b-visual-evidence/`; this repository does not claim visual PASS unless the environment actually runs the suite.

The setup and specs deliberately contain no `GET /api/audit` request. Required security warning: `GET /api/audit exposes passwordHash`. This suite does not use audit for permission checks.

## Blocked status and cleanup

If `E2E_DATABASE_URL` is absent, fails the loopback/name/port guard, PostgreSQL is unavailable, or migration fails, stop with `BLOCKED: E2E PostgreSQL unavailable`, retain the exact command/error in the run record, and do not use development credentials or `DATABASE_URL`. If the focused suite runs, execute cleanup afterward even after test failures. Never run cleanup with a different URL and never point it at the development or production database.

The current implementation has not been declared PASS or visually approved until the commands are run against an explicitly provisioned E2E PostgreSQL database.
