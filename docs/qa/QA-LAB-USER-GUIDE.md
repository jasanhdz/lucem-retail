# Lucem QA Lab — guía de uso

## Instalación local

```bash
npm ci
npm link
lucem-audit --help
```

También se puede usar `npm run qa:audit -- --coverage` sin instalar el alias global. Los reportes de ejecución están ignorados por Git.

## Comandos

```bash
lucem-audit
lucem-audit --coverage
lucem-audit --functional
lucem-audit --visual
lucem-audit --accessibility
lucem-audit --performance
lucem-audit --module products
lucem-audit --changed
lucem-audit --package
```

`--visual`, `--accessibility` y `--performance` pueden observar login/registro sin DB usando sólo el servidor dev local y sin enviar operaciones comerciales. Las pantallas autenticadas y cualquier flujo mutante necesitan el entorno QA dedicado.

`qa:full` adquiere un lock por checkout y prepara el fixture QA antes de cada config; no corras suites directas contra `lucem_qa` concurrentemente con una auditoría. La limpieza sólo borra filas y archivos con IDs del fixture dueño; buckets globales no expirados se preservan. Cada suite usa una clave de sesión efímera, lo que aísla sus hashes de rate-limit sin limpiar la tabla global.

## Provisionar la base QA local

El bootstrap crea credenciales QA locales en `.qa-private/` (modo privado, ignorado por Git), valida que el proyecto sólo contenga PostgreSQL QA y comprueba el puerto sin conectarse al Docker Engine:

```bash
bash scripts/qa/provision-db.sh prepare
bash scripts/qa/provision-db.sh check
bash scripts/qa/provision-db.sh up
```

El operador debe revisar el plan y ejecutar el subcomando `up` en una terminal interactiva; éste solicita sudo sólo para inspeccionar el nombre exclusivo del volumen/servicio y ejecutar `docker compose up -d postgres` en el proyecto fijo `lucem-qa-01d`. Si un contenedor QA preexistente no tiene el port mapping, `reconcile` valida proyecto, servicio, mount e identidad, y recrea sólo el contenedor conservando su volumen nombrado. La red bridge `qa_private` tiene masquerading desactivado; el host publica el servicio únicamente en loopback. No usar `docker compose down -v`, `prune` ni comandos de eliminación. La base escucha sólo en `127.0.0.1:55433`; su volumen persistente es `lucem-qa-01d-postgres-data`, distinto de staging y de volúmenes anónimos.

Tras provisionar, carga el entorno sintético sin mostrarlo y ejecuta el perfil full en la misma terminal:

```bash
set -a
. ./.qa-private/runtime.env
set +a
npx prisma generate
npx lucem-audit --full
unset QA_POSTGRES_PASSWORD QA_DATABASE_URL DATABASE_URL E2E_DATABASE_URL E2E_DATABASE_USER E2E_ADMIN_PASSWORD E2E_SELLER_PASSWORD E2E_INVENTORY_PASSWORD
```

El CLI verifica que usuario y base conectados sean exactamente `lucem_qa` antes de migraciones/fixtures. Si la identidad no coincide, se bloquea sin fallback. No reutilizar credenciales demo, E2E, staging ni producción.

El perfil `--performance` crea, sólo en `lucem_qa`, un fixture de 10.000 productos/variantes en lotes de 500 para medir búsqueda/paginación junto con Dashboard. Su namespace se limpia al finalizar. Los p95 se reportan por ruta y se comparan con el umbral versionado; no son medición de carga de producción.

## Evidencia y reportes

Cada corrida crea `qa/reports/<runId>/` con resumen ejecutivo, reportes funcional/UX/axe/performance, `ROUTE-INVENTORY.json`, `PLAYWRIGHT-TESTS.json`, `ISOLATED-FULL-COMPARISON.json` cuando haya baseline, `FINDINGS.json`, matriz de cobertura, metadata, capturas, eventos de navegador y reporte HTML (`index.html`). Checks, rutas, capabilities, estados y casos Playwright se cuentan por separado. Findings distinguen producto, test, fixture, entorno, cobertura, sospecha e incertidumbre. El ZIP se genera con `lucem-audit --package` y contiene `PACKAGE-MANIFEST.json`, checksums y una lista de artefactos excluidos. No incluye traces/HAR/storage states/dumps; se deben revisar manualmente las imágenes antes de compartir.

Estados: PASS es resultado ejecutado; FAIL indica una aserción fallida; UNCOVERED falta de registro/test; NOT_EXECUTED test definido no corrido; NOT_IMPLEMENTED capacidad aún ausente; BLOCKED prerrequisito o aislamiento no disponible. Ninguno de los últimos cinco estados es aprobación.

## Baselines y Stitch

Las capturas actuales se guardan con nombres por ruta y viewport. Las comparaciones visuales sólo se ejecutan contra `qa/visual-baselines/` revisadas explícitamente; la herramienta nunca actualiza baselines. Referencias existentes de Stitch aparecen lado a lado en `stitch-comparison.html`. Cuando no hay imagen aprobada, el resultado es `NEEDS_MANUAL_REVIEW`/`NOT_EXECUTED`.

## Uso de resultados con Forge/ChatGPT

Comparte el ZIP generado, no el directorio privado de traces. Lee el resumen y hallazgos, selecciona los problemas que quieres corregir, y abre un ciclo Forge posterior con esos hallazgos. QA Lab sólo observa y reporta; no crea fixes de la aplicación. Si un trace local es necesario para depurar, conservarlo fuera del ZIP y no compartirlo sin sanitización manual.
