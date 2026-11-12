# QA-02A — Aislamiento y clasificación reproducible de E2E

## Objetivo
Hacer que QA full prepare un estado sintético reproducible por suite y reporte resultados identificables sin limpiar estado global compartido ni modificar reglas comerciales.

## Scope
Incluye sólo la orquestación QA/Playwright, factories/teardowns de fixtures E2E, configuración QA de rate-limit y sanitización/evidencia estructurada de tests. No cambia handlers, consultas, límites, respuestas ni reglas de negocio; no modifica `SPEC.md`, DEV-DATA-01, staging, Cloudflare, n8n o tablas de clientes.

## User flows
1. Full runner adquiere exclusión de otra corrida Lucem QA, verifica identidad `lucem_qa` y prepara un namespace conocido antes de cada config Playwright. Cada suite recibe un `SESSION_SECRET` efímero distinto; setup crea estados de sesión nuevos y teardown los elimina.
2. Seed/cleanup opera sólo sobre business/user IDs que pertenecen a `DEV-TEST-01` o al escenario propietario. No ejecuta `deleteMany({})` sobre sesiones, buckets, cuotas, auditoría ni tablas comerciales.
3. Límites en QA simulan clientes con CF headers sintéticos válidos sólo en servidor loopback QA. Los umbrales bajos se inyectan en el proceso Playwright QA con claves que el resolver de configuración realmente lee; valores por defecto y servidores no-QA no cambian.
4. Suites con fixtures compartidos declaran concurrencia observada. La suite `dev-test-01` corre en un worker mientras comparte ventas/inventario deterministas; otras suites pueden conservar paralelismo cuando usan datos distintos.
5. Tests que crean usuario/negocio de escenario capturan sus IDs y los eliminan en `finally`/teardown. Screenshots de evaluación se escriben en `testInfo.outputPath`, no sobre evidencia versionada.
6. Evaluator corre suites problemáticas aisladas y en full, y compara test ID, título, suite, perfil, estado, motivo, clasificación y evidencia. El reporte separa `PRODUCT_DEFECT`, `TEST_DEFECT`, `FIXTURE_CONTAMINATION`, `ENVIRONMENT_FAILURE`, `COVERAGE_GAP`, `SUSPECTED` y `UNDETERMINED`.

## Modelo de datos
No agrega tablas de negocio ni cambia schema. Puede añadir una estructura QA JSON de resultados Playwright: `testId`, `title`, `suite`, `status`, `classification`, `durationMs`, `reason` y referencias de evidencia sanitizadas.

## Stack y decisiones técnicas
Playwright y Prisma existentes; `scripts/qa/lucem-audit.ts` prepara cada suite bajo el target QA ya validado. Los rate-limit buckets no se borran globalmente: hashes derivados de secretos de sesión efímeros por suite separan sus ventanas sin alterar el algoritmo comercial. Los límites de prueba sólo se aplican al proceso del QA server. Las suites que comparten el fixture DEV-TEST-01 se serializan; suites con fixtures propios conservan concurrencia.

## Assumptions
- `lucem_qa` es base exclusiva del laboratorio y acepta operaciones sólo tras verificar usuario/base exactos.
- Una suite full no comparte estado mutable con la siguiente. Otra ejecución QA simultánea debe bloquearse o usar un namespace distinto; nunca se limpia un bucket/registro global para hacer pasar una prueba.
- `dev-09` y `dev-08` crean fixtures propios que pertenecen a su escenario; su teardown debe borrar únicamente esos registros y sus relaciones.
- Salida `FAIL` de API/DB reproducible puede clasificarse como `PRODUCT_DEFECT`; timeout/localizador/aserción sin señal causal suficiente es `UNDETERMINED`, no se presume defecto comercial.

## Rubric de evaluación
1. Repetir la suite full y ejecutar suites en orden inverso produce los mismos resultados deterministas para cada suite seeded; cada suite inicia tras preflight y seed exactos de `lucem_qa`.
2. Devoluciones, apartados, POS y dashboard no heredan stock/ventas/reservas mutados por una suite anterior; tests paralelos no comparten IDs/inventario mutable o quedan serializados sólo en la config que lo requiere.
3. Login/register/rate suites pasan con IPs de test válidas y límites bajos en QA local; pruebas de umbral son deterministas y no quedan buckets viejos activos entre suites; no se borran buckets globales.
4. Tras full, usuarios/negocios/productos/ventas/reservas/devoluciones/sesiones/uploads de fixtures temporales quedan limpios, counters vinculados a business QA se eliminan por IDs exactos y auditoría no relacionada se preserva.
5. E2E no sobrescribe capturas de `docs/`; build/browser outputs quedan en rutas QA ignoradas, y el lock impide dos full runners sobre el mismo namespace simultáneamente.
6. `RUN-RESULT.json` distingue tests individuales corridos/no corridos, identificadores, evidencia y las siete clasificaciones permitidas; no suma checks, rutas, features y tests como la misma métrica.
7. Productos, POS, devoluciones, dashboard, apartados, seguridad y rendimiento se comparan aislado/full; fallos independientes quedan reproducibles, los derivados de contaminación desaparecen y ninguno se corrige debilitando aserciones.
8. Typecheck, lint y tests unitarios pasan; la auditoría conserva fail-closed DB identity, parámetros seguros, aislamiento tenant y no acceso a staging/Cloudflare/n8n.
