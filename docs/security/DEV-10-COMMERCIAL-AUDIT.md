# DEV-10 Commercial Audit Consistency

## Transaction Contract

Business-changing writes and their audit rows use the same Prisma transaction client. The audit helper accepts `Prisma.TransactionClient`; handlers do not create nested transactions or write a second audit after commit.

The atomic flows are:

- Sales creation, including Kardex movements and sale idempotency.
- Inventory purchases and adjustments, including the inventory movement.
- Reservation creation, release, expiration, and conversion.
- Product creation, critical price/cost changes, and archive.
- Sale cancellation.
- Business creation, including membership, default category, active business, idempotency, and audit.
- Returns, retained from DEV-07B, including stock and Kardex rollback on audit failure.

Replay paths return the existing persisted result and do not create duplicate audit rows or movements. Historical movement meaning is unchanged.

## Controlled Failure Injection

The `x-lucem-e2e-fail-audit: 1` header is effective only when all of the following are true:

- The application is not running with `NODE_ENV=production`.
- `E2E_AUDIT_FAILURES=1` is explicitly supplied by the E2E configuration.
- `E2E_DATABASE_URL` names the dedicated `lucem_retail_e2e` database.

No production endpoint or generic non-production environment enables the control. DEV-10 tests use a disposable PostgreSQL container and verify that failed audits roll back business rows, stock, Kardex, reservations, and idempotency state before a safe retry.

## Verification

DEV-10 passed `4/4`: session renewal/revocation/logout, sale rollback plus idempotent retry, and inventory/reservation rollback plus retry. DEV-07 returns remains the reference for return rollback, idempotency, concurrency, permissions, and isolation.

## Residual Risk

Authentication audit events for login, registration, and logout remain outside commercial write transactions because they describe session/account lifecycle rather than a commercial state transition. Commercial handlers no longer return a post-commit error caused by their own audit write.
