# DEV-TEST-01 Authenticated E2E

This suite is isolated from the existing Playwright suite and is intended for a disposable local PostgreSQL database. It never falls back to `DATABASE_URL` and never uses the demo seed.

## Prerequisites

- Node 20+, dependencies installed, and PostgreSQL 16 reachable on a local/loopback host.
- A dedicated database named exactly `lucem_retail_e2e`, user `lucem_e2e`, loopback host, and dedicated port `55432`. Port `5432` and every other database name are rejected.
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

The commands above are intentionally separate: preparation validates `E2E_DATABASE_URL`, assigns only that validated value to `process.env.DATABASE_URL` before Prisma is imported/created, runs only `prisma migrate deploy`, and seeds the namespace. Cleanup is explicit, idempotent, verifies zero namespace rows, disconnects on every path, and only accepts that same URL guard. Do not set `DATABASE_URL` as a substitute for `E2E_DATABASE_URL`.

The guard accepts only PostgreSQL URLs with a loopback host, exact database `lucem_retail_e2e`, user `lucem_e2e`, and port `55432`. It never reads an existing `.env` file or falls back to `DATABASE_URL`. Missing URL, unavailable PostgreSQL, connection, or migration errors use the exact prefix `BLOCKED: E2E PostgreSQL unavailable: ...`; the original cause remains after the prefix.

## Deterministic dataset

The private seed in `scripts/e2e/seed.ts` creates `DEV-TEST-01 Centro` and `DEV-TEST-01 Norte`, three fictitious users with `.invalid.test` emails, and real memberships: ADMIN belongs to both businesses, SELLER and INVENTORY_MANAGER belong only to Centro. Centro has deterministic catalog SKUs `DEV-TEST-01-ZERO`, `DEV-TEST-01-LOW`, and `DEV-TEST-01-NORMAL`, stock states zero/low/normal, and two confirmed sales today. Its expected dashboard is gross/net `250.00`, units `3`, COGS `100.00`, profit `150.00`, one out-of-stock variant, one low-stock variant, and two recent sales. Norte has a separate product and no sales, so its dashboard is empty and its catalog cannot be confused with Centro.

Passwords exist only in the environment and login requests. They are not printed, stored in Git, or written to screenshots. Playwright setup logs in through the legitimate `POST /api/auth/login`, validates status, user, businesses, redirect, then uses legitimate `POST /api/businesses/select` and validates the active business before writing `playwright/.auth/admin.json`, `seller.json`, and `inventory.json`. These states are regenerated each run, ignored by Git, and never contain manually inserted cookies or tokens.

## Coverage

- `api.spec.ts`: real login success/failure, member/non-member selection, role-derived write permissions without audit, exact Centro metrics, and Centro/Norte catalog, inventory, sales, variants, and ID isolation.
- `browser.spec.ts`: authenticated real dashboard values, accessible names/focus/size/overflow checks, role navigation, admin-only Auditoría visibility without requesting its endpoint, real logout, and protected-route redirect.
- `dashboard-states.spec.ts`: explicitly labeled UI-only pending, empty, and error/retry fixtures intercepting only `/api/dashboard`; they do not prove auth or business data.
- `visual.spec.ts`: authenticated screenshots at 1440x768, 1440x900, 768x1024, and 390x844 under ignored `test-results/dev-test-01`, named with role/business/project/URL context and HEAD marker. This repository does not claim visual PASS unless the environment actually runs the suite.

The setup and specs deliberately contain no `GET /api/audit` request. Required security warning: `GET /api/audit exposes passwordHash`. This suite does not use audit for permission checks.

## Blocked status and cleanup

If `E2E_DATABASE_URL` is absent, fails the loopback/name/port guard, PostgreSQL is unavailable, or migration fails, stop with `BLOCKED: E2E PostgreSQL unavailable`, retain the exact command/error in the run record, and do not use development credentials or `DATABASE_URL`. If the focused suite runs, execute cleanup afterward even after test failures. Never run cleanup with a different URL and never point it at the development or production database.

The current status is `BLOCKED` until an explicitly provisioned E2E PostgreSQL database is available. Safe absent-URL checks must emit `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` No global Playwright run is performed by the safe verification workflow.
