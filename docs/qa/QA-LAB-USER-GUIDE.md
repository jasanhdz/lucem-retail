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

## Provisionar la base QA local

Requiere Docker disponible para el usuario y un secreto de QA propio. El servicio publica exclusivamente `127.0.0.1:55433` y su volumen/Compose project son `lucem_qa`:

```bash
export QA_POSTGRES_PASSWORD="$(openssl rand -hex 24)"
docker compose --project-name lucem-qa --file compose.qa.yml up -d postgres
export QA_DATABASE_URL="postgresql://lucem_qa:${QA_POSTGRES_PASSWORD}@127.0.0.1:55433/lucem_qa?schema=public"
export E2E_ADMIN_PASSWORD="<secreto sintético local de 12+ caracteres>"
export E2E_SELLER_PASSWORD="<secreto sintético local de 12+ caracteres>"
export E2E_INVENTORY_PASSWORD="<secreto sintético local de 12+ caracteres>"
lucem-audit --functional
```

La herramienta valida usuario, base, puerto, loopback y después la identidad conectada antes de migraciones/fixtures. Si falta cualquiera de esos requisitos, se bloquea antes de levantar navegador/servidor. No reutilizar credenciales demo, E2E, staging ni producción. No usar `docker compose down -v` sin confirmar manualmente que el proyecto/volumen son exactamente `lucem-qa`.

## Evidencia y reportes

Cada corrida crea `qa/reports/<runId>/` con resumen ejecutivo, reportes funcional/UX/axe/performance, `ROUTE-INVENTORY.json`, `FINDINGS.json`, matriz de cobertura, metadata, capturas, eventos de navegador y reporte HTML (`index.html`). El ZIP se genera con `lucem-audit --package` y contiene `PACKAGE-MANIFEST.json`, checksums y una lista de artefactos excluidos. No incluye traces/HAR/storage states/dumps; se deben revisar manualmente las imágenes antes de compartir.

Estados: PASS es resultado ejecutado; FAIL indica una aserción fallida; UNCOVERED falta de registro/test; NOT_EXECUTED test definido no corrido; NOT_IMPLEMENTED capacidad aún ausente; BLOCKED prerrequisito o aislamiento no disponible. Ninguno de los últimos cinco estados es aprobación.

## Baselines y Stitch

Las capturas actuales se guardan con nombres por ruta y viewport. Las comparaciones visuales sólo se ejecutan contra `qa/visual-baselines/` revisadas explícitamente; la herramienta nunca actualiza baselines. Referencias existentes de Stitch aparecen lado a lado en `stitch-comparison.html`. Cuando no hay imagen aprobada, el resultado es `NEEDS_MANUAL_REVIEW`/`NOT_EXECUTED`.

## Uso de resultados con Forge/ChatGPT

Comparte el ZIP generado, no el directorio privado de traces. Lee el resumen y hallazgos, selecciona los problemas que quieres corregir, y abre un ciclo Forge posterior con esos hallazgos. QA Lab sólo observa y reporta; no crea fixes de la aplicación. Si un trace local es necesario para depurar, conservarlo fuera del ZIP y no compartirlo sin sanitización manual.
