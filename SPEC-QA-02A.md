# QA-02A — Aislamiento y clasificación reproducible de E2E

## Objetivo
Hacer que QA full prepare un estado sintético reproducible por suite y reporte resultados identificables sin limpiar estado global compartido ni modificar reglas comerciales.

## Scope
Incluye sólo la orquestación QA/Playwright, factories/teardowns de fixtures E2E, configuración QA de rate-limit y sanitización/evidencia estructurada de tests. No cambia handlers, consultas, límites, respuestas ni reglas de negocio; no modifica `SPEC.md`, DEV-DATA-01, staging, Cloudflare, n8n o tablas de clientes.

## User flows
1. Full runner obtiene exclusión mutua para el repositorio, verifica identidad `lucem_qa` y prepara su namespace antes de cada config Playwright. Cada suite recibe un `SESSION_SECRET` efímero distinto; setup genera sesiones frescas y teardown elimina storage state.
2. Seed/cleanup opera sólo sobre business/user IDs `DEV-TEST-01` o propiedad explícita de un escenario. No ejecuta `deleteMany({})` sobre sesiones, buckets, cuotas, auditoría ni tablas comerciales.
3. Rate-limit tests en QA usan cabeceras CF sintéticas válidas sólo en el servidor loopback. Límites reducidos se inyectan en el proceso QA con claves que el resolver realmente lee; defaults y procesos no-QA no cambian. Los buckets no se borran globalmente: el secreto por suite aísla sus HMAC.
4. Suites que comparten el fixture DEV-TEST-01 documentan/conservan concurrencia observada. E2E con lecturas/escrituras concurrentes al mismo stock corre secuencialmente; suites con fixtures separados mantienen workers independientes.
5. Tests que crean usuario/negocio/ventas propio capturan IDs y los limpian en `finally`/teardown. Screenshots de evaluación se escriben en `testInfo.outputPath`, nunca sobre evidencia versionada.
6. Evaluator ejecuta suites aisladas y full y compara test ID, título, suite, perfil, estado, motivo, clasificación y evidencia. El reporte separa `PRODUCT_DEFECT`, `TEST_DEFECT`, `FIXTURE_CONTAMINATION`, `ENVIRONMENT_FAILURE`, `COVERAGE_GAP`, `SUSPECTED` y `UNDETERMINED`.

## Modelo de datos
Sin tablas de negocio ni cambios de schema. El resultado QA extiende JSON con casos Playwright: `testId`, `title`, `suite`, `file`, `status`, clasificación, duración y referencias de evidencia sanitizadas. Fixtures de escenario se limpian por IDs de propietario y relaciones.

## Stack y decisiones técnicas
Playwright, Prisma y PostgreSQL existentes. `scripts/qa/lucem-audit.ts` ejecuta preparación revalidando el target antes de cada suite. `scripts/e2e/seed.ts` conserva buckets globales no expirados y limpia cuotas sólo de businesses propios. La exclusión mutua usa `flock` local por checkout; no modifica permisos Docker. Cada sub-suite recibe secreto de sesión efímero distinto para que los HMAC de rate-limit de una suite no afecten otra. El servidor QA-security simula cabeceras CF desde loopback; no inicia túnel ni contacta Cloudflare.

## Assumptions y diagnóstico inicial
- `qa:full` aplicaba migraciones/seed una vez y después encadenaba configs cuyos globalSetup sólo iniciaban sesiones; ventas/reservas/inventario cambiaban de una suite a otra. Evidencia previa: devoluciones 7/7 aislada, pero en full el test idempotente halló SKU LOW ausente; `dev-09` pasó y el dashboard/fixtures DEV-TEST-01 fallaron tras suites anteriores.
- QA cleanup preserva todos los `AbuseRateLimitBucket` y `UploadQuotaCounter` porque no hay ownership por tenant. QA usa un secreto HMAC común entre todas las suites; además QA-security desactivaba confianza CF mientras tests usaban `CF-Connecting-IP` para simular IPs distintas, y configuraba límites `E2E_LUCEM_*` que `configuredRateLimit` no toma con la URL 55433. Evidencia: 429 inesperados y límites de creación que devolvieron 201 en lugar de 429.
- `playwright.e2e.config.ts` usaba `next start` sin artefacto `.next/BUILD_ID`, produciendo un fallo de entorno en ejecución aislada.
- `dev-08`/`dev-09` tienen teardowns propios; QA reportará y verificará estos owners en lugar de borrar filas por nombres globales.
- `playwright/.auth` se recrea por setup de suite y se elimina por teardown; nunca se empaqueta en ZIP.

## Rubric de evaluación
1. QA full re-seed sólo el namespace QA antes de cada suite y rota secreto/sesiones; suite aislada y full produce el mismo resultado para cada test ID determinista.
2. Una suite E2E de stock compartido corre sin interferencia entre workers; tests paralelos de businesses distintos se conservan y tenant isolation permanece probado.
3. Security usa IPs sintéticas bien formadas bajo loopback y thresholds QA efectivos. Repetir suite no da falsos 429; los buckets globales no se borran y ninguna otra instancia se altera.
4. Devoluciones, apartados, POS e idempotency se repiten en orden distinto con fixture fresco; diferencias full/aislado quedan atribuidas a una causa con test ID/evidencia.
5. Usuarios, businesses, ventas, reservations, returns, sessions, storage state y cuotas creadas por DEV-08/DEV-09/test suites se limpian por IDs de propietario. Sin operaciones DELETE globales.
6. Full report contiene una fila por caso Playwright observado con ID estable, suite, estado y evidencia; checks, rutas, capabilities, estados y tests tienen contadores separados.
7. Findings incluyen una clasificación permitida; un defecto reproducible no se clasifica como test/fixture sin evidencia, y las dudas quedan `SUSPECTED`/`UNDETERMINED`.
8. `npm test`, typecheck, lint, suites objetivo aisladas y full se ejecutan; el resultado nunca convierte no ejecutados en PASS.
