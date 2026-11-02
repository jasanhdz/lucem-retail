# DEV-TEST-01 Authenticated E2E

This suite is isolated from the existing Playwright suite and is intended for a disposable local PostgreSQL database. It never falls back to `DATABASE_URL` and never uses the demo seed.

## Prerequisites

- Node 20+, dependencies installed, and PostgreSQL 16 reachable on a local/loopback host.
- A dedicated database named exactly `lucem_retail_e2e`, user `lucem_e2e`, loopback host, and dedicated port `55432`. Port `5432` and every other database name are rejected.
- Docker Engine `29.9.2` is required for the verified disposable run. The Docker Compose plugin is not installed, so provisioning uses `docker run` only. If PostgreSQL, readiness, migration, or the URL guard is unavailable, the result is `BLOCKED: E2E PostgreSQL unavailable`; no shared database is used.

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
- `visual.spec.ts`: authenticated screenshots at 1440x768, 1440x900, 768x1024, and 390x844 under ignored `test-results/dev-test-01`, named with role/business/project/URL context and HEAD marker. The verified visual result is `4/4 passed`.

The setup and specs deliberately contain no `GET /api/audit` request. Required security warning: `GET /api/audit exposes passwordHash`. This suite does not use audit for permission checks.

## Blocked status and cleanup

If `E2E_DATABASE_URL` is absent, fails the loopback/name/port guard, PostgreSQL is unavailable, or migration fails, stop with `BLOCKED: E2E PostgreSQL unavailable`, retain the exact command/error in the run record, and do not use development credentials or `DATABASE_URL`. If the focused suite runs, execute cleanup afterward even after test failures. Never run cleanup with a different URL and never point it at the development or production database.

El estado actual de esta corrida es `PASS` en el entorno E2E desechable. Las comprobaciones seguras sin URL aún deben emitir `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` No se ejecutó una corrida global de Playwright.

## DEV-TEST-01B — Activación y validación final

### Provisionamiento y corrida real

Docker Engine `29.9.2` estaba operativo, pero el plugin Docker Compose estaba ausente (`docker compose` no estaba disponible). Se usó exclusivamente `docker run`, con estos nombres exactos:

- Contenedor: `lucem-retail-dev-test-01b-db`
- Volumen: `lucem-retail-dev-test-01b-pg`
- Imagen: PostgreSQL 16
- Base de datos: `lucem_retail_e2e`
- Usuario: `lucem_e2e`
- Puerto host: `55432` hacia PostgreSQL `5432`

El contenedor de desarrollo y su puerto `5432` no se tocaron. `psql` verificó la identidad del servidor E2E antes de la corrida.

Se ejecutó `npm run e2e:prepare` dos veces: la primera aplicó migración y seed; la segunda reportó que no había migraciones pendientes. Esto demostró que el seed no produjo duplicados. El login, la selección de negocio y los estados de sesión reales quedaron separados para `admin-centro`, `admin-norte`, `admin-isolation`, `seller` e `inventory` después de `a5fc623`, `cb27d27`, `96dedcb`, `c54b7e3`, `10fcd25`, `101480e`, `8a0c346` y `69db130`.

La corrida final exacta fue:

```bash
CI=1 npm run test:e2e:auth -- --reporter=list
```

Resultado: `15/15 passed`. Los proyectos visuales fueron `4/4 passed`; los tests unitarios fueron `13/13`; lint, typecheck, build y `git diff --check` terminaron en `PASS`.

### Cobertura y evidencia

La cobertura real de API/browser incluyó login inválido, selección/cambio de negocio, `403` para no miembros, `403` para escrituras por rol, aislamiento Centro/Norte en dashboard/products/inventory/sales y cross IDs, métricas esperadas del dashboard, navegación específica por rol y navegación admin-only, además de logout. Las fixtures de `dashboard-states` son estados UI-only y están claramente separadas: interceptan únicamente `/api/dashboard` y no prueban autenticación ni datos de negocio.

Las capturas locales ignoradas quedaron bajo `test-results/dev-test-01/...` para `1440x768`, `1440x900`, `768x1024` y `390x844`. Los storage states se eliminaron durante el teardown. No se guardaron secretos.

La comparación con Stitch confirmó shell, CTA, quick links, métricas, alertas, ventas recientes y navegación mobile. También confirmó que el clipping/título/grid de tablet quedó corregido por `96dedcb`, únicamente en CSS del dashboard. Stitch contiene además un hero ilustrado de estación, apartados/tasks y métricas demo que no están respaldados por endpoints ni datos reales autorizados; no se inventaron ni copiaron. No hubo cambios en `diseno/`.

### Reproducción y apagado

Usar valores locales de ejemplo. Nunca incluir una contraseña real en este documento ni en comandos compartidos:

```bash
export E2E_DB_PASSWORD='<placeholder-password>'
docker volume create lucem-retail-dev-test-01b-pg
docker run -d --name lucem-retail-dev-test-01b-db \
  -e POSTGRES_DB=lucem_retail_e2e \
  -e POSTGRES_USER=lucem_e2e \
  -e POSTGRES_PASSWORD="$E2E_DB_PASSWORD" \
  -p 55432:5432 \
  -v lucem-retail-dev-test-01b-pg:/var/lib/postgresql/data \
  postgres:16

export E2E_DATABASE_URL='postgresql://lucem_e2e:<placeholder-password>@127.0.0.1:55432/lucem_retail_e2e'
set -a; source .env.e2e; set +a
npm run e2e:prepare
CI=1 npm run test:e2e:auth -- --reporter=list
npm run test:e2e:visual
npm run e2e:cleanup
```

`npm run test:e2e:visual` es el script visual correcto; no es `e2e:visual`. La limpieza se ejecutó con `npm run e2e:cleanup`; los cinco conteos `psql` fueron exactamente `0|0|0|0|0`. Después se eliminaron únicamente los recursos E2E:

```bash
docker rm -f lucem-retail-dev-test-01b-db
docker volume rm lucem-retail-dev-test-01b-pg
```

Advertencia: los comandos requieren valores locales, el placeholder no es una contraseña válida y nunca debe sustituirse aquí por una credencial real. No queda ninguna base de datos E2E.

### Estado de seguridad

`GET /api/audit exposes passwordHash`

El sistema no está listo para producción. Los módulos siguientes no se iniciaron.
