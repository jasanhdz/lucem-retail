# QA-04 — Diagnóstico causal de hidratación y solicitudes abortadas

## Objetivo
Determinar con reproducciones comparables si las advertencias de hidratación y `ERR_ABORTED` provienen de Lucem, de condiciones de carrera o del auditor, preservando todo evento y corrigiendo sólo causas demostradas.

## Scope
Incluye auditoría de configuraciones Playwright/QA, listeners, orden de navegación, contextos, sesión, fixtures, viewports y servidor de desarrollo/build; instrumentación correlacionada entre tests, acciones, rutas, solicitudes, errores, stacks y capturas; repetición de escenarios afectados con y sin instrumentación; agrupación por firmas estables sin perder ocurrencias; prueba de cancelación y estado final de UI; revisión de `style={{}}` y `style={{caret-color:"transparent"}}`; clasificación `EXPECTED_CANCELLATION`, `PRODUCT_DEFECT`, `TEST_INSTRUMENTATION`, `ENVIRONMENT`, `UNDETERMINED`; regresión/corrección mínima sólo si un defecto se reproduce; validación completa, reporte y fast-forward publicación.

Queda fuera cambiar reglas comerciales, ocultar errores, usar `suppressHydrationWarning`, filtrar globalmente fallos de red, modificar infraestructura o datos fuera de fixtures QA propietarios, alterar staging, PostgreSQL público, Cloudflare o n8n, y mezclar los cambios locales preexistentes.

## User flows
1. Abrir evidencia histórica QA-03B (25 advertencias full, 2 solicitudes abortadas, reporte/probe/ZIP) y conservar IDs de evento, test, ruta, viewport, usuario/rol, timestamps y payloads sanitizados.
2. Ejecutar la probe aislada y el test visual de QA Lab con la misma versión de Chromium, proyecto, worker, storageState/sesión, fixtures, rutas, viewports, orden y readiness. Registrar inicio de listener antes del primer documento, rutas de cada evento, user agent, contexto, respuestas SSR, primer DOM cliente, consola y pageerror completos, trazas y capturas.
3. Para cada prueba comparar: (a) ruta individual sin observer; (b) navegación de una page por vista; (c) recorrido secuencial de todos los viewports/rutas; (d) test visual QA Lab idéntico; (e) build de producción aislado únicamente si hay comando/configuración existente que no requiera tocar recursos protegidos. Repetir cada escenario afectado al menos tres veces y registrar cada ocurrencia.
4. Comparar HTML HTTP SSR, DOM inicial antes de hidratación, primer render React/DOM posterior y mutaciones, con atributo/style serializado, input id/label/type, componente/stack, fase y firma. No inferir valores ausentes: registrar `UNKNOWN`. Consultar JSX/CSS y paquetes/configuración sólo para elementos vinculados a evidencia.
5. Correlacionar cada solicitud fallida con método/URL sanitizados, `resourceType`, initiator/frame, contexto/page/test, navegación en curso, acción Playwright y navegación/respuesta posterior; confirmar si queda UI estable y en la ruta/estado esperado. No marcar abort como esperado por código de error solamente.
6. Agrupar sólo firma exacta + ruta/componente/fase/causa concordantes, usando IDs deterministas; artefacto registra cada ocurrencia enlazada. Clasificar causalidad con evidencia a favor/en contra, repetición y confianza. Si no se distingue app/test/entorno, mantener `UNDETERMINED`.
7. Si se demuestra defecto Lucem, crear regresión que falla antes/pasa después y aplicar cambio mínimo de UI; si se demuestra bug del collector, corregir sólo instrumentación y conservar los eventos crudos. No modificar app cuando causa no esté demostrada.
8. Ejecutar unit tests, typecheck, lint, suites dirigidas con tres repeticiones, suite funcional de seguridad/productos pertinente y full QA con secretos auto-cargados. Comparar a baseline QA-03B y generar report/ZIP sanitizados, sin aprobar visual baselines automáticamente.
9. Evaluator reporta causa y evidencia por grupo, resultado antes/después, tests, cobertura, full report y ZIP. Generator publica únicamente QA-04 con fast-forward a la feature branch; los archivos locales previos permanecen fuera del commit.

## Modelo de datos
Sin schema comercial. Añadir/usar eventos de auditoría versionados en `qa/reports/<runId>/browser-events/` y `hydration/`:
- `BrowserOccurrence`: `occurrenceId`, `signatureId`, `testId`, `suite`, `project`, `browserVersion`, `contextId`, `storageRole`, `route`, `actionId`, `timestamp`, `viewport`, `source` (`probe|visual-audit|functional`), `instrumentationMode`, `rawEventRef`, `screenshotRef`, `traceRef`, `classification`, `confidence`.
- `HydrationOccurrence`: `route`, `componentStack`, `elementId`, `accessibleName`, `type`, `ssrAttribute`, `domBeforeHydration`, `firstClientDom`, `domAfterHydration`, `styleMutations[]`, `warningPayload`, `delta`, `deltaStatus` (`EXACT|UNKNOWN`), `occurrenceRefs[]`.
- `RequestAbortOccurrence`: sanitized `method`, `url`, `resourceType`, `initiator`, `frameRoute`, `navigationRequest`, `action`, `navigationBefore/After`, `responseStatus`, `uiOutcome`, `classification`, `evidenceRefs[]`.
- `ReproductionMatrix`: scenario, context/config hash, run count, occurrence count, outcome per attempt, comparison to baseline.

El ZIP no contiene cookies, tokens, storage state ni trazas no sanitizadas. Los IDs son estables; agrupación no elimina registros originales.

## Stack y decisiones técnicas
Usar Node.js/TypeScript, QA Lab y Playwright existentes, `qa/features/registry.ts`, `e2e/qa-01/audit.spec.ts`, probe QA-03, `scripts/qa/core.ts`, `scripts/qa/lucem-audit.ts`, QA report/evidence exporter. Identidad/DB QA sólo a través de `.qa-private/runtime.env` y el lock existente. Mantener tanto el modo actual de audit como comparativa controlada de instrumentación; no deshabilitar el listener de eventos de consola en full.

Comandos: `npm test`, `npm run typecheck`, `npm run lint`, repetición de pruebas dirigidas (≥3 ejecuciones por escenario), `npm run qa:full`, chequeo de ZIP y revisión del diff/fast-forward. Los comandos ejecutados y exit codes deben quedar adjuntos a evidencia.

## Assumptions
- Se preserva `SPEC.md` porque ya contiene cambios locales ajenos; esta fase Planner usa `SPEC-QA-04.md` sin reemplazarlo.
- Se pueden usar los runners existentes sobre loopback QA y fixtures de propiedad QA, bajo su lock/cleanup. No reiniciar/provisionar recursos externos.
- Los 25 mensajes del run QA-03B son ocurrencias de consola observadas, no 25 defectos únicos. Los 19 históricos son la población anterior; comparar firmas y rutas sólo donde exista payload.
- Error de consola observado no se borra aunque test pase. Desaparición en una repetición aislada no demuestra resolución.
- Extensiones no configuradas en `playwright.qa.config.ts` no prueban que no haya modificación anterior al primer script; la atribución necesita evidencia del proceso/contexto y DOM temprano.
- Un `ERR_ABORTED` se clasifica como esperado únicamente con evidencia correlacionada de cancelación iniciada por navegación/acción y estado posterior correcto.
- Si no hay build existente o el estado QA no admite comparación sin reset, declarar ese subcriterio bloqueado; no generar/limpiar recursos fuera del contrato QA.

## Rubric de evaluación
1. **Matriz equivalente:** configuración, Chromium, rol/storage, fixtures, secuencia, viewports, workers y contexto documentados; probe y auditor difieren sólo en instrumentación declarada.
2. **Repetición estable:** cada escenario ejecutado al menos tres veces por variante y resultados completos conservados; no declarar resolución por una ejecución sin evento.
3. **Correlación de eventos:** cada warning/pageerror/requestfailed enlaza test, acción, ruta, viewport, timestamp y evidencia sanitizada; consola no se filtra.
4. **Delta de hidratación:** por ocurrencia se captura SSR/DOM antes/primer cliente/DOM después o se documenta campo `UNKNOWN`, con style exacto, selector accesible, route y componente stack donde estén disponibles.
5. **Causa atribuida:** cada grupo tiene APP/TEST_INSTRUMENTATION/ENVIRONMENT/EXPECTED_CANCELLATION/UNDETERMINED, confianza y evidencia pro/contra; no hay supresión genérica.
6. **Mecanismo común:** agrupaciones reportan IDs estables, cantidad, rutas y cada occurrenceId; grupos con firmas/causas distintas quedan separados.
7. **ERR_ABORTED evaluado:** método, URL redacted, resource type, initiator, nav flag, acción, outcome de navegación y estado UI correlacionados; sólo cancelaciones probadas se consideran esperadas.
8. **Regresión/corrección acotada:** si se confirma app defect, un test falla antes y pasa después; cambio de código comercial se limita al componente causal y no usa `suppressHydrationWarning`. Sin causa confirmada, app permanece sin cambio.
9. **Auditoría propia evaluada:** comparación controlada identifica si el observer/contexto/orden añade, duplica o pierde eventos; eventos crudos se conservan y event IDs son estables entre runs.
10. **No regresiones QA:** funcionales protegidas existentes y suites relacionadas pasan en tres repeticiones; no se alteran fixtures ajenos.
11. **Checks completos:** `npm test`, typecheck, lint, pruebas dirigidas y `qa:full` ejecutados, exit codes y discrepancias con baseline reportados.
12. **ZIP y evidencia segura:** ZIP actual válido, sanitizado, checksum registrado, sin cookies/tokens/storage state/secretos; reporte incluye matriz, findings, coverage y evidencia correlacionada.
13. **Evaluator y Git:** causas confirmadas/pending, before/after y resultado global documentados; sólo archivos QA-04 validados se publican por fast-forward en la rama solicitada, sin cambios ajenos, merge main ni force push.
