# DEV-SEC-01 Audit API

## Root Cause

`GET /api/audit` used `include: { user: true }`. Prisma therefore loaded and serialized the complete related `User`, including `passwordHash` and authentication-related relations. The endpoint's authorization and business filter were otherwise present.

The required production warning is: `GET /api/audit exposes passwordHash`.

## Projection

Before:

```ts
include: { user: true }
```

After, the `AuditLog` projection is explicitly limited to `id`, `businessId`, `userId`, `action`, `entityType`, `entityId`, `metadata`, and `createdAt`. The optional actor projection is limited to `id`, `name`, `email`, and `active`. No `User` relations, `passwordHash`, token/session fields, or credentials are selected.

## Security Contract

- `getAuth()` remains the first authorization check.
- Missing session or active business returns `401` with the existing error shape.
- Only `ADMIN` is permitted; `SELLER` and `INVENTORY_MANAGER` return `403` with the existing error shape.
- The query filters by `businessId: auth.business.id`, orders by `createdAt desc`, and keeps `take: 100`.
- The directed E2E uses real login, real Playwright storage states, real business selection, and deterministic `DEV-TEST-01` Centro/Norte audit rows.
- A recursive case-insensitive scan checks every response object and array for sensitive keys, without printing response payloads.

## Tests And Results

Executed:

- `npm run lint` PASS.
- `npm run typecheck` PASS.
- `npm test` PASS: 6 files, 15 tests.
- `npm run build` PASS.
- `git diff --check` PASS after implementation and documentation.
- Static search confirms `/api/audit` calls exist only in `e2e/dev-sec-01/audit.spec.ts` under E2E suites.

Focused E2E commands were attempted without a database fallback:

- `CI=1 npm run test:e2e:security -- --reporter=list` BLOCKED: `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`
- `npm run e2e:prepare` BLOCKED: `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`
- `CI=1 npm run test:e2e:auth -- --reporter=list` BLOCKED: `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`
- `npm run e2e:cleanup` BLOCKED: `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`

Docker was available, but no dedicated E2E URL and credentials were supplied. No container, database, migration, seed, or cleanup resource was created. The authenticated E2E criteria are therefore BLOCKED, not PASS.

## Scope And Risks

The legacy/global E2E suite was not run. Its protected-handler smoke previously called `/api/audit`; that call was removed from the legacy list, and the only remaining E2E calls are in the focused DEV-SEC suite. The global suite is not evidence for this change and remains intentionally excluded.

`GET /api/audit exposes passwordHash` remains a production-risk warning until this change is deployed and verified against the isolated E2E database. The focused authenticated HTTP evidence is still BLOCKED because `E2E_DATABASE_URL` was unavailable. No production database or real credentials were used.

## Commit

Required commit message: `fix(security): remove sensitive fields from audit API`
