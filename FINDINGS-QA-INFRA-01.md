# Findings — QA-INFRA-01

## Resumen final

Resultado del rubric: **10/17 criterios PASS; 7/17 FAIL o sin evidencia suficiente para PASS**. La infraestructura PostgreSQL E2E está activa y healthy: contenedor `lucem-retail-e2e-postgres`, PostgreSQL 16, volumen persistente dedicado `lucem-retail-e2e-postgres-v1` y publicación sólo en `127.0.0.1:55432`. Rol `lucem_e2e` con `role_superuser=false`; la red bridge persistente Compose v2 tiene masquerading deshabilitado. `.env.e2e` está en modo `0600` y excluido por Git.

Se aplicaron las seis migraciones; después `npm run e2e:prepare` encontró cero migraciones pendientes y restauró fixtures. `npm run e2e:verify` confirmó identidad exacta de base, usuario, versión PostgreSQL e identidad del puerto interno del servidor. Las cinco corridas finales de ordering, posteriores al guard estricto contra superusuario, pasaron; usaron IDs independientes y cada corrida hizo preflight DB y cleanup propios. Diagnóstico posterior confirmó el baseline esperado de exactamente 3 variantes activas, con los estados ZERO/LOW esperados.

El propietario ejecutó `npm run e2e:db:restart-check` con resultado PASS. Validó target en `127.0.0.1:55432`; identidad antes y después: PostgreSQL 16, base `lucem_retail_e2e`, usuario `lucem_e2e`, `role_superuser=false`, puerto de servidor 5432. Confirmó `container=lucem-retail-e2e-postgres`, `volume=lucem-retail-e2e-postgres-v1` y fixtures sin cambios tras reinicio. Esta evidencia satisface los criterios #4 y #5.

Suites finales: productos **17/17 PASS**; product pagination **1/1 PASS**; `dev-11r-products` **2/2 PASS**; E2E full auth/dashboard **15/15 PASS**. Build E2E security en output aislado pasó; también typecheck, lint y **73/73** pruebas unitarias.

El reporte QA full **no pasó**: `qa/reports/2026-11-13T06-59-07-473Z-2581222`, estado **FAIL**, 98 PASS / 2 FAIL / 5 NOT_EXECUTED. Los dos fallos son POS en tablet (ancho `850 > 768`) y una violación axe seria `label-content-name-mismatch` en `.pos-product-trigger`; reporta 1 violación axe, 0 hallazgos responsive, 76 estados y 311 controles sin cobertura, además de brecha de comparación histórica. QA full utilizó el runner de fixtures aislado QA Lab; no implicó cambios de staging, Cloudflare ni n8n. Estos fallos quedan fuera del alcance E2E de productos/infraestructura.

La clasificación del caso dashboard fue **TEST_DEFECT**: timestamp futuro en fixture corregido a inicio del día. Se detectó contaminación secuencial de fixtures de DEV-11R/productos por productos temporales soft-archived que conservaban variantes; se agregó cleanup por IDs exactos de filas creadas por los tests y movimientos/historial/auditoría relacionados. Diagnóstico posterior a las suites confirmó baseline limpio. Código de la aplicación dashboard no se modificó.

## Evidencia y criterios

### PASS

- [x] **1 · PostgreSQL fijado.** Contenedor final healthy `lucem-retail-e2e-postgres` ejecuta PostgreSQL 16.
- [x] **2 · Base y rol dedicados.** `npm run e2e:verify` confirma `lucem_retail_e2e`, usuario `lucem_e2e` y `role_superuser=false`.
- [x] **3 · Puerto loopback.** Servicio publicado en `127.0.0.1:55432`; `docker compose --env-file .env.e2e -f compose.e2e.yml config --quiet` pasó.
- [x] **4 · Volumen exclusivo y persistencia.** `npm run e2e:db:restart-check` confirmó volumen dedicado `lucem-retail-e2e-postgres-v1` y fixtures sin cambios antes/después del reinicio.
- [x] **5 · Healthcheck y restart.** `npm run e2e:db:restart-check` pasó; tras reinicio se validó de nuevo la identidad PostgreSQL 16/base/rol/puerto y el contenedor quedó operativo.
- [x] **6 · Entorno protegido.** `.env.e2e` tiene modo `0600` y está ignorado por Git.
- [x] **7 · Auto-carga acotada.** Comandos E2E documentados se ejecutaron con la configuración E2E y el verificador confirmó la identidad del target dedicado.
- [x] **11 · Identidad antes de escribir.** Guard estricto valida base, rol no-superusuario, versión e identidad de conexión; cada uno de los cinco ordering runs registró preflight DB antes de las operaciones y cleanup.
- [x] **12 · Privilegios Docker.** La bridge persistente Compose v2 tiene masquerading deshabilitado. No se concedió ACL permanente de Docker ni se guardó password sudo.
- [x] **13 · Ordering cinco veces.** Cinco corridas finales independientes pasaron, cada una con IDs independientes, preflight/cleanup y verificación de resultado. Productos 17/17; paginación 1/1; dev-11r-products 2/2; auth/dashboard 15/15.

### FAIL / evidencia insuficiente

- [ ] **8 · Sin fallback de conexión.** Se confirmó el target en los comandos ejecutados, pero no se aporta una prueba de ausencia de `.env.e2e`/variables incompletas y ausencia de fallback a `DATABASE_URL` de otro entorno.
- [ ] **9 · Descubrimiento de instancias antiguas.** La evidencia final no documenta una ejecución de descubrimiento contra recursos antiguos/colisionantes ni demuestra que se preservaron en tal detección.
- [ ] **10 · Colisión de puerto segura.** La publicación correcta está comprobada, pero no se documenta la prueba de puerto `55432` ocupado, con reporte del ocupante y fallo seguro.
- [ ] **14 · Suites relacionadas en QA full.** Las suites E2E relacionadas indicadas arriba pasaron individualmente. El reporte QA full, sin embargo, registra 5 NOT_EXECUTED y dos fallos; no prueba que todas las suites requeridas del flujo full pasen.
- [ ] **15 · Clasificación del dashboard.** El defecto del dashboard se clasificó como TEST_DEFECT y se corrigió como problema de fixture; no hay evidencia de clasificación verificada para cada una de las clases requeridas con diagnóstico no sensible.
- [ ] **16 · Resultado QA full.** **FAIL**, no PASS: reporte `qa/reports/2026-11-13T06-59-07-473Z-2581222`, 98 PASS / 2 FAIL / 5 NOT_EXECUTED. Fallos POS tablet y axe; 76 estados/311 controles sin cobertura y brecha histórica.
- [ ] **17 · Preservación del trabajo local.** Se informó que se preservaron cambios ajenos y no se realizó commit; no se aporta comparación previa/posterior verificable del árbol completo para satisfacer el criterio binario.

## Diagnóstico adicional

- El timestamp futuro en fixtures del dashboard se corrigió a inicio del día; el dashboard app code quedó intacto.
- Se corrigió la contaminación secuencial causada por productos temporales soft-archived con variantes persistentes, usando cleanup por IDs exactos de los tests y sus movimientos/historial/auditoría relacionados. Los diagnósticos posteriores confirmaron baseline limpio.
- Build E2E security en output aislado, typecheck, lint y 73 pruebas unitarias pasaron.
- No hubo cambios en staging, Cloudflare ni n8n. QA full usó exclusivamente el runner de fixtures aislado QA Lab.
- No se hizo commit ni push.
