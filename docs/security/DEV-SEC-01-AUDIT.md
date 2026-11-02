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

El Planner commitó `637b3ba docs(spec): plan DEV-SEC-01 audit security fix`.
El commit de implementación es `eae053c fix(security): remove sensitive fields from audit API`
y el commit de documentación es `8cd92b4 docs(security): record audit API verification`.

Required commit message: `fix(security): remove sensitive fields from audit API`

## DEV-SEC-01B — Verificación autenticada

Los resultados `BLOCKED` anteriores quedan reemplazados por la evidencia final
de esta corrida aislada. El bloqueo histórico sólo describía la ausencia de
`E2E_DATABASE_URL` en esa ejecución; no es el resultado de la verificación
autenticada final.

### Corrección verificada

- `app/api/audit/route.ts` usa una selección explícita de `AuditLog` y `user`.
- La respuesta sólo puede incluir `AuditLog.id`, `businessId`, `userId`,
  `action`, `entityType`, `entityId`, `metadata`, `createdAt` y, para el actor,
  `id`, `name`, `email`, `active`.
- No se seleccionan ni serializan `passwordHash`, `tokenHash`, campos de
  sesión, relaciones de `User` ni credenciales.
- `getAuth()`, la guarda `ADMIN`, el filtro por negocio activo, el orden y el
  límite de 100 registros permanecen vigentes.

La causa raíz era `include: { user: true }`, que cargaba y serializaba el
`User` relacionado completo. La advertencia literal `GET /api/audit exposes
passwordHash` se conserva como declaración histórica del riesgo. En este
commit, la respuesta del endpoint ya no expone `passwordHash`.

### Infraestructura y reproducción

Se provisionó PostgreSQL real y desechable con los nombres exactos
`lucem-retail-dev-sec-01-db` y `lucem-retail-dev-sec-01-pg`, base
`lucem_retail_e2e`, usuario `lucem_e2e` y puerto host `55432` hacia `5432`.
La identidad se verificó con `psql`; la base de desarrollo y el puerto `5432`
no fueron tocados.

Reproducción con placeholders únicamente; no registrar ni compartir una
contraseña real:

```bash
export E2E_DB_PASSWORD='<placeholder-password>'
docker volume create lucem-retail-dev-sec-01-pg
docker run -d --name lucem-retail-dev-sec-01-db \
  -e POSTGRES_DB=lucem_retail_e2e \
  -e POSTGRES_USER=lucem_e2e \
  -e POSTGRES_PASSWORD="$E2E_DB_PASSWORD" \
  -p 55432:5432 \
  -v lucem-retail-dev-sec-01-pg:/var/lib/postgresql/data \
  postgres:16

export E2E_DATABASE_URL='postgresql://lucem_e2e:<placeholder-password>@127.0.0.1:55432/lucem_retail_e2e?schema=public'
export E2E_DATABASE_USER='lucem_e2e'
psql "$E2E_DATABASE_URL" -c 'select current_database(), current_user, inet_server_port();'
npm run e2e:prepare
CI=1 npm run test:e2e:security -- --reporter=list
npm run e2e:cleanup
docker rm -f lucem-retail-dev-sec-01-db
docker volume rm lucem-retail-dev-sec-01-pg
```

### Resultados

- `npm run e2e:prepare`: PASS; migración y seed aplicados en la base aislada.
- `CI=1 npm run test:e2e:security -- --reporter=list`: PASS, 2/2.
- La suite verificó `401` sin autenticación, `403` para `SELLER` e
  `INVENTORY_MANAGER`, `200` para `ADMIN` en Centro y Norte, el escaneo
  recursivo de claves sensibles y la separación de IDs entre negocios.
- `npm test`: PASS, 6 archivos y 15 tests.
- `npm run lint`, `npm run build` y `npm run typecheck` (repetido después del
  build): PASS.
- `git diff --check`: PASS.
- La búsqueda confirmó que no hay llamadas a `/api/audit` fuera de la spec de
  seguridad enfocada.
- `npm run e2e:cleanup` dejó conteos `0|0|0`; el contenedor y volumen exactos
  fueron eliminados.
- No quedaron secretos, estados de storage ni recursos E2E retenidos.

No se modificaron schema, migraciones ni contraseñas. La suite E2E global o
legacy permanece intencionalmente excluida y no se presenta como evidencia.

### Riesgos residuales

La verificación autenticada no declara readiness para producción: todavía
requiere despliegue y revisión de producción antes de declarar el endpoint
listo. Permanecen los riesgos ordinarios de autorización, configuración y
despliegue fuera de esta corrida aislada; no se realizaron cambios en API de
auth, Prisma ni UI.
