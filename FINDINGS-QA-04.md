# Findings — QA-04 pass 1

## Resumen

11/13 criterios pasan. La causa de los avisos de hidratación y de los dos patrones `ERR_ABORTED` quedó identificada, y el submit de login prehidratación se corrigió. El full audit `2026-11-13T22-19-59-613Z-3811832` terminó `FAIL` (108 Playwright PASS, 3 FAIL) por responsive de inventario, contraste axe y rendimiento de `/api/products`; son hallazgos fuera de QA-04 y no se modificaron esos módulos.

## Rubric QA-04

1. **PASS — Matriz equivalente:** Chromium 156, QA Playwright config, rol `ADMIN` con `admin-centro`, fixtures QA y recorrido/viewports del audit. Se comparó CDP pasivo, observer de página, probe de MutationObserver, development-fresh y build production.
2. **PASS — Repetición:** `/negocios/crear` con screenshot `caret: hide` dio 3/3 warnings CDP `style={{}}`; con `caret: initial` + readiness, 0/3. Catálogo/product-create con hide reprodujo `caret-color:"transparent"` (7/1/0 en tres runs por timing de compilación); `caret: initial` dio 0/3. Production visual de negocios: 0/3. No se toma una corrida aislada como prueba de resolución.
3. **PASS — Correlación:** CDP registra `testId`, title, `actionId`, route, viewport, timestamp, navegador, requestId, método, URL sin query, resource type, initiator/stack, `documentURL`, response status, screenshot, signature y occurrence IDs.
4. **PASS — DOM/SSR/delta:** reportes comparan HTML SSR, inputs del DOM en `DOMContentLoaded`, DOM luego de readiness y mutaciones. En las capturas estables no aparece atributo `style` en SSR ni en DOM temprano/final. El payload React durante screenshot trae el style transitorio. Campos de DOM inicial que no existen en los artefactos históricos se dejan `UNKNOWN`, no se infieren.
5. **PASS — Causa:** el código de Playwright `coreBundle.js` implementa `caret:'hide'` como `element.style.setProperty('caret-color','transparent','important')` y luego restaura el valor previo. Los timestamps de las advertencias caen dentro de `screenshotStartedAt..screenshotFinishedAt`; `style={{}}` aparece al restaurar valores inline vacíos. Los componentes/bundles de Lucem no proporcionan esos estilos. CDP-only reproduce; page listeners no son necesarios. Se clasifica `TEST_INSTRUMENTATION`, alta confianza. Playwright usa Chromium headless con `--disable-extensions`, perfil temporal y sin `--load-extension`; la extensión del Chrome de escritorio no participa.
6. **PASS — Agrupación:** eventos mantienen firmas deterministas, IDs por ocurrencia, recuento, rutas, viewports y referencias. Los 19 eventos históricos agrupan 15 `style={{}}` y 4 caret-color; ambas firmas se reprodujeron bajo el screenshot de caret oculto. Raw occurrences permanecen disponibles.
7. **PASS — `ERR_ABORTED`:** `/negocios/giro` sin borrador ejecuta su guard normal a `/negocios/crear`; el test de screenshot anterior navegaba a la siguiente vista antes de completar ese fetch. Ahora el visual test usa fixture de sesión y el guard aislado valida su ruta/heading. El login `GET /negocios` cancelado fue un fetch RSC de `router.push`/`router.refresh`: hubo GET hermano 200 y la UI acabó en `Elige tu negocio`; se clasifica `EXPECTED_CANCELLATION` y se retiene como `FALSE_POSITIVE`, no se filtra.
8. **PASS — Regresión/corrección:** antes del fix, `qa/reports/2026-11-13T20-41-21-729Z-3625864/hydration/login-redirect-cdp.json` demuestra botón habilitado antes de hydration y GET con query keys `email,password` usando valores sintéticos. Después, tres ejecuciones dev y una production mantienen submit deshabilitado mientras se retrasan scripts, URL sin credenciales y cero exposición. `LoginScreen` espera al efecto de hydration, usa `disabled={!hydrated || busy}` y `method="post"` como fallback; no se cambió la API de login.
9. **PASS — Auditoría del observador:** CDP-only sin listeners de página/instrumentación DOM comparado con screenshot hide/initial, MutationObserver y readiness. Full QA deja los handlers de consola activos, usa `caret: 'initial'` y readiness, y no reproduce hydration warnings.
10. **BLOCKED — No-regresiones/global:** `qa:full` sigue FAIL por tres fallos no relacionados con hydration/login: botones de acciones de `/inventario` fuera del viewport en mobile dentro de tabla ancha; dos contrastes axe serious 4.42:1 (`.dashboard-alert-count`, `.dashboard-reservation-count`); p95 de `/api/products` con fixture 10k ~19.4 s frente al umbral 1500 ms (los cuatro samples siguientes fueron ~0.44–0.56 s). Se preservan para sus módulos propietarios.
11. **PASS — Checks:** `npm test` 79/79; typecheck y lint PASS. E2E funcionales protegidos PASS; QA full se ejecutó y los tres resultados no aprobados permanecen explícitos.
12. **PASS — ZIP:** `qa/reports/lucem-audit-20261113-221630.zip`, SHA-256 `f39f386048ceb345d65fc8ad14eabc0a630df7f58c0bb18328c7a2f660bd8fc3`, 18,897,176 bytes; `unzip -t` PASS, 281 entradas, cero valores de secreto runtime, sin storageState ni traces.
13. **PENDING — Git:** falta commit QA-04 acotado y fast-forward a `feature/lucem-ui-redesign-v1`. Se preservan los cambios locales existentes.

## Abiertos

- [ ] F-QA04-10 · major · criterio #10 — Full QA sigue FAIL por responsive de inventario, contrastes axe y el p95 del API de productos; quedan fuera de este diagnóstico.
- [ ] F-QA04-13 · major · criterio #13 — Publicar sólo los commits QA-04 por fast-forward.

## Resueltos (verificados este pass)

- [x] F-QA04-HYDRATION — React `style={{}}`/caret-color atribuidos a la mutación temporal del screenshot Playwright durante hydration; capturas QA corregidas sin suprimir consola.
- [x] F-QA04-ABORT-GIRO — Redirect de onboarding validado y captura QA preparada con el estado de sesión requerido.
- [x] F-QA04-ABORT-LOGIN — Fetch RSC cancelado correlacionado con GET hermano exitoso y UI correcta; cancelación esperada.
- [x] F-QA04-LOGIN-QUERY — Exposición de credenciales por submit nativo prehidratación corregida y comprobada con regresión.
